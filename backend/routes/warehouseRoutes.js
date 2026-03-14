const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all warehouses
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single warehouse with racks
router.get('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('racks.products.product', 'name sku');
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new warehouse
router.post('/', async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update warehouse
router.put('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    res.json(warehouse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete warehouse
router.delete('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add rack to warehouse
router.post('/:id/racks', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    const newRack = req.body;
    warehouse.racks.push(newRack);
    await warehouse.save();
    
    res.status(201).json(warehouse.racks[warehouse.racks.length - 1]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update rack in warehouse
router.put('/:id/racks/:rackId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    const rack = warehouse.racks.id(req.params.rackId);
    if (!rack) {
      return res.status(404).json({ message: 'Rack not found' });
    }
    
    Object.assign(rack, req.body);
    await warehouse.save();
    
    res.json(rack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete rack from warehouse
router.delete('/:id/racks/:rackId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    warehouse.racks.pull(req.params.rackId);
    await warehouse.save();
    
    res.json({ message: 'Rack deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Move product to rack
router.post('/:id/racks/:rackId/products', async (req, res) => {
  try {
    const { productId, quantity, location } = req.body;
    
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    const rack = warehouse.racks.id(req.params.rackId);
    if (!rack) {
      return res.status(404).json({ message: 'Rack not found' });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product already exists in rack
    const existingProduct = rack.products.find(p => p.product.toString() === productId);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      rack.products.push({
        product: productId,
        quantity,
        location: location || `${rack.aisle}-${rack.level}-${rack.position}`
      });
    }
    
    // Update rack current load
    rack.currentLoad += quantity;
    
    await warehouse.save();
    
    res.json({ message: 'Product moved to rack successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get warehouse statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    const stats = {
      totalRacks: warehouse.racks.length,
      activeRacks: warehouse.racks.filter(r => r.isActive).length,
      totalCapacity: warehouse.racks.reduce((sum, rack) => sum + rack.capacity, 0),
      currentLoad: warehouse.racks.reduce((sum, rack) => sum + rack.currentLoad, 0),
      utilizationPercentage: warehouse.racks.length > 0 
        ? Math.round((warehouse.racks.reduce((sum, rack) => sum + rack.currentLoad, 0) / 
                     warehouse.racks.reduce((sum, rack) => sum + rack.capacity, 0)) * 100)
        : 0,
      zones: warehouse.zones.length,
      productsInRacks: warehouse.racks.reduce((sum, rack) => sum + rack.products.length, 0)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
