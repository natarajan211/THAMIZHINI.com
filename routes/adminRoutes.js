const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { getAllOrders, updateOrderStatus, updateOrderDeliveryFee, getAdminStats } = require('../controllers/orderController');
const { updateSettings } = require('../controllers/settingsController');

// All routes here require valid JWT and Admin role
router.use(verifyToken, requireAdmin);

// Dashboard metrics
router.get('/stats', getAdminStats);

// Product management (Supports direct image file upload or image_url)
router.post('/products', upload.single('image'), createProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);

// Order management
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/delivery-fee', updateOrderDeliveryFee);

// Store Settings & Shop Address update
router.put('/settings', updateSettings);

module.exports = router;
