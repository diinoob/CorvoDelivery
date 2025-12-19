import api from './api';

// Create new delivery
export const createDelivery = async (deliveryData) => {
  return await api.post('/deliveries', deliveryData);
};

// Get all deliveries
export const getAllDeliveries = async (params = {}) => {
  return await api.get('/deliveries', { params });
};

// Get delivery by ID
export const getDeliveryById = async (id) => {
  return await api.get(`/deliveries/${id}`);
};

// Track delivery by tracking number
export const trackDelivery = async (trackingNumber) => {
  return await api.get(`/deliveries/track/${trackingNumber}`);
};

// Get driver's deliveries
export const getDriverDeliveries = async (status) => {
  return await api.get('/deliveries/driver/my-deliveries', { params: { status } });
};

// Get client's deliveries
export const getClientDeliveries = async () => {
  return await api.get('/deliveries/client/my-deliveries');
};

// Assign driver to delivery
export const assignDriver = async (deliveryId, driverId) => {
  return await api.put(`/deliveries/${deliveryId}/assign`, { driverId });
};

// Update delivery status
export const updateDeliveryStatus = async (deliveryId, status, notes, location) => {
  return await api.put(`/deliveries/${deliveryId}/status`, { status, notes, location });
};

// Upload delivery proof
export const uploadDeliveryProof = async (deliveryId, proofData) => {
  return await api.put(`/deliveries/${deliveryId}/proof`, proofData);
};

// Rate delivery
export const rateDelivery = async (deliveryId, score, comment) => {
  return await api.put(`/deliveries/${deliveryId}/rate`, { score, comment });
};

export default {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  trackDelivery,
  getDriverDeliveries,
  getClientDeliveries,
  assignDriver,
  updateDeliveryStatus,
  uploadDeliveryProof,
  rateDelivery
};
