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
import { Edit, Delete, Add, CheckCircle, SwapHoriz } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Adjustments = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [formData, setFormData] = useState({
    warehouse: '',
    items: [],
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
    fetchAdjustments();
    fetchWarehouses();
    fetchProducts();
  }, [pagination.page, filters]);

  const fetchAdjustments = async () => {
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

      const response = await fetch(`http://localhost:5000/api/adjustments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch adjustments');

      const data = await response.json();
      setAdjustments(data.adjustments);
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

  const handleOpenDialog = (adjustment = null) => {
    if (adjustment) {
      setEditingAdjustment(adjustment);
      setFormData({
        warehouse: adjustment.warehouse._id,
        items: adjustment.items,
        notes: adjustment.notes || '',
      });
    } else {
      setEditingAdjustment(null);
      setFormData({
        warehouse: '',
        items: [],
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAdjustment(null);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          currentQuantity: 0,
          difference: 0,
          reason: '',
          remarks: '',
        },
      ],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product') {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].currentQuantity = product.quantity;
      }
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
      const url = editingAdjustment 
        ? `http://localhost:5000/api/adjustments/${editingAdjustment._id}`
        : 'http://localhost:5000/api/adjustments';
      
      const method = editingAdjustment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save adjustment');

      handleCloseDialog();
      fetchAdjustments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (adjustmentId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/adjustments/${adjustmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchAdjustments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (adjustmentId) => {
    if (window.confirm('Are you sure you want to delete this adjustment?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/adjustments/${adjustmentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to delete adjustment');
        fetchAdjustments();
      } catch (err) {
        setError(err.message);
      }
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

  const getAdjustmentTypeColor = (type) => {
    return type === 'Increase' ? 'success' : 'error';
  };

  if (loading && adjustments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory Adjustments</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={!['inventory_manager', 'admin'].includes(user?.role)}
        >
          Create Adjustment
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
              <TableCell>Adjustment #</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell>Items Count</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Adjustment Date</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {adjustments.map((adjustment) => (
              <TableRow key={adjustment._id}>
                <TableCell>{adjustment.adjustmentNumber}</TableCell>
                <TableCell>{adjustment.warehouse?.name}</TableCell>
                <TableCell>{adjustment.items.length}</TableCell>
                <TableCell>
                  <Chip
                    label={adjustment.status}
                    color={getStatusColor(adjustment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {adjustment.adjustmentDate 
                    ? new Date(adjustment.adjustmentDate).toLocaleDateString() 
                    : '-'}
                </TableCell>
                <TableCell>{adjustment.createdBy?.name}</TableCell>
                <TableCell align="right">
                  {adjustment.status !== 'Done' && ['inventory_manager', 'admin'].includes(user?.role) && (
                    <>
                      <IconButton onClick={() => handleOpenDialog(adjustment)}>
                        <Edit />
                      </IconButton>
                      {adjustment.status === 'Waiting' && (
                        <IconButton onClick={() => handleStatusChange(adjustment._id, 'Done')}>
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton onClick={() => handleDelete(adjustment._id)}>
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
          {editingAdjustment ? 'Edit Inventory Adjustment' : 'Create New Inventory Adjustment'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
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

              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Adjustment Items</Typography>
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
                                  {product.name} ({product.sku}) - Current: {product.quantity}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Current Quantity"
                            value={item.currentQuantity}
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Adjustment (+/-)"
                            type="number"
                            value={item.difference}
                            onChange={(e) => handleItemChange(index, 'difference', parseInt(e.target.value))}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Reason"
                            value={item.reason}
                            onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <IconButton onClick={() => handleRemoveItem(index)} color="error">
                            <Delete />
                          </IconButton>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Remarks"
                            value={item.remarks}
                            onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                            multiline
                            rows={1}
                          />
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
              {editingAdjustment ? 'Update' : 'Create'} Adjustment
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Adjustments;
