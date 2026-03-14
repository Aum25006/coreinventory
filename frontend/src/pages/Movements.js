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
  Pagination,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, SwapHoriz } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    productId: '',
    warehouse: '',
    movementType: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchProducts();
  }, [pagination.page, filters]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 10,
        ...(filters.productId && { productId: filters.productId }),
        ...(filters.warehouse && { warehouse: filters.warehouse }),
        ...(filters.movementType && { movementType: filters.movementType }),
      });

      const response = await fetch(`http://localhost:5000/api/inventory/movements?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch movements');

      const data = await response.json();
      setMovements(data.movements);
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

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'IN': return <ArrowUpward color="success" />;
      case 'OUT': return <ArrowDownward color="error" />;
      case 'TRANSFER': return <SwapHoriz color="primary" />;
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
      <Typography variant="h4" gutterBottom>
        Move History
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Track all inventory movements and transfers
      </Typography>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
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
              <TableCell>SKU</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>From Warehouse</TableCell>
              <TableCell>To Warehouse</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
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
                  <Typography variant="body2" fontWeight="bold">
                    {movement.product?.name}
                  </Typography>
                </TableCell>
                <TableCell>{movement.product?.sku}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {movement.quantity}
                  </Typography>
                </TableCell>
                <TableCell>{movement.fromWarehouse?.name || '-'}</TableCell>
                <TableCell>{movement.toWarehouse?.name || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                    {movement.reason || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{movement.performedBy}</TableCell>
                <TableCell>
                  {new Date(movement.createdAt).toLocaleDateString()}
                  <Typography variant="caption" display="block">
                    {new Date(movement.createdAt).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={movement.status}
                    color={movement.status === 'COMPLETED' ? 'success' : 'warning'}
                    size="small"
                  />
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

      {movements.length === 0 && !loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography variant="h6" color="textSecondary">
            No movements found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Movements;
