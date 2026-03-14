const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantityRequested: {
    type: Number,
    required: true,
    min: 1,
  },
  quantityDelivered: {
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
  remarks: String,
});

const deliveryOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
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
  items: [deliveryItemSchema],
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
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveryAddress: String,
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

deliveryOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `DEL-${year}${month}${day}-${random}`;
  }
  
  next();
});

deliveryOrderSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  if (userId) {
    this.approvedBy = userId;
  }
  if (newStatus === 'Done') {
    this.actualDeliveryDate = new Date();
  }
};

deliveryOrderSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
};

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
