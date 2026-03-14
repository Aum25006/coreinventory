const mongoose = require('mongoose');

const rackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  aisle: {
    type: String,
    trim: true,
  },
  level: {
    type: Number,
    min: 1,
    default: 1,
  },
  position: {
    type: String,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 0,
  },
  currentLoad: {
    type: Number,
    min: 0,
    default: 0,
  },
  zone: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['shelf', 'pallet', 'bin', 'bulk', 'special'],
    default: 'shelf',
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'cm',
    },
  },
  weightCapacity: {
    type: Number,
    min: 0,
  },
  currentWeight: {
    type: Number,
    min: 0,
    default: 0,
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantity: Number,
    location: String,
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
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

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['main', 'branch', 'distribution', 'retail', 'special'],
    default: 'main',
  },
  location: {
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: 'USA',
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  capacity: {
    type: Number,
    required: true,
    min: 0,
  },
  manager: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  racks: [rackSchema],
  zones: [{
    name: String,
    code: String,
    type: {
      type: String,
      enum: ['receiving', 'storage', 'picking', 'packing', 'shipping', 'office', 'other'],
    },
    description: String,
  }],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  facilities: [{
    type: {
      type: String,
      enum: ['loading_dock', 'cold_storage', 'security', 'office', 'restroom', 'parking', 'other'],
    },
    count: Number,
    description: String,
  }],
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

warehouseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
