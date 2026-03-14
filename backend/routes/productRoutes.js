const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, warehouse, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (warehouse) query.warehouse = warehouse;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('warehouse', 'name code')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('warehouse');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    const populatedProduct = await savedProduct.populate('warehouse');
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('product:created', populatedProduct);
    io.emit('inventory:updated', { type: 'product_added', data: populatedProduct });
    
    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const populatedProduct = await product.populate('warehouse');
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('product:updated', populatedProduct);
    io.emit('inventory:updated', { type: 'product_updated', data: populatedProduct });
    
    res.json(populatedProduct);
  } catch (error) {
    console.error('Product update error:', error);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$quantity', '$minStockLevel'] }
    }).populate('warehouse', 'name code');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
