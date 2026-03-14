const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const DeliveryOrder = require('../models/DeliveryOrder');
const Receipt = require('../models/Receipt');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Warehouse = require('../models/Warehouse');
const { ObjectId } = require('mongoose').Types;

// Get comprehensive dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    console.log('Fetching dashboard analytics...');
    // Top selling products (based on delivery quantities)
    const topSellingProducts = await DeliveryOrder.aggregate([
      { $unwind: '$items' },
      { $match: { status: 'Done' } },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantityDelivered' },
          totalRevenue: { $sum: '$items.totalPrice' },
          deliveryCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          category: '$product.category',
          totalQuantity: 1,
          totalRevenue: 1,
          deliveryCount: 1
        }
      }
    ]);

    // Warehouse stock distribution
    const warehouseDistribution = await Warehouse.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'warehouse',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          productCount: { $size: '$products' },
          totalStock: { $sum: '$products.currentStock' },
          totalValue: { $sum: { $multiply: ['$products.currentStock', '$products.unitPrice'] } }
        }
      },
      { $sort: { totalStock: -1 } }
    ]);

    // Stock movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stockMovements = await Promise.all([
      // Receipts (incoming)
      Receipt.aggregate([
        { $match: { receiptDate: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$receiptDate' } },
            incoming: { $sum: '$items.quantityReceived' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Deliveries (outgoing)
      DeliveryOrder.aggregate([
        { $match: { deliveryDate: { $gte: thirtyDaysAgo } } } ,
        { $unwind: '$items' },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveryDate' } },
            outgoing: { $sum: '$items.quantityDelivered' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Combine movements
    const combinedMovements = {};
    [...stockMovements[0], ...stockMovements[1]].forEach(movement => {
      if (!combinedMovements[movement._id]) {
        combinedMovements[movement._id] = { date: movement._id, incoming: 0, outgoing: 0 };
      }
      if (movement.incoming) combinedMovements[movement._id].incoming = movement.incoming;
      if (movement.outgoing) combinedMovements[movement._id].outgoing = movement.outgoing;
    });

    const movementsArray = Object.values(combinedMovements).sort((a, b) => a.date.localeCompare(b.date));

    // Low stock items with prediction
    const lowStockItems = await Product.find({
      $or: [
        { currentStock: 0 }, // Out of stock
        { $expr: { $lte: ['$currentStock', '$reorderLevel'] } }, // Low stock
        { $expr: { $lte: ['$currentStock', { $multiply: ['$reorderLevel', 2] }] } } // Medium stock
      ]
    })
    .populate('warehouse', 'name code')
    .sort({ currentStock: 1 })
    .limit(10);

    // Add smart prediction
    const lowStockWithPrediction = lowStockItems.map(item => {
      const avgDailyUsage = item.averageDailyUsage || 1; // Default to 1 if not available
      const daysUntilStockout = item.currentStock === 0 ? 0 : Math.floor(item.currentStock / avgDailyUsage);
      const stockStatus = item.currentStock === 0 ? 'Out of Stock' : 
                         item.currentStock <= item.reorderLevel ? 'Low Stock' : 'Medium';
      const urgency = item.currentStock === 0 ? 'critical' : 
                     daysUntilStockout <= 3 ? 'critical' : daysUntilStockout <= 7 ? 'high' : 'medium';
      
      return {
        name: item.name,
        sku: item.sku,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        stockStatus: stockStatus,
        daysUntilStockout: daysUntilStockout,
        urgency: urgency,
        warehouse: item.warehouse
      };
    });

    // Inventory usage by category
    const inventoryUsage = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      topSellingProducts,
      warehouseDistribution,
      stockMovements: movementsArray,
      lowStockItems: lowStockWithPrediction,
      inventoryUsage
    });
    
    console.log('Analytics data sent:', {
      topSellingProducts: topSellingProducts.length,
      warehouseDistribution: warehouseDistribution.length,
      stockMovements: movementsArray.length,
      lowStockItems: lowStockWithPrediction.length,
      inventoryUsage: inventoryUsage.length
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get real-time stock updates
router.get('/realtime-stock', async (req, res) => {
  try {
    const { warehouseId, categoryId } = req.query;
    
    const matchStage = {};
    if (warehouseId) matchStage.warehouse = new ObjectId(warehouseId);
    if (categoryId) matchStage.category = categoryId;

    const stockData = await Product.find(matchStage)
      .populate('warehouse', 'name code')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(stockData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get inventory predictions
router.get('/predictions', async (req, res) => {
  try {
    const products = await Product.find({
      currentStock: { $lt: '$reorderLevel' * 2 } // Less than 2x reorder level
    }).populate('warehouse', 'name code');

    const predictions = products.map(product => {
      // Calculate usage rate based on recent deliveries
      const usageRate = product.averageDailyUsage || 1;
      const currentStock = product.currentStock;
      const reorderLevel = product.reorderLevel;
      
      // Predict when to reorder
      const daysUntilReorder = Math.floor((currentStock - reorderLevel) / usageRate);
      const recommendedOrderQuantity = Math.ceil(usageRate * 30); // 30 days supply
      
      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        warehouse: product.warehouse,
        currentStock,
        reorderLevel,
        daysUntilReorder,
        recommendedOrderQuantity,
        urgency: daysUntilReorder <= 0 ? 'immediate' : daysUntilReorder <= 7 ? 'urgent' : 'normal'
      };
    });

    res.json(predictions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
