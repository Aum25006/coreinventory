import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  DatePicker,
} from '@mui/material';
import { 
  TrendingUp, 
  Inventory, 
  LocalShipping, 
  Receipt, 
  Warning, 
  CheckCircle,
  BarChart,
  PieChart,
  ShoppingCart,
  Warehouse,
  TrendingDown
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
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
  LineChart,
  Line,
  Area,
  AreaChart,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [summary, setSummary] = useState({});
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [warehouseDistribution, setWarehouseDistribution] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventoryUsage, setInventoryUsage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    documentType: 'all',
    warehouse: '',
    startDate: '',
    endDate: ''
  });
  const [products, setProducts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    
    // Connect to socket for real-time updates
    const token = localStorage.getItem('token');
    console.log('Dashboard: Token available:', !!token);
    
    if (token) {
      console.log('Dashboard: Connecting to socket...');
      socketService.connect(token);
      
      // Listen for real-time updates
      socketService.on('inventory:updated', (data) => {
        console.log('Dashboard: Real-time update received:', data);
        // Refresh dashboard data when inventory changes
        fetchDashboardData();
      });
      
      socketService.on('product:created', (data) => {
        console.log('Dashboard: Product created:', data);
        fetchDashboardData();
      });
      
      socketService.on('product:updated', (data) => {
        console.log('Dashboard: Product updated:', data);
        fetchDashboardData();
      });
      
      socketService.on('receipt:created', (data) => {
        console.log('Dashboard: Receipt created:', data);
        fetchDashboardData();
      });
    }
    
    return () => {
      console.log('Dashboard: Disconnecting socket...');
      socketService.disconnect();
    };
  }, []); // Remove filters dependency for now

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch inventory summary for real data
      const summaryResponse = await fetch('http://localhost:5000/api/inventory/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log('Summary data received:', summaryData);
        setSummary(summaryData);
      }
      
      // Fetch products directly to show real stock data
      const productsResponse = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const fetchedProducts = productsData.products || productsData;
        
        console.log('Products fetched:', fetchedProducts.length);
        
        // Set products state for the chart
        setProducts(fetchedProducts);
        
        // Show out of stock and low stock items
        const lowStockItems = fetchedProducts
          .filter(p => p.currentStock === 0 || p.currentStock <= p.reorderLevel)
          .map(p => ({
            _id: p._id,
            name: p.name,
            currentStock: p.currentStock,
            reorderLevel: p.reorderLevel,
            stockStatus: p.currentStock === 0 ? 'Out of Stock' : 'Low Stock',
            daysUntilStockout: p.currentStock === 0 ? 0 : Math.floor(p.currentStock / (p.averageDailyUsage || 1)),
            urgency: p.currentStock === 0 ? 'critical' : 'high'
          }));
        
        setLowStockItems(lowStockItems);
        console.log('Low stock items found:', lowStockItems.length);
        
        // Also set some basic warehouse distribution
        const warehouseDistribution = [
          { name: 'Main Warehouse', totalStock: fetchedProducts.reduce((sum, p) => sum + p.currentStock, 0) }
        ];
        setWarehouseDistribution(warehouseDistribution);
        
        // Set some sample top selling products
        const topSellingProducts = fetchedProducts.slice(0, 3).map(p => ({
          productName: p.name,
          totalQuantity: p.currentStock,
          sku: p.sku
        }));
        setTopSellingProducts(topSellingProducts);
      }

    } catch (err) {
      console.error('Dashboard error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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

  if (loading) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Dashboard</Typography>
          <Button 
            variant="outlined" 
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Dashboard</Typography>
          <Button 
            variant="outlined" 
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      p: 3
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography 
          variant="h3" 
          sx={{ 
            color: 'white',
            fontWeight: 800,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '1px'
          }}
        >
          📊 Inventory Dashboard
        </Typography>
        <Button 
          variant="contained"
          sx={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              background: 'rgba(255,255,255,0.3)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }
          }}
          onClick={fetchDashboardData}
          disabled={loading}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            {error}
          </Alert>
        </Box>
      )}

      <Typography 
        variant="h6" 
        sx={{ 
          color: 'rgba(255,255,255,0.9)',
          mb: 3,
          fontWeight: 500
        }}
      >
        Welcome back, {user?.name}! Here's your real-time inventory overview.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Dynamic Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Document Type</InputLabel>
              <Select
                value={filters.documentType}
                onChange={(e) => handleFilterChange('documentType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="receipts">Receipts</MenuItem>
                <MenuItem value="deliveries">Delivery</MenuItem>
                <MenuItem value="adjustments">Adjustments</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
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
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              size="small"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              size="small"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Inventory color="primary" />
                <Typography color="textSecondary" gutterBottom sx={{ ml: 1 }}>
                  Total Products
                </Typography>
              </Box>
              <Typography variant="h4">
                {summary?.kpis?.totalProducts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="warning" />
                <Typography color="textSecondary" gutterBottom sx={{ ml: 1 }}>
                  Low Stock Items
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {summary?.kpis?.lowStockProducts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Receipt color="success" />
                <Typography color="textSecondary" gutterBottom sx={{ ml: 1 }}>
                  Pending Receipts
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {summary?.kpis?.pendingReceipts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocalShipping color="error" />
                <Typography color="textSecondary" gutterBottom sx={{ ml: 1 }}>
                  Pending Deliveries
                </Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {summary?.kpis?.pendingDeliveries || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <Receipt sx={{ fontSize: 40, color: '#4facfe' }} />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Pending Orders
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800,
                  color: '#4facfe',
                  my: 1
                }}
              >
                {summary?.pendingReceipts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <TrendingUp sx={{ fontSize: 40, color: '#43e97b' }} />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Total Value
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800,
                  color: '#43e97b',
                  my: 1
                }}
              >
                ${summary?.warehouseInventory?.reduce((sum, wh) => sum + wh.totalValue, 0).toFixed(0) || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <TrendingUp sx={{ fontSize: 40, color: '#667eea' }} />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Max Stock Products
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={products.slice(0, 10).sort((a, b) => b.currentStock - a.currentStock)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: '#666' }} />
                  <YAxis tick={{ fill: '#666' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 2
                    }}
                  />
                  <Bar dataKey="currentStock" fill="#667eea" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <BarChart sx={{ fontSize: 40, color: '#f093fb' }} />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Top Selling Products
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={topSellingProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="productName" tick={{ fill: '#666' }} />
                  <YAxis tick={{ fill: '#666' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 2
                    }}
                  />
                  <Bar dataKey="totalQuantity" fill="#f093fb" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Receipts
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Receipt #</TableCell>
                    <TableCell>Warehouse</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.recentReceipts?.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell>{receipt.receiptNumber}</TableCell>
                      <TableCell>{receipt.warehouse?.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={receipt.status}
                          color={getStatusColor(receipt.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{receipt.createdBy?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Deliveries
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.recentDeliveries?.map((delivery) => (
                    <TableRow key={delivery._id}>
                      <TableCell>{delivery.orderNumber}</TableCell>
                      <TableCell>{delivery.customer?.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={delivery.status}
                          color={getStatusColor(delivery.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{delivery.createdBy?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Warehouse Inventory Summary
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Warehouse</TableCell>
                    <TableCell align="right">Products</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Low Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.warehouseInventory?.map((wh) => (
                    <TableRow key={wh._id}>
                      <TableCell>{wh.warehouseInfo?.name || 'Unknown'}</TableCell>
                      <TableCell align="right">{wh.totalProducts}</TableCell>
                      <TableCell align="right">{wh.totalQuantity}</TableCell>
                      <TableCell align="right">${wh.totalValue.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={wh.lowStockCount}
                          color={wh.lowStockCount > 0 ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Movements
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.recentMovements?.map((movement) => (
                    <TableRow key={movement._id}>
                      <TableCell>
                        <Chip
                          label={movement.movementType}
                          color={movement.movementType === 'IN' ? 'success' : movement.movementType === 'OUT' ? 'error' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{movement.product?.name}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.fromWarehouse?.name || '-'}</TableCell>
                      <TableCell>{movement.toWarehouse?.name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Stock Movements Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Stock Movements (Last 30 Days)
            </Typography>
            {stockMovements.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stockMovements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="incoming" stroke="#8884d8" name="Incoming" />
                  <Line type="monotone" dataKey="outgoing" stroke="#82ca9d" name="Outgoing" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No movement data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Low Stock Items with Prediction */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                fontWeight: 700,
                color: '#d32f2f'
              }}
            >
              ⚠️ Low Stock Items (Smart Prediction)
            </Typography>
            <TableContainer sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(211,47,47,0.1)' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#d32f2f' }}>Product</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#d32f2f' }}>Current Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#d32f2f' }}>Reorder Level</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#d32f2f' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#d32f2f' }}>Days Until Stockout</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#d32f2f' }}>Urgency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStockItems.map((item, index) => (
                    <TableRow 
                      key={item._id || index}
                      sx={{ 
                        '&:hover': { background: 'rgba(211,47,47,0.05)' },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          sx={{ 
                            fontWeight: 800,
                            color: item.currentStock === 0 ? '#d32f2f' : '#f57c00',
                            fontSize: '1.1rem'
                          }}
                        >
                          {item.currentStock}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{item.reorderLevel}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.stockStatus || (item.currentStock === 0 ? 'Out of Stock' : 'Low Stock')}
                          color={item.currentStock === 0 ? 'error' : item.currentStock <= item.reorderLevel ? 'warning' : 'info'}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          sx={{ 
                            fontWeight: 700,
                            color: item.daysUntilStockout === 0 ? '#d32f2f' : '#f57c00'
                          }}
                        >
                          {item.daysUntilStockout}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.urgency}
                          color={item.urgency === 'critical' ? 'error' : item.urgency === 'high' ? 'warning' : 'info'}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Inventory Usage by Category */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart />
              Inventory Usage by Category
            </Typography>
            {inventoryUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={inventoryUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="totalValue" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No category data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
