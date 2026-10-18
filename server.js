const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { testConnection } = require('./config/db');
const initDatabase = require('./scripts/initDb');

// Import Route handlers
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getSettings } = require('./controllers/settingsController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/settings', getSettings);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Fashion Hub E-Commerce API'
  });
});

// Fallback for HTML pages or 404
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

// Start Server after initializing Database
async function startServer() {
  try {
    console.log('🚀 Starting THAMIZHINI Women\'s Fashion & Accessories Server...');
    await initDatabase();
    await testConnection();

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`✨ THAMIZHINI (Women's Fashion & Accessories) running!`);
      console.log(`🌐 Website URL:      http://localhost:${PORT}`);
      console.log(`🛠️  Admin Dashboard: http://localhost:${PORT}/admin.html`);
      console.log(`📡 REST API Base:    http://localhost:${PORT}/api`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
  }
}

startServer();
