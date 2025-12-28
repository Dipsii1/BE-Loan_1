const express = require('express');
const router = express.Router();
const controller = require('../controllers/profileControllers');

router.get('/', controller.getAll);
router.get('/:user_id', controller.getByUserId);
router.post('/', controller.create);
router.put('/:user_id', controller.update);
router.delete('/:user_id', controller.remove);

module.exports = router;

