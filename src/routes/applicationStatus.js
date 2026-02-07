const express = require('express');
const router = express.Router();
const controller = require('../controllers/applicationStatusControllers');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Get all status
router.get('/', authenticateToken, controller.getAllStatus);
router.get('/application/:id', authenticateToken, controller.getStatusByApplication);
router.get('/sla/application/:id', authenticateToken, controller.getSLAByApplication);
router.get('/sla', authenticateToken, authorizeRole('Admin'), controller.getAllSLA);
router.post('/', authenticateToken, authorizeRole('Admin'), controller.createStatus);
router.put('/:id', authenticateToken, authorizeRole('Admin'), controller.updateStatus);
router.delete('/:id', authenticateToken, authorizeRole('Admin'), controller.deleteStatus);

module.exports = router;