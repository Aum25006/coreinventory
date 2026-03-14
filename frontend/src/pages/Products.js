import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Edit, Delete, Add, Search, TrendingUp, BarChart, PieChart } from '@mui/icons-material';
import socketService from '../services/socketService';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    quantity: '',
    warehouse: '',
    minStockLevel: '',
    maxStockLevel: '',
    unitOfMeasure: 'units',
    location: '',
    supplierName: '',
    supplierEmail: '',
    supplierPhone: '',
    tags: '',
    notes: '',
    image: null,
    imagePreview: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    warehouse: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchCategories();
    
    // Connect to socket for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      
      // Listen for real-time updates
      socketService.on('product:created', (data) => {
        console.log('Product created:', data);
        fetchProducts();
      });
      
      socketService.on('product:updated', (data) => {
        console.log('Product updated:', data);
        fetchProducts();
      });
    }
    
    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [pagination.page, filters]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 100, // Increased from 10 to 100 to show all products
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.warehouse && { warehouse: filters.warehouse })
      });

      console.log('Fetching products with params:', params.toString());
      const response = await fetch(`http://localhost:5000/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      console.log('Products fetched:', data.products?.length || 0);
      console.log('Search term was:', filters.search);
      
      setProducts(data.products);
      setPagination(prev => ({
        ...prev,
        totalPages: data.totalPages,
        total: data.total
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
      console.log('Products - Warehouses loaded:', data);
    } catch (err) {
      console.error('Products warehouse fetch error:', err.message);
      // Don't set error for warehouse fetch, just log it
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        category: product.category,
        price: product.unitPrice || 0,
        quantity: product.currentStock || 0,
        warehouse: product.warehouse?._id || product.warehouse,
        minStockLevel: product.reorderLevel || 10,
        maxStock: product.maxStock || 100,
        unitOfMeasure: product.unitOfMeasure || 'units',
        location: product.location || '',
        supplierName: product.supplier?.name || '',
        supplierEmail: product.supplier?.email || '',
        supplierPhone: product.supplier?.phone || '',
        tags: product.tags ? product.tags.join(', ') : '',
        notes: product.notes || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: '',
        price: '',
        quantity: '',
        warehouse: '',
        minStockLevel: '',
        maxStockLevel: '',
        unitOfMeasure: 'units',
        location: '',
        supplierName: '',
        supplierEmail: '',
        supplierPhone: '',
        tags: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Basic validation
      if (!formData.name || !formData.sku || !formData.category || !formData.warehouse) {
        setError('Please fill in all required fields');
        return;
      }

      const url = editingProduct 
        ? `http://localhost:5000/api/products/${editingProduct._id}`
        : 'http://localhost:5000/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      // Map form data to backend model fields
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || '',
        category: formData.category,
        unitPrice: parseFloat(formData.price) || 0,
        currentStock: parseInt(formData.quantity) || 0,
        reorderLevel: parseInt(formData.minStockLevel) || 10,
        maxStock: parseInt(formData.maxStockLevel) || 100,
        warehouse: formData.warehouse,
        unitOfMeasure: formData.unitOfMeasure || 'units',
        location: formData.location || '',
        supplier: formData.supplierName ? {
          name: formData.supplierName || '',
          email: formData.supplierEmail || '',
          phone: formData.supplierPhone || ''
        } : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        notes: formData.notes || ''
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save product');
      }

      handleCloseDialog();
      fetchProducts();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete product');
        fetchProducts();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
    // Trigger fetchProducts immediately for now (we can add debounce later if needed)
    fetchProducts();
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
    // Trigger fetchProducts immediately
    fetchProducts();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: ''
    }));
  };

  const getStockStatus = (quantity, minLevel) => {
    if (quantity === 0) return { color: 'error', label: 'Out of Stock' };
    if (quantity <= minLevel) return { color: 'error', label: 'Low Stock' };
    if (quantity <= minLevel * 2) return { color: 'warning', label: 'Medium' };
    return { color: 'success', label: 'Good' };
  };

  if (loading && products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Product
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {/* Charts Section */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart />
                Stock Levels by Product
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={products.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="currentStock" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChart />
                Products by Category
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={categories.map(cat => ({
                      name: cat,
                      value: products.filter(p => p.category === cat).length
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search by name or SKU"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Enter product name or SKU..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Warehouse</InputLabel>
              <Select
                value={filters.warehouse}
                onChange={(e) => handleFilterChange('warehouse', e.target.value)}
              >
                <MenuItem value="">All Warehouses</MenuItem>
                {warehouses.map((wh) => (
                  <MenuItem key={wh._id} value={wh._id}>
                    {wh.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
          <TableRow>
            <TableCell>Image</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Category</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell>Warehouse</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => {
            const stockStatus = getStockStatus(product.currentStock, product.reorderLevel);
            return (
              <TableRow key={product._id}>
                <TableCell>
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="caption">No Image</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell align="right">${(product.unitPrice || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{product.currentStock}</TableCell>
                <TableCell>{product.warehouse?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Chip
                    label={stockStatus.label}
                    color={stockStatus.color}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenDialog(product)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(product._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </TableContainer>

      {/* Only show pagination if there are more than 100 products */}
      {pagination.total > 100 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(e, value) => setPagination(prev => ({ ...prev, page: value }))}
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Product Image
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  {formData.imagePreview ? (
                    <Box position="relative">
                      <img
                        src={formData.imagePreview}
                        alt="Product preview"
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleRemoveImage}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        border: '2px dashed #ccc',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#999' }
                      }}
                      onClick={() => document.getElementById('product-image-input').click()}
                    >
                      <Typography color="text.secondary">Add Image</Typography>
                    </Box>
                  )}
                  <input
                    id="product-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <MenuItem value="Electronics">Electronics</MenuItem>
                    <MenuItem value="Clothing">Clothing</MenuItem>
                    <MenuItem value="Food">Food</MenuItem>
                    <MenuItem value="Furniture">Furniture</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Min Stock Level"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: e.target.value }))}
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={formData.warehouse}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                  >
                    {warehouses.map((wh) => (
                      <MenuItem key={wh._id} value={wh._id}>
                        {wh.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Products;
