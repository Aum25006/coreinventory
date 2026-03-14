const express = require('express');
const router = express.Router();
const DeliveryOrder = require('../models/DeliveryOrder');
const Product = require('../models/Product');
const PDFService = require('../services/pdfService');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, warehouse, startDate, endDate } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const deliveries = await DeliveryOrder.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await DeliveryOrder.countDocuments(query);

    res.json({
      deliveries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await DeliveryOrder.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, authorize('inventory_manager', 'admin'), async (req, res) => {
  try {
    const { customer, warehouse, items, expectedDeliveryDate, deliveryAddress, notes } = req.body;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
      if (product.quantity < item.quantityRequested) {
        return res.status(400).json({ 
          message: `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantityRequested}` 
        });
      }
    }

    const delivery = new DeliveryOrder({
      customer,
      warehouse,
      items,
      expectedDeliveryDate,
      deliveryAddress,
      notes,
      createdBy: req.user._id,
    });

    delivery.calculateTotal();
    const savedDelivery = await delivery.save();

    const populatedDelivery = await DeliveryOrder.findById(savedDelivery._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.status(201).json(populatedDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, authorize('inventory_manager', 'admin'), async (req, res) => {
  try {
    const delivery = await DeliveryOrder.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (delivery.status === 'Done') {
      return res.status(400).json({ message: 'Cannot edit completed delivery order' });
    }

    Object.assign(delivery, req.body);
    delivery.calculateTotal();
    
    const updatedDelivery = await delivery.save();

    const populatedDelivery = await DeliveryOrder.findById(updatedDelivery._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.json(populatedDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/status', auth, authorize('inventory_manager', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await DeliveryOrder.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (delivery.status === 'Done') {
      return res.status(400).json({ message: 'Cannot change status of completed delivery order' });
    }

    delivery.updateStatus(status, req.user._id);
    
    if (status === 'Done') {
      for (const item of delivery.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantityDelivered } }
        );
      }
    }

    await delivery.save();

    const populatedDelivery = await DeliveryOrder.findById(delivery._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.json(populatedDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const delivery = await DeliveryOrder.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (delivery.status === 'Done') {
      return res.status(400).json({ message: 'Cannot delete completed delivery order' });
    }

    await DeliveryOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Delivery order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const delivery = await DeliveryOrder.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    const pdfBuffer = await PDFService.generateDeliveryPDF(delivery);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="delivery-${delivery.orderNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
