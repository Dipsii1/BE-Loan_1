const express = require('express');
const router = express.Router();
const controller = require('../controllers/creditAplicationControllers');

router.get('/', controller.getAll);
router.get('/:kode_pengajuan', controller.getByKode);
router.post('/', controller.create);
router.put('/:kode_pengajuan', controller.update);
router.delete('/:kode_pengajuan', controller.remove);

module.exports = router;
