const express = require('express');
const axios = require('axios');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

// @desc    Calculate optimal route
// @route   POST /api/routes/optimize
// @access  Private (Driver, Manager, Admin)
router.post('/optimize', authorize('driver', 'manager', 'admin'), async (req, res) => {
  try {
    const { origin, destinations, mode = 'driving' } = req.body;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    // Build waypoints string
    const waypoints = destinations.map(d => `${d.lat},${d.lng}`).join('|');

    // Call Google Maps Directions API
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json`,
      {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destinations[destinations.length - 1].lat},${destinations[destinations.length - 1].lng}`,
          waypoints: waypoints,
          optimize: true,
          mode: mode,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Error calculating route',
        error: response.data.status
      });
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    res.status(200).json({
      success: true,
      route: {
        distance: leg.distance,
        duration: leg.duration,
        polyline: route.overview_polyline.points,
        steps: leg.steps,
        waypointOrder: route.waypoint_order
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating route',
      error: error.message
    });
  }
});

// @desc    Calculate distance and time between two points
// @route   POST /api/routes/calculate
// @access  Private
router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json`,
      {
        params: {
          origins: `${origin.lat},${origin.lng}`,
          destinations: `${destination.lat},${destination.lng}`,
          mode: mode,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Error calculating distance',
        error: response.data.status
      });
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'No route found',
        error: element.status
      });
    }

    res.status(200).json({
      success: true,
      distance: element.distance,
      duration: element.duration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating distance',
      error: error.message
    });
  }
});

// @desc    Geocode address
// @route   POST /api/routes/geocode
// @access  Private
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Error geocoding address',
        error: response.data.status
      });
    }

    const result = response.data.results[0];

    res.status(200).json({
      success: true,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error geocoding address',
      error: error.message
    });
  }
});

module.exports = router;
