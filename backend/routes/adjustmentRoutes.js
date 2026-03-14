const express = require('express');
const router = express.Router();
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Product = require('../models/Product');
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

    const adjustments = await InventoryAdjustment.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await InventoryAdjustment.countDocuments(query);

    res.json({
      adjustments,
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
    const adjustment = await InventoryAdjustment.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');
    
    if (!adjustment) {
      return res.status(404).json({ message: 'Inventory adjustment not found' });
    }
    
    res.json(adjustment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, authorize('inventory_manager', 'admin'), async (req, res) => {
  try {
    const { warehouse, items, notes } = req.body;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
      
      item.currentQuantity = product.quantity;
      item.adjustedQuantity = item.currentQuantity + item.difference;
      item.adjustmentType = item.difference >= 0 ? 'Increase' : 'Decrease';
      item.difference = Math.abs(item.difference);
    }

    const adjustment = new InventoryAdjustment({
      warehouse,
      items,
      notes,
      createdBy: req.user._id,
    });

    const savedAdjustment = await adjustment.save();

    const populatedAdjustment = await InventoryAdjustment.findById(savedAdjustment._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.status(201).json(populatedAdjustment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/status', auth, authorize('inventory_manager', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const adjustment = await InventoryAdjustment.findById(req.params.id);
    
    if (!adjustment) {
      return res.status(404).json({ message: 'Inventory adjustment not found' });
    }

    if (adjustment.status === 'Done') {
      return res.status(400).json({ message: 'Cannot change status of completed adjustment' });
    }

    adjustment.updateStatus(status, req.user._id);
    
    if (status === 'Done') {
      for (const item of adjustment.items) {
        const quantityChange = item.adjustmentType === 'Increase' ? item.difference : -item.difference;
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: quantityChange } }
        );
      }
    }

    await adjustment.save();

    const populatedAdjustment = await InventoryAdjustment.findById(adjustment._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.json(populatedAdjustment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const adjustment = await InventoryAdjustment.findById(req.params.id);
    
    if (!adjustment) {
      return res.status(404).json({ message: 'Inventory adjustment not found' });
    }

    if (adjustment.status === 'Done') {
      return res.status(400).json({ message: 'Cannot delete completed adjustment' });
    }

    await InventoryAdjustment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory adjustment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
