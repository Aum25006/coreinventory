const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  unitOfMeasure: {
    type: String,
    required: true,
    default: 'units',
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10,
  },
  maxStock: {
    type: Number,
    required: true,
    min: 0,
    default: 100,
  },
  averageDailyUsage: {
    type: Number,
    min: 0,
    default: 1,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  location: {
    type: String,
    trim: true,
  },
  supplier: {
    name: String,
    email: String,
    phone: String,
  },
  barcode: {
    type: String,
    trim: true,
  },
  qrCode: {
    type: String,
    trim: true,
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false,
    }
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true
});

productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
