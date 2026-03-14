import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { Add, Edit, Delete, Warehouse as WarehouseIcon, LocationOn } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'main',
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    capacity: 0,
    manager: {
      name: '',
      email: '',
      phone: ''
    }
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code,
        type: warehouse.type || 'main',
        location: warehouse.location || {
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        capacity: warehouse.capacity || 0,
        manager: warehouse.manager || {
          name: '',
          email: '',
          phone: ''
        }
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        code: '',
        type: 'main',
        location: {
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        capacity: 0,
        manager: {
          name: '',
          email: '',
          phone: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWarehouse(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingWarehouse 
        ? `http://localhost:5000/api/warehouses/${editingWarehouse._id}`
        : 'http://localhost:5000/api/warehouses';
      
      const method = editingWarehouse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save warehouse');

      handleCloseDialog();
      fetchWarehouses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (warehouseId) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/warehouses/${warehouseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to delete warehouse');
        fetchWarehouses();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Warehouses</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Warehouse
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Grid container spacing={3}>
        {warehouses.map((warehouse) => (
          <Grid item xs={12} md={6} lg={4} key={warehouse._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {warehouse.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code: {warehouse.code}
                    </Typography>
                  </Box>
                  <Chip
                    label={warehouse.status || 'active'}
                    color={getStatusColor(warehouse.status || 'active')}
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <LocationOn sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                    {warehouse.location?.address}, {warehouse.location?.city}, {warehouse.location?.state}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Capacity: {warehouse.capacity || 0} units
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manager: {warehouse.manager?.name || 'Not assigned'}
                  </Typography>
                </Box>

                <Box display="flex" gap={1}>
                  <IconButton size="small" onClick={() => handleOpenDialog(warehouse)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(warehouse._id)}>
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Warehouse Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Warehouse Code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <MenuItem value="main">Main</MenuItem>
                    <MenuItem value="branch">Branch</MenuItem>
                    <MenuItem value="distribution">Distribution</MenuItem>
                    <MenuItem value="retail">Retail</MenuItem>
                    <MenuItem value="special">Special</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Location</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.location.address}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, address: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.location.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, city: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.location.state}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, state: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  value={formData.location.zipCode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, zipCode: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Manager Information</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Manager Name"
                  value={formData.manager.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    manager: { ...prev.manager, name: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Manager Email"
                  type="email"
                  value={formData.manager.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    manager: { ...prev.manager, email: e.target.value } 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Manager Phone"
                  value={formData.manager.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    manager: { ...prev.manager, phone: e.target.value } 
                  }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingWarehouse ? 'Update' : 'Add'} Warehouse
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Warehouses;
