const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

router.post('/', ordersController.createOrder);
router.get('/', ordersController.getOrders);
router.get('/:token', ordersController.getOrderByToken);
router.patch('/:id/status', ordersController.updateOrderStatus);

module.exports = router;
