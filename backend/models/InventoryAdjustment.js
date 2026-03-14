const mongoose = require('mongoose');

const adjustmentItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  currentQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  adjustedQuantity: {
    type: Number,
    required: true,
  },
  adjustmentType: {
    type: String,
    enum: ['Increase', 'Decrease'],
    required: true,
  },
  difference: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  remarks: String,
});

const inventoryAdjustmentSchema = new mongoose.Schema({
  adjustmentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  items: [adjustmentItemSchema],
  status: {
    type: String,
    enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
    default: 'Draft',
  },
  adjustmentDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: String,
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

inventoryAdjustmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (!this.adjustmentNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.adjustmentNumber = `ADJ-${year}${month}${day}-${random}`;
  }
  
  next();
});

inventoryAdjustmentSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  if (userId) {
    this.approvedBy = userId;
  }
  if (newStatus === 'Done') {
    this.adjustmentDate = new Date();
  }
};

module.exports = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);
