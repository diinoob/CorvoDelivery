const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const notificationService = require('../services/notification.service');

const router = express.Router();

router.use(protect);

// @desc    Send push notification
// @route   POST /api/notifications/push
// @access  Private (Manager, Admin)
router.post('/push', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    const result = await notificationService.sendPushNotification(
      userId,
      title,
      body,
      data
    );

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending push notification',
      error: error.message
    });
  }
});

// @desc    Send email notification
// @route   POST /api/notifications/email
// @access  Private (Manager, Admin)
router.post('/email', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    const result = await notificationService.sendEmail(to, subject, html);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: error.message
    });
  }
});

// @desc    Send delivery status notification
// @route   POST /api/notifications/delivery-status
// @access  Private (Driver, Manager, Admin)
router.post('/delivery-status', authorize('driver', 'manager', 'admin'), async (req, res) => {
  try {
    const { deliveryId, status } = req.body;

    const result = await notificationService.sendDeliveryStatusNotification(
      deliveryId,
      status
    );

    res.status(200).json({
      success: true,
      message: 'Delivery status notification sent successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending delivery status notification',
      error: error.message
    });
  }
});

module.exports = router;
