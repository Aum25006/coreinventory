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
  CardActions
} from '@mui/material';
import { Add, TransferWithinAStation, ArrowDownward, ArrowUpward } from '@mui/icons-material';

const Inventory = () => {
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openWarehouseDialog, setOpenWarehouseDialog] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    movementType: 'IN',
    quantity: '',
    fromWarehouse: '',
    toWarehouse: '',
    reason: '',
    performedBy: ''
  });
  const [warehouseFormData, setWarehouseFormData] = useState({
    name: '',
    code: '',
    'location.address': '',
    'location.city': '',
    'location.state': '',
    'location.zipCode': '',
    capacity: '',
    'manager.name': '',
    'manager.email': '',
    'manager.phone': ''
  });
  const [filters, setFilters] = useState({
    productId: '',
    warehouse: '',
    movementType: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchProducts();
  }, [pagination.page, filters]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 10,
        ...(filters.productId && { productId: filters.productId }),
        ...(filters.warehouse && { warehouse: filters.warehouse }),
        ...(filters.movementType && { movementType: filters.movementType })
      });

      const response = await fetch(`http://localhost:5000/api/inventory/movements?${params}`);
      if (!response.ok) throw new Error('Failed to fetch movements');

      const data = await response.json();
      setMovements(data.movements);
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
      const response = await fetch('http://localhost:5000/api/inventory/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      productId: '',
      movementType: 'IN',
      quantity: '',
      fromWarehouse: '',
      toWarehouse: '',
      reason: '',
      performedBy: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenWarehouseDialog = () => {
    setWarehouseFormData({
      name: '',
      code: '',
      'location.address': '',
      'location.city': '',
      'location.state': '',
      'location.zipCode': '',
      capacity: '',
      'manager.name': '',
      'manager.email': '',
      'manager.phone': ''
    });
    setOpenWarehouseDialog(true);
  };

  const handleCloseWarehouseDialog = () => {
    setOpenWarehouseDialog(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity)
      };

      if (formData.movementType === 'IN') {
        payload.toWarehouse = formData.fromWarehouse;
        delete payload.fromWarehouse;
      }

      const response = await fetch('http://localhost:5000/api/inventory/movement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to record movement');

      handleCloseDialog();
      fetchMovements();
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...warehouseFormData,
        capacity: parseInt(warehouseFormData.capacity),
        location: {
          address: warehouseFormData['location.address'],
          city: warehouseFormData['location.city'],
          state: warehouseFormData['location.state'],
          zipCode: warehouseFormData['location.zipCode']
        },
        manager: {
          name: warehouseFormData['manager.name'],
          email: warehouseFormData['manager.email'],
          phone: warehouseFormData['manager.phone']
        }
      };

      delete payload['location.address'];
      delete payload['location.city'];
      delete payload['location.state'];
      delete payload['location.zipCode'];
      delete payload['manager.name'];
      delete payload['manager.email'];
      delete payload['manager.phone'];

      const response = await fetch('http://localhost:5000/api/inventory/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create warehouse');

      handleCloseWarehouseDialog();
      fetchWarehouses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'IN': return <ArrowUpward color="success" />;
      case 'OUT': return <ArrowDownward color="error" />;
      case 'TRANSFER': return <TransferWithinAStation color="primary" />;
      default: return null;
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'error';
      case 'TRANSFER': return 'primary';
      default: return 'default';
    }
  };

  if (loading && movements.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory Management</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleOpenWarehouseDialog}
            sx={{ mr: 2 }}
          >
            Add Warehouse
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            Record Movement
          </Button>
        </Box>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Grid container spacing={3} mb={3}>
        {warehouses.slice(0, 4).map((warehouse) => (
          <Grid item xs={12} sm={6} md={3} key={warehouse._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {warehouse.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  {warehouse.code}
                </Typography>
                <Typography variant="body2">
                  {warehouse.location.city}, {warehouse.location.state}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Capacity: {warehouse.capacity}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select
                value={filters.productId}
                onChange={(e) => handleFilterChange('productId', e.target.value)}
              >
                <MenuItem value="">All Products</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} ({product.sku})
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Movement Type</InputLabel>
              <Select
                value={filters.movementType}
                onChange={(e) => handleFilterChange('movementType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="IN">Stock In</MenuItem>
                <MenuItem value="OUT">Stock Out</MenuItem>
                <MenuItem value="TRANSFER">Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>From Warehouse</TableCell>
              <TableCell>To Warehouse</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement._id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {getMovementIcon(movement.movementType)}
                    <Chip
                      label={movement.movementType}
                      color={getMovementColor(movement.movementType)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  {movement.product?.name}
                  <Typography variant="caption" display="block">
                    {movement.product?.sku}
                  </Typography>
                </TableCell>
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>{movement.fromWarehouse?.name || '-'}</TableCell>
                <TableCell>{movement.toWarehouse?.name || '-'}</TableCell>
                <TableCell>{movement.reason || '-'}</TableCell>
                <TableCell>{movement.performedBy}</TableCell>
                <TableCell>
                  {new Date(movement.createdAt).toLocaleDateString()}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Record Inventory Movement</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Product</InputLabel>
                  <Select
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  >
                    {products.map((product) => (
                      <MenuItem key={product._id} value={product._id}>
                        {product.name} ({product.sku}) - Current: {product.quantity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Movement Type</InputLabel>
                  <Select
                    value={formData.movementType}
                    onChange={(e) => setFormData(prev => ({ ...prev, movementType: e.target.value }))}
                  >
                    <MenuItem value="IN">Stock In</MenuItem>
                    <MenuItem value="OUT">Stock Out</MenuItem>
                    <MenuItem value="TRANSFER">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Performed By"
                  value={formData.performedBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, performedBy: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>
                    {formData.movementType === 'TRANSFER' ? 'From Warehouse' : 'Warehouse'}
                  </InputLabel>
                  <Select
                    value={formData.fromWarehouse}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromWarehouse: e.target.value }))}
                  >
                    {warehouses.map((wh) => (
                      <MenuItem key={wh._id} value={wh._id}>
                        {wh.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {formData.movementType === 'TRANSFER' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>To Warehouse</InputLabel>
                    <Select
                      value={formData.toWarehouse}
                      onChange={(e) => setFormData(prev => ({ ...prev, toWarehouse: e.target.value }))}
                    >
                      {warehouses
                        .filter(wh => wh._id !== formData.fromWarehouse)
                        .map((wh) => (
                          <MenuItem key={wh._id} value={wh._id}>
                            {wh.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Record Movement
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openWarehouseDialog} onClose={handleCloseWarehouseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add New Warehouse</DialogTitle>
        <form onSubmit={handleWarehouseSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Warehouse Name"
                  value={warehouseFormData.name}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Warehouse Code"
                  value={warehouseFormData.code}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, code: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={warehouseFormData['location.address']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'location.address': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={warehouseFormData['location.city']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'location.city': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={warehouseFormData['location.state']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'location.state': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  value={warehouseFormData['location.zipCode']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'location.zipCode': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={warehouseFormData.capacity}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manager Name"
                  value={warehouseFormData['manager.name']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'manager.name': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manager Email"
                  type="email"
                  value={warehouseFormData['manager.email']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'manager.email': e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manager Phone"
                  value={warehouseFormData['manager.phone']}
                  onChange={(e) => setWarehouseFormData(prev => ({ ...prev, 'manager.phone': e.target.value }))}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseWarehouseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add Warehouse
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Inventory;
