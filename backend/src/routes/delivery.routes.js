const express = require('express');
const {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  trackDelivery,
  assignDriver,
  updateDeliveryStatus,
  uploadDeliveryProof,
  getDriverDeliveries,
  getClientDeliveries,
  rateDelivery
} = require('../controllers/delivery.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/track/:trackingNumber', trackDelivery);

// Protected routes
router.use(protect);

// Client routes
router.post('/', authorize('client', 'manager', 'admin'), createDelivery);
router.get('/client/my-deliveries', authorize('client'), getClientDeliveries);
router.put('/:id/rate', authorize('client'), rateDelivery);

// Driver routes
router.get('/driver/my-deliveries', authorize('driver'), getDriverDeliveries);
router.put('/:id/proof', authorize('driver'), uploadDeliveryProof);
router.put('/:id/status', authorize('driver', 'manager', 'admin'), updateDeliveryStatus);

// Manager/Admin routes
router.get('/', authorize('manager', 'admin'), getAllDeliveries);
router.get('/:id', getDeliveryById);
router.put('/:id/assign', authorize('manager', 'admin'), assignDriver);

module.exports = router;
