const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Manager, Admin)
router.get('/', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { role, isAvailable } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const users = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// @desc    Get available drivers
// @route   GET /api/users/drivers/available
// @access  Private (Manager, Admin)
router.get('/drivers/available', authorize('manager', 'admin'), async (req, res) => {
  try {
    const drivers = await User.find({
      role: 'driver',
      isAvailable: true,
      isActive: true
    }).select('-password');

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available drivers',
      error: error.message
    });
  }
});

// @desc    Update user location (for drivers)
// @route   PUT /api/users/location
// @access  Private (Driver)
router.put('/location', authorize('driver'), async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: user.currentLocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// @desc    Update driver availability
// @route   PUT /api/users/availability
// @access  Private (Driver)
router.put('/availability', authorize('driver'), async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isAvailable },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      isAvailable: user.isAvailable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Manager, Admin)
router.get('/:id', authorize('manager', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

module.exports = router;
