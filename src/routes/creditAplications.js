const express = require('express');
const router = express.Router();
const controller = require('../controllers/creditAplicationControllers');
const { authenticate } = require('../middleware/auth');

router.get('/', controller.getAll);
router.get('/my', authenticate, controller.getByUserId);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, controller.create);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
