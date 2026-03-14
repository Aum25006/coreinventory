# CoreInventory Management System

A comprehensive inventory management system built with React, Node.js, Express, and MongoDB.

## Features

- **Product Management**: Add, edit, delete, and search products
- **Warehouse Management**: Manage multiple warehouses with capacity tracking
- **Inventory Tracking**: Real-time stock levels and low stock alerts
- **Movement Tracking**: Track stock movements (IN, OUT, TRANSFER)
- **Dashboard**: Overview of inventory status and key metrics
- **Responsive Design**: Modern UI built with Material-UI

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- CORS for cross-origin requests

### Frontend
- React 18
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API calls

## Project Structure

```
coreinventory/
├── backend/
│   ├── server.js              # Main server file
│   ├── config/
│   │   └── db.js             # Database configuration
│   ├── models/
│   │   ├── Product.js        # Product schema
│   │   ├── Warehouse.js      # Warehouse schema
│   │   └── Movement.js       # Movement/Transaction schema
│   ├── routes/
│   │   ├── productRoutes.js  # Product API endpoints
│   │   └── inventoryRoutes.js # Inventory API endpoints
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.js            # Main React component
    │   └── pages/
    │       ├── Dashboard.js  # Dashboard overview
    │       ├── Products.js   # Product management
    │       └── Inventory.js  # Inventory management
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (installed and running)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coreinventory
```

4. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Products
- `GET /api/products` - Get all products (with pagination and filtering)
- `GET /api/products/:id` - Get a single product
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product
- `GET /api/products/low-stock` - Get low stock products

### Inventory
- `GET /api/inventory/summary` - Get inventory summary
- `POST /api/inventory/movement` - Record inventory movement
- `GET /api/inventory/movements` - Get movement history
- `GET /api/inventory/warehouses` - Get all warehouses
- `POST /api/inventory/warehouses` - Create a new warehouse

## Data Models

### Product
- name: String (required)
- sku: String (required, unique)
- description: String
- category: String (required)
- price: Number (required)
- quantity: Number (required)
- warehouse: ObjectId (ref: Warehouse)
- minStockLevel: Number

### Warehouse
- name: String (required)
- code: String (required, unique)
- location: Object (address, city, state, zipCode)
- capacity: Number (required)
- manager: Object (name, email, phone)
- isActive: Boolean

### Movement
- product: ObjectId (ref: Product)
- fromWarehouse: ObjectId (ref: Warehouse)
- toWarehouse: ObjectId (ref: Warehouse)
- movementType: String (IN, OUT, TRANSFER)
- quantity: Number (required)
- reason: String
- performedBy: String (required)
- status: String (PENDING, COMPLETED, CANCELLED)

## Usage

1. **Dashboard**: View inventory overview, low stock alerts, and warehouse summaries
2. **Products**: Manage products with CRUD operations, search, and filtering
3. **Inventory**: Track stock movements, manage warehouses, and monitor inventory levels

## Development

### Running in Development Mode
- Backend: `npm run dev` (uses nodemon for auto-restart)
- Frontend: `npm start` (uses React Scripts dev server)

### Building for Production
- Frontend: `npm run build` (creates optimized build)
- Backend: `npm start` (production mode)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
