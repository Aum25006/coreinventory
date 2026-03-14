import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Card,
  CardContent,
} from '@mui/material';
import { Edit, Delete, Add, CheckCircle, LocalShipping, PictureAsPdf } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [formData, setFormData] = useState({
    customer: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    warehouse: '',
    items: [],
    expectedDeliveryDate: '',
    deliveryAddress: '',
    notes: '',
  });
  const [filters, setFilters] = useState({
    status: '',
    warehouse: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchDeliveries();
    fetchWarehouses();
    fetchProducts();
  }, [pagination.page, filters]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.warehouse && { warehouse: filters.warehouse }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`http://localhost:5000/api/deliveries?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch deliveries');

      const data = await response.json();
      setDeliveries(data.deliveries);
      setPagination(prev => ({
        ...prev,
        totalPages: data.totalPages,
        total: data.total,
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
      const response = await fetch('http://localhost:5000/api/inventory/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenDialog = (delivery = null) => {
    if (delivery) {
      setEditingDelivery(delivery);
      setFormData({
        customer: delivery.customer,
        warehouse: delivery.warehouse._id,
        items: delivery.items,
        expectedDeliveryDate: delivery.expectedDeliveryDate?.split('T')[0] || '',
        deliveryAddress: delivery.deliveryAddress || '',
        notes: delivery.notes || '',
      });
    } else {
      setEditingDelivery(null);
      setFormData({
        customer: {
          name: '',
          email: '',
          phone: '',
          address: '',
        },
        warehouse: '',
        items: [],
        expectedDeliveryDate: '',
        deliveryAddress: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDelivery(null);
  };

  const handleCustomerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value,
      },
    }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          quantityRequested: 1,
          quantityDelivered: 1,
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantityRequested' || field === 'quantityDelivered' || field === 'unitPrice') {
      const quantity = field === 'unitPrice' ? newItems[index].quantityDelivered : value;
      const price = field === 'unitPrice' ? value : newItems[index].unitPrice;
      newItems[index].totalPrice = quantity * price;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingDelivery 
        ? `http://localhost:5000/api/deliveries/${editingDelivery._id}`
        : 'http://localhost:5000/api/deliveries';
      
      const method = editingDelivery ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save delivery order');

      handleCloseDialog();
      fetchDeliveries();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (deliveryId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchDeliveries();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (deliveryId) => {
    if (window.confirm('Are you sure you want to delete this delivery order?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/deliveries/${deliveryId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to delete delivery order');
        fetchDeliveries();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDownloadPDF = async (id, orderNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/deliveries/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return 'success';
      case 'Waiting': return 'warning';
      case 'Draft': return 'info';
      case 'Canceled': return 'error';
      default: return 'default';
    }
  };

  if (loading && deliveries.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Delivery Orders (Outgoing Stock)</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={!['inventory_manager', 'admin'].includes(user?.role)}
        >
          Create Delivery Order
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Waiting">Waiting</MenuItem>
                <MenuItem value="Ready">Ready</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
                <MenuItem value="Canceled">Canceled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select
                value={filters.warehouse}
                onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value }))}
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
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              size="small"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              size="small"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery._id}>
                <TableCell>{delivery.orderNumber}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {delivery.customer.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {delivery.customer.email}
                  </Typography>
                </TableCell>
                <TableCell>{delivery.warehouse?.name}</TableCell>
                <TableCell>${delivery.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={delivery.status}
                    color={getStatusColor(delivery.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {delivery.expectedDeliveryDate 
                    ? new Date(delivery.expectedDeliveryDate).toLocaleDateString() 
                    : '-'}
                </TableCell>
                <TableCell>{delivery.createdBy?.name}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleDownloadPDF(delivery._id, delivery.orderNumber)}>
                    <PictureAsPdf />
                  </IconButton>
                  {delivery.status !== 'Done' && ['inventory_manager', 'admin'].includes(user?.role) && (
                    <>
                      <IconButton onClick={() => handleOpenDialog(delivery)}>
                        <Edit />
                      </IconButton>
                      {delivery.status === 'Waiting' && (
                        <IconButton onClick={() => handleStatusChange(delivery._id, 'Done')}>
                          <LocalShipping />
                        </IconButton>
                      )}
                      <IconButton onClick={() => handleDelete(delivery._id)}>
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={(e, value) => setPagination(prev => ({ ...prev, page: value }))}
        />
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingDelivery ? 'Edit Delivery Order' : 'Create New Delivery Order'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Customer Information
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={formData.customer.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.customer.email}
                  onChange={(e) => handleCustomerChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.customer.address}
                  onChange={(e) => handleCustomerChange('address', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expected Delivery Date"
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Delivery Address"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Items</Typography>
                  <Button onClick={handleAddItem} startIcon={<Add />} variant="outlined">
                    Add Item
                  </Button>
                </Box>
              </Grid>

              {formData.items.map((item, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ p: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth required>
                            <InputLabel>Product</InputLabel>
                            <Select
                              value={item.product}
                              onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                            >
                              {products.map((product) => (
                                <MenuItem key={product._id} value={product._id}>
                                  {product.name} ({product.sku}) - Stock: {product.quantity}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Qty Requested"
                            type="number"
                            value={item.quantityRequested}
                            onChange={(e) => handleItemChange(index, 'quantityRequested', parseInt(e.target.value))}
                            required
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Qty Delivered"
                            type="number"
                            value={item.quantityDelivered}
                            onChange={(e) => handleItemChange(index, 'quantityDelivered', parseInt(e.target.value))}
                            required
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Unit Price"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Total Price"
                            value={item.totalPrice.toFixed(2)}
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <IconButton onClick={() => handleRemoveItem(index)} color="error">
                            <Delete />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingDelivery ? 'Update' : 'Create'} Delivery Order
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Deliveries;
