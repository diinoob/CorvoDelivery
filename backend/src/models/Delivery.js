const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Pickup Information
  pickupAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  pickupContact: {
    name: String,
    phone: String
  },
  
  // Delivery Information
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  deliveryContact: {
    name: String,
    phone: String,
    email: String
  },
  
  // Package Information
  packageDetails: {
    description: String,
    weight: Number, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    value: Number,
    fragile: {
      type: Boolean,
      default: false
    }
  },
  
  // Delivery Status
  status: {
    type: String,
    enum: [
      'pending',           // Aguardando atribuição
      'assigned',          // Atribuído a um entregador
      'picked_up',         // Coletado
      'in_transit',        // Em trânsito
      'out_for_delivery',  // Saiu para entrega
      'delivered',         // Entregue
      'failed',            // Falha na entrega
      'cancelled'          // Cancelado
    ],
    default: 'pending'
  },
  
  // Timeline
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: [Number]
    },
    notes: String
  }],
  
  // Proof of Delivery
  deliveryProof: {
    signature: String, // URL to signature image
    photo: String,     // URL to delivery photo
    recipientName: String,
    notes: String,
    deliveredAt: Date
  },
  
  // Estimated and Actual Times
  estimatedPickupTime: Date,
  actualPickupTime: Date,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  
  // Route Information
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Special Instructions
  specialInstructions: String,
  
  // Ratings and Feedback
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
deliverySchema.index({ 'pickupAddress.coordinates': '2dsphere' });
deliverySchema.index({ 'deliveryAddress.coordinates': '2dsphere' });
deliverySchema.index({ trackingNumber: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ driver: 1 });
deliverySchema.index({ client: 1 });

// Update timestamp on save
deliverySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add timeline entry
deliverySchema.methods.addTimelineEntry = function(status, location, notes) {
  this.timeline.push({
    status,
    location,
    notes,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to generate tracking number
deliverySchema.statics.generateTrackingNumber = function() {
  const prefix = 'CD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

module.exports = mongoose.model('Delivery', deliverySchema);
