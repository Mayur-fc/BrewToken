const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');

router.get('/', productsController.getProducts);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);
router.patch('/:id/availability', productsController.toggleAvailability);

module.exports = router;
