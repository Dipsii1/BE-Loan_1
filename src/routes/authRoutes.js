const express = require('express');
const router = express.Router();
const authUsers = require('../controllers/authControllers');

const { authenticateToken} = require('../middleware/auth');

// Public routes
router.post('/register', authUsers.registerUser);
router.post('/login', authUsers.loginUser);

// Protected routes
router.post('/logout', authenticateToken, authUsers.logoutUser);
router.get('/me', authenticateToken, authUsers.getCurrentUser);


module.exports = router;
