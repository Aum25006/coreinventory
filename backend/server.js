const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

connectDB();

app.use(cors());
app.use(express.json());

// Make io available to routes
app.set('io', io);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));
app.use('/api/deliveries', require('./routes/deliveryRoutes'));
app.use('/api/adjustments', require('./routes/adjustmentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'CoreInventory API Server' });
});
