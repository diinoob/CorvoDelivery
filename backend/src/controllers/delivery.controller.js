const Delivery = require('../models/Delivery');
const User = require('../models/User');

// @desc    Create new delivery
// @route   POST /api/deliveries
// @access  Private (Client, Manager, Admin)
exports.createDelivery = async (req, res) => {
  try {
    const {
      pickupAddress,
      pickupContact,
      deliveryAddress,
      deliveryContact,
      packageDetails,
      estimatedPickupTime,
      priority,
      specialInstructions
    } = req.body;

    // Generate tracking number
    const trackingNumber = Delivery.generateTrackingNumber();

    // Create delivery
    const delivery = await Delivery.create({
      trackingNumber,
      client: req.user.id,
      pickupAddress,
      pickupContact,
      deliveryAddress,
      deliveryContact,
      packageDetails,
      estimatedPickupTime,
      priority: priority || 'normal',
      specialInstructions,
      timeline: [{
        status: 'pending',
        notes: 'Delivery created'
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating delivery',
      error: error.message
    });
  }
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
// @access  Private (Manager, Admin)
exports.getAllDeliveries = async (req, res) => {
  try {
    const { status, priority, driver, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (driver) query.driver = driver;

    const deliveries = await Delivery.find(query)
      .populate('client', 'name email phone')
      .populate('driver', 'name phone vehicleType vehiclePlate rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Delivery.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error.message
    });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/deliveries/:id
// @access  Private
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('driver', 'name phone vehicleType vehiclePlate rating currentLocation');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check authorization
    if (
      req.user.role !== 'manager' &&
      req.user.role !== 'admin' &&
      delivery.client._id.toString() !== req.user.id &&
      (delivery.driver && delivery.driver._id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this delivery'
      });
    }

    res.status(200).json({
      success: true,
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery',
      error: error.message
    });
  }
};

// @desc    Get delivery by tracking number
// @route   GET /api/deliveries/track/:trackingNumber
// @access  Public
exports.trackDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ 
      trackingNumber: req.params.trackingNumber.toUpperCase() 
    })
      .populate('driver', 'name phone currentLocation')
      .select('-client -__v');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found with this tracking number'
      });
    }

    res.status(200).json({
      success: true,
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking delivery',
      error: error.message
    });
  }
};

// @desc    Assign driver to delivery
// @route   PUT /api/deliveries/:id/assign
// @access  Private (Manager, Admin)
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    // Check if driver exists and is available
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    delivery.driver = driverId;
    delivery.status = 'assigned';
    await delivery.addTimelineEntry('assigned', null, `Assigned to driver ${driver.name}`);

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning driver',
      error: error.message
    });
  }
};

// @desc    Update delivery status
// @route   PUT /api/deliveries/:id/status
// @access  Private (Driver, Manager, Admin)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, notes, location } = req.body;

    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check authorization for drivers
    if (req.user.role === 'driver' && delivery.driver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this delivery'
      });
    }

    delivery.status = status;
    
    // Update actual times based on status
    if (status === 'picked_up' && !delivery.actualPickupTime) {
      delivery.actualPickupTime = new Date();
    }
    if (status === 'delivered' && !delivery.actualDeliveryTime) {
      delivery.actualDeliveryTime = new Date();
    }

    await delivery.addTimelineEntry(status, location, notes);

    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating delivery status',
      error: error.message
    });
  }
};

// @desc    Upload delivery proof
// @route   PUT /api/deliveries/:id/proof
// @access  Private (Driver)
exports.uploadDeliveryProof = async (req, res) => {
  try {
    const { signature, photo, recipientName, notes } = req.body;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check if user is the assigned driver
    if (delivery.driver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload proof for this delivery'
      });
    }

    delivery.deliveryProof = {
      signature,
      photo,
      recipientName,
      notes,
      deliveredAt: new Date()
    };
    delivery.status = 'delivered';
    delivery.actualDeliveryTime = new Date();

    await delivery.save();
    await delivery.addTimelineEntry('delivered', null, 'Delivery completed with proof');

    // Update driver's total deliveries
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalDeliveries: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Delivery proof uploaded successfully',
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading delivery proof',
      error: error.message
    });
  }
};

// @desc    Get driver's deliveries
// @route   GET /api/deliveries/driver/my-deliveries
// @access  Private (Driver)
exports.getDriverDeliveries = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { driver: req.user.id };
    if (status) query.status = status;

    const deliveries = await Delivery.find(query)
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver deliveries',
      error: error.message
    });
  }
};

// @desc    Get client's deliveries
// @route   GET /api/deliveries/client/my-deliveries
// @access  Private (Client)
exports.getClientDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ client: req.user.id })
      .populate('driver', 'name phone rating vehicleType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching client deliveries',
      error: error.message
    });
  }
};

// @desc    Rate delivery
// @route   PUT /api/deliveries/:id/rate
// @access  Private (Client)
exports.rateDelivery = async (req, res) => {
  try {
    const { score, comment } = req.body;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check if user is the client
    if (delivery.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this delivery'
      });
    }

    // Check if delivery is completed
    if (delivery.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed deliveries'
      });
    }

    delivery.rating = {
      score,
      comment,
      ratedAt: new Date()
    };

    await delivery.save();

    // Update driver's rating
    if (delivery.driver) {
      const driverDeliveries = await Delivery.find({
        driver: delivery.driver,
        'rating.score': { $exists: true }
      });

      const totalRating = driverDeliveries.reduce((sum, d) => sum + d.rating.score, 0);
      const avgRating = totalRating / driverDeliveries.length;

      await User.findByIdAndUpdate(delivery.driver, {
        rating: avgRating.toFixed(1)
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery rated successfully',
      delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rating delivery',
      error: error.message
    });
  }
};
