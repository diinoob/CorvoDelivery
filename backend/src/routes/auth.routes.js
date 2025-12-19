const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  updateFcmToken
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.put('/fcm-token', protect, updateFcmToken);

module.exports = router;
