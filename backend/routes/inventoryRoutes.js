const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Movement = require('../models/Movement');
const Receipt = require('../models/Receipt');
const DeliveryOrder = require('../models/DeliveryOrder');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const { auth } = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => {
  try {
    const { documentType, status, warehouse, productCategory, startDate, endDate } = req.query;
    
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalWarehouses = await Warehouse.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      isActive: true
    });
    const outOfStockProducts = await Product.countDocuments({
      quantity: 0,
      isActive: true
    });

    const receiptQuery = {};
    const deliveryQuery = {};
    const adjustmentQuery = {};
    
    if (status) {
      receiptQuery.status = status;
      deliveryQuery.status = status;
      adjustmentQuery.status = status;
    }
    if (warehouse) {
      receiptQuery.warehouse = warehouse;
      deliveryQuery.warehouse = warehouse;
      adjustmentQuery.warehouse = warehouse;
    }
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      receiptQuery.createdAt = dateFilter;
      deliveryQuery.createdAt = dateFilter;
      adjustmentQuery.createdAt = dateFilter;
    }

    const pendingReceipts = await Receipt.countDocuments({ ...receiptQuery, status: 'Waiting' });
    const pendingDeliveries = await DeliveryOrder.countDocuments({ ...deliveryQuery, status: 'Waiting' });
    const scheduledTransfers = await Movement.countDocuments({
      movementType: 'TRANSFER',
      status: 'PENDING',
      ...(warehouse && { $or: [{ fromWarehouse: warehouse }, { toWarehouse: warehouse }] })
    });

    const warehouseInventory = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$warehouse',
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$minStockLevel'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouseInfo'
        }
      },
      { $unwind: '$warehouseInfo' }
    ]);

    const recentMovements = await Movement.find({
      ...(startDate || endDate) && {
        createdAt: {}
      },
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    })
      .populate('product', 'name sku')
      .populate('fromWarehouse', 'name code')
      .populate('toWarehouse', 'name code')
      .limit(10)
      .sort({ createdAt: -1 });

    const recentReceipts = await Receipt.find(receiptQuery)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name')
      .limit(5)
      .sort({ createdAt: -1 });

    const recentDeliveries = await DeliveryOrder.find(deliveryQuery)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name')
      .limit(5)
      .sort({ createdAt: -1 });

    const recentAdjustments = await InventoryAdjustment.find(adjustmentQuery)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name')
      .limit(5)
      .sort({ createdAt: -1 });

    res.json({
      kpis: {
        totalProducts,
        totalWarehouses,
        lowStockProducts,
        outOfStockProducts,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      },
      warehouseInventory,
      recentMovements,
      recentReceipts,
      recentDeliveries,
      recentAdjustments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/movement', async (req, res) => {
  try {
    const { productId, movementType, quantity, fromWarehouse, toWarehouse, reason, performedBy } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (movementType === 'OUT' && product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const movement = new Movement({
      product: productId,
      movementType,
      quantity,
      fromWarehouse,
      toWarehouse,
      reason,
      performedBy,
    });

    await movement.save();

    if (movementType === 'IN') {
      product.quantity += quantity;
      if (toWarehouse) {
        product.warehouse = toWarehouse;
      }
    } else if (movementType === 'OUT') {
      product.quantity -= quantity;
    } else if (movementType === 'TRANSFER') {
      product.quantity -= quantity;
    }

    await product.save();

    if (movementType === 'TRANSFER') {
      const targetProduct = await Product.findOne({
        sku: product.sku,
        warehouse: toWarehouse
      });

      if (targetProduct) {
        targetProduct.quantity += quantity;
        await targetProduct.save();
      } else {
        const newProduct = new Product({
          ...product.toObject(),
          _id: undefined,
          warehouse: toWarehouse,
          quantity: quantity,
        });
        await newProduct.save();
      }
    }

    const populatedMovement = await Movement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('fromWarehouse', 'name code')
      .populate('toWarehouse', 'name code');

    res.status(201).json(populatedMovement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/movements', async (req, res) => {
  try {
    const { page = 1, limit = 10, productId, warehouse, movementType } = req.query;
    
    // Get all movements from different sources
    const movements = [];
    
    // Get receipts (incoming movements)
    const receiptQuery = {};
    if (productId) receiptQuery['items.product'] = productId;
    if (warehouse) receiptQuery.warehouse = warehouse;
    
    const receipts = await Receipt.find(receiptQuery)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    // Get deliveries (outgoing movements)
    const deliveryQuery = {};
    if (productId) deliveryQuery['items.product'] = productId;
    if (warehouse) deliveryQuery.warehouse = warehouse;
    
    const deliveries = await DeliveryOrder.find(deliveryQuery)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    // Get inventory adjustments
    const adjustmentQuery = {};
    if (productId) adjustmentQuery['items.product'] = productId;
    if (warehouse) adjustmentQuery.warehouse = warehouse;
    
    const adjustments = await InventoryAdjustment.find(adjustmentQuery)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    // Combine all movements
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        movements.push({
          _id: receipt._id,
          type: 'receipt',
          movementType: 'incoming',
          documentNumber: receipt.receiptNumber,
          product: item.product,
          quantity: item.quantityReceived,
          warehouse: receipt.warehouse,
          fromWarehouse: null,
          toWarehouse: receipt.warehouse,
          createdAt: receipt.createdAt,
          status: receipt.status,
          createdBy: receipt.createdBy,
          notes: receipt.notes
        });
      });
    });
    
    deliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        movements.push({
          _id: delivery._id,
          type: 'delivery',
          movementType: 'outgoing',
          documentNumber: delivery.orderNumber,
          product: item.product,
          quantity: item.quantityDelivered,
          warehouse: delivery.warehouse,
          fromWarehouse: delivery.warehouse,
          toWarehouse: null,
          createdAt: delivery.createdAt,
          status: delivery.status,
          createdBy: delivery.createdBy,
          notes: delivery.notes
        });
      });
    });
    
    adjustments.forEach(adjustment => {
      adjustment.items.forEach(item => {
        movements.push({
          _id: adjustment._id,
          type: 'adjustment',
          movementType: item.adjustmentType,
          documentNumber: adjustment.adjustmentNumber,
          product: item.product,
          quantity: item.quantity,
          warehouse: adjustment.warehouse,
          fromWarehouse: item.adjustmentType === 'transfer_out' ? adjustment.warehouse : null,
          toWarehouse: item.adjustmentType === 'transfer_in' ? adjustment.warehouse : null,
          createdAt: adjustment.createdAt,
          status: adjustment.status,
          createdBy: adjustment.createdBy,
          notes: adjustment.reason
        });
      });
    });
    
    // Sort by date
    movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Filter by movementType if specified
    const filteredMovements = movementType 
      ? movements.filter(m => m.movementType === movementType)
      : movements;
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

    res.json({
      movements: paginatedMovements,
      totalPages: Math.ceil(filteredMovements.length / limit),
      currentPage: page,
      total: filteredMovements.length,
    });
  } catch (error) {
    console.error('Movements error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true })
      .sort({ name: 1 });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/warehouses', async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    const savedWarehouse = await warehouse.save();
    res.status(201).json(savedWarehouse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
