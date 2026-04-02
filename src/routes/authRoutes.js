const express = require('express');
const router = express.Router();
const authUsers = require('../controllers/authControllers');

const { authenticateToken} = require('../middleware/auth');

// Public routes
router.post('/register', authUsers.registerUser);
router.post('/login', authUsers.loginUser);
router.get('/verify-email', authUsers.verifyEmail);
router.get('/resend-verification', authUsers.resendVerification);

// Protected routes
router.post('/logout', authenticateToken, authUsers.logoutUser);
router.get('/me', authenticateToken, authUsers.getCurrentUser);

// change password route
router.put('/change-password', authenticateToken, authUsers.changePassword);


module.exports = router;
