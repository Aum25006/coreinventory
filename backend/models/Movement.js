const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  movementType: {
    type: String,
    required: true,
    enum: ['IN', 'OUT', 'TRANSFER'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    trim: true,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    default: 'COMPLETED',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

movementSchema.pre('save', function(next) {
  if (this.movementType === 'TRANSFER' && (!this.fromWarehouse || !this.toWarehouse)) {
    next(new Error('Transfer movements require both fromWarehouse and toWarehouse'));
  } else if ((this.movementType === 'IN' || this.movementType === 'OUT') && this.toWarehouse) {
    next(new Error('IN/OUT movements should not have toWarehouse'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Movement', movementSchema);
