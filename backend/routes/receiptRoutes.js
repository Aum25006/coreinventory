const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const PDFService = require('../services/pdfService');
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

    const receipts = await Receipt.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Receipt.countDocuments(query);

    res.json({
      receipts,
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
    const receipt = await Receipt.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { supplier, warehouse, items, expectedDate, notes, receiptNumber, receiptDate } = req.body;

    const receipt = new Receipt({
      receiptNumber: receiptNumber || `RC-${Date.now()}`,
      supplier,
      warehouse,
      items,
      expectedDate,
      receiptDate: receiptDate || new Date(),
      notes,
      createdBy: req.user._id,
    });

    receipt.calculateTotal();
    const savedReceipt = await receipt.save();

    const populatedReceipt = await Receipt.findById(savedReceipt._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('receipt:created', populatedReceipt);
    io.emit('inventory:updated', { type: 'receipt_created', data: populatedReceipt });

    res.status(201).json(populatedReceipt);
  } catch (error) {
    console.error('Receipt creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'Done') {
      return res.status(400).json({ message: 'Cannot edit completed receipt' });
    }

    Object.assign(receipt, req.body);
    receipt.calculateTotal();
    
    const updatedReceipt = await receipt.save();

    const populatedReceipt = await Receipt.findById(updatedReceipt._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.json(populatedReceipt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const receipt = await Receipt.findById(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'Done') {
      return res.status(400).json({ message: 'Cannot change status of completed receipt' });
    }

    receipt.updateStatus(status, req.user._id);
    
    if (status === 'Done') {
      for (const item of receipt.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: item.quantityReceived } }
        );
      }
    }

    await receipt.save();

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    res.json(populatedReceipt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'Done') {
      return res.status(400).json({ message: 'Cannot delete completed receipt' });
    }

    await Receipt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const pdfBuffer = await PDFService.generateReceiptPDF(receipt);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
