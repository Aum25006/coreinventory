const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantityOrdered: {
    type: Number,
    required: true,
    min: 1,
  },
  quantityReceived: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  batchNumber: String,
  expiryDate: Date,
  remarks: String,
});

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
  },
  supplier: {
    name: {
      type: String,
      required: true,
    },
    email: String,
    phone: String,
    address: String,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  items: [receiptItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
    default: 'Draft',
  },
  expectedDate: Date,
  receivedDate: Date,
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

receiptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (!this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.receiptNumber = `REC-${year}${month}${day}-${random}`;
  }
  
  next();
});

receiptSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  if (userId) {
    this.approvedBy = userId;
  }
  if (newStatus === 'Done') {
    this.receivedDate = new Date();
  }
};

receiptSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
};

module.exports = mongoose.model('Receipt', receiptSchema);
