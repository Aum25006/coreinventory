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
import { Add, Edit, Delete, Download, Remove, PictureAsPdf, CheckCircle } from '@mui/icons-material';

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [formData, setFormData] = useState({
    supplier: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    warehouse: '',
    items: [],
    expectedDate: '',
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

  useEffect(() => {
    fetchReceipts();
    fetchWarehouses();
    fetchProducts();
  }, [pagination.page, filters]);

  const fetchReceipts = async () => {
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

      const response = await fetch(`http://localhost:5000/api/receipts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch receipts');

      const data = await response.json();
      setReceipts(data.receipts);
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
      const response = await fetch('http://localhost:5000/api/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
      console.log('Receipts - Warehouses loaded:', data);
    } catch (err) {
      console.error('Receipts warehouse fetch error:', err.message);
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

  const handleOpenDialog = (receipt = null) => {
    if (receipt) {
      setEditingReceipt(receipt);
      setFormData({
        supplier: receipt.supplier,
        warehouse: receipt.warehouse._id,
        items: receipt.items,
        expectedDate: receipt.expectedDate?.split('T')[0] || '',
        notes: receipt.notes || '',
      });
    } else {
      setEditingReceipt(null);
      setFormData({
        supplier: {
          name: '',
          email: '',
          phone: '',
          address: '',
        },
        warehouse: '',
        items: [],
        expectedDate: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReceipt(null);
  };

  const handleSupplierChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      supplier: {
        ...prev.supplier,
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
          quantityOrdered: 1,
          quantityReceived: 1,
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantityOrdered' || field === 'quantityReceived' || field === 'unitPrice') {
      const quantity = field === 'unitPrice' ? (newItems[index].quantityReceived || 0) : (value || 0);
      const price = field === 'unitPrice' ? (value || 0) : (newItems[index].unitPrice || 0);
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
      
      // Validation
      if (!formData.supplier.name || !formData.warehouse || formData.items.length === 0) {
        setError('Please fill in supplier name, select warehouse, and add at least one item');
        return;
      }
      
      // Validate items
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.product || !item.quantityOrdered || !item.quantityReceived || !item.unitPrice) {
          setError(`Please fill in all required fields for item ${i + 1}`);
          return;
        }
      }
      
      // Add receipt number if creating new receipt
      const receiptData = {
        ...formData,
        receiptNumber: editingReceipt ? formData.receiptNumber : `RC-${Date.now()}`,
        receiptDate: new Date().toISOString().split('T')[0], // Add receipt date
      };
      
      const url = editingReceipt 
        ? `http://localhost:5000/api/receipts/${editingReceipt._id}`
        : 'http://localhost:5000/api/receipts';
      
      const method = editingReceipt ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(receiptData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save receipt');
      }

      handleCloseDialog();
      fetchReceipts();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (receiptId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/receipts/${receiptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchReceipts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/receipts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to delete receipt');
        
        fetchReceipts();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDownloadPDF = async (id, receiptNumber) => {
    try {
      const response = await fetch(`http://localhost:5000/api/receipts/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber}.pdf`;
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

  if (loading && receipts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Receipts (Incoming Goods)</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create Receipt
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
              <TableCell>Receipt #</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Expected Date</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt._id}>
                <TableCell>{receipt.receiptNumber}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {receipt.supplier.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {receipt.supplier.email}
                  </Typography>
                </TableCell>
                <TableCell>{receipt.warehouse?.name}</TableCell>
                <TableCell>${receipt.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={receipt.status}
                    color={getStatusColor(receipt.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {receipt.expectedDate ? new Date(receipt.expectedDate).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{receipt.createdBy?.name}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleDownloadPDF(receipt._id, receipt.receiptNumber)}>
                    <PictureAsPdf />
                  </IconButton>
                  {receipt.status !== 'Done' && (
                    <>
                      <IconButton onClick={() => handleOpenDialog(receipt)}>
                        <Edit />
                      </IconButton>
                      {receipt.status === 'Waiting' && (
                        <IconButton onClick={() => handleStatusChange(receipt._id, 'Done')}>
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton onClick={() => handleDelete(receipt._id)}>
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
          {editingReceipt ? 'Edit Receipt' : 'Create New Receipt'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Supplier Information
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Supplier Name"
                  value={formData.supplier.name}
                  onChange={(e) => handleSupplierChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.supplier.email}
                  onChange={(e) => handleSupplierChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.supplier.phone}
                  onChange={(e) => handleSupplierChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.supplier.address}
                  onChange={(e) => handleSupplierChange('address', e.target.value)}
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
                  label="Expected Date"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
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
                                  {product.name} ({product.sku})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Qty Ordered"
                            type="number"
                            value={item.quantityOrdered}
                            onChange={(e) => handleItemChange(index, 'quantityOrdered', parseInt(e.target.value))}
                            required
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Qty Received"
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => handleItemChange(index, 'quantityReceived', parseInt(e.target.value))}
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
                            value={(item.totalPrice || 0).toFixed(2)}
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
              {editingReceipt ? 'Update' : 'Create'} Receipt
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Receipts;
