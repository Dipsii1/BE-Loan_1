const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditAplicationControllers');
const { authenticate } = require('../middleware/auth');


router.get('/', authenticate, creditController.getAll);
router.get('/:kode_pengajuan', authenticate, creditController.getByKode);
router.post('/', authenticate, creditController.create);
router.put('/:kode_pengajuan', authenticate, creditController.update);
router.delete('/:kode_pengajuan', authenticate, creditController.remove);

module.exports = router;