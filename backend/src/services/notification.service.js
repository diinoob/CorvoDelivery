const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Delivery = require('../models/Delivery');

// Initialize Firebase Admin
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
    }
  }
};

initializeFirebase();

// Configure email transporter
const createEmailTransporter = () => {
  if (!process.env.SMTP_HOST) {
    console.warn('⚠️  SMTP not configured. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const emailTransporter = createEmailTransporter();

// Send push notification via Firebase
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized');
    }

    const user = await User.findById(userId);
    
    if (!user || !user.fcmToken) {
      throw new Error('User FCM token not found');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      token: user.fcmToken
    };

    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      messageId: response
    };
  } catch (error) {
    console.error('Push notification error:', error);
    throw error;
  }
};

// Send email
exports.sendEmail = async (to, subject, html) => {
  try {
    if (!emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: `CorvoDelivery <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Send delivery status notification
exports.sendDeliveryStatusNotification = async (deliveryId, status) => {
  try {
    const delivery = await Delivery.findById(deliveryId)
      .populate('client', 'name email fcmToken')
      .populate('driver', 'name phone');

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const statusMessages = {
      assigned: 'Your delivery has been assigned to a driver',
      picked_up: 'Your package has been picked up',
      in_transit: 'Your package is in transit',
      out_for_delivery: 'Your package is out for delivery',
      delivered: 'Your package has been delivered',
      failed: 'Delivery attempt failed',
      cancelled: 'Your delivery has been cancelled'
    };

    const title = 'Delivery Update';
    const body = statusMessages[status] || `Delivery status: ${status}`;

    // Send push notification
    if (delivery.client.fcmToken && firebaseInitialized) {
      await this.sendPushNotification(
        delivery.client._id,
        title,
        body,
        {
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber,
          status
        }
      );
    }

    // Send email notification
    if (delivery.deliveryContact.email && emailTransporter) {
      const emailHtml = `
        <h2>Delivery Update</h2>
        <p>Dear ${delivery.deliveryContact.name},</p>
        <p>${body}</p>
        <p><strong>Tracking Number:</strong> ${delivery.trackingNumber}</p>
        ${delivery.driver ? `<p><strong>Driver:</strong> ${delivery.driver.name} (${delivery.driver.phone})</p>` : ''}
        <p>Track your delivery: <a href="${process.env.FRONTEND_URL}/track/${delivery.trackingNumber}">Click here</a></p>
        <p>Thank you for using CorvoDelivery!</p>
      `;

      await this.sendEmail(
        delivery.deliveryContact.email,
        `CorvoDelivery - ${title}`,
        emailHtml
      );
    }

    return {
      success: true,
      message: 'Notifications sent successfully'
    };
  } catch (error) {
    console.error('Delivery notification error:', error);
    throw error;
  }
};

// Send delivery assignment notification to driver
exports.sendDriverAssignmentNotification = async (driverId, deliveryId) => {
  try {
    const delivery = await Delivery.findById(deliveryId);
    const driver = await User.findById(driverId);

    if (!driver || !delivery) {
      throw new Error('Driver or delivery not found');
    }

    const title = 'New Delivery Assignment';
    const body = `You have been assigned a new delivery to ${delivery.deliveryAddress.city}`;

    if (driver.fcmToken && firebaseInitialized) {
      await this.sendPushNotification(
        driverId,
        title,
        body,
        {
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber
        }
      );
    }

    return {
      success: true,
      message: 'Driver notification sent successfully'
    };
  } catch (error) {
    console.error('Driver notification error:', error);
    throw error;
  }
};

module.exports = exports;
