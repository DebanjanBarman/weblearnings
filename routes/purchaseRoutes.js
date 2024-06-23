const express = require('express');
const purchaseController = require('../controllers/purchaseController')
const authController = require('../controllers/authController')

const router = express.Router();

router.get('/checkout-session/:courseID', authController.protect, purchaseController.getCheckoutSession)
router.post('/free-course/:courseID', authController.protect, purchaseController.getFreeCourse)

module.exports = router;
