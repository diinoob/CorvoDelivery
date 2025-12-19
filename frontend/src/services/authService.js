import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register new user
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.token) {
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
  }
  return response;
};

// Login user
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.token) {
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
  }
  return response;
};

// Logout user
export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

// Get current user
export const getCurrentUser = async () => {
  return await api.get('/auth/me');
};

// Update user details
export const updateUserDetails = async (userData) => {
  return await api.put('/auth/updatedetails', userData);
};

// Update password
export const updatePassword = async (currentPassword, newPassword) => {
  return await api.put('/auth/updatepassword', { currentPassword, newPassword });
};

// Update FCM token
export const updateFcmToken = async (fcmToken) => {
  return await api.put('/auth/fcm-token', { fcmToken });
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  updateUserDetails,
  updatePassword,
  updateFcmToken
};
