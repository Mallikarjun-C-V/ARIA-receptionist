const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBooking,
  createBooking,
  cancelBooking,
  getStats,
} = require('../controllers/bookingController');

router.get('/', getAllBookings);
router.get('/stats', getStats);
router.get('/:id', getBooking);
router.post('/', createBooking);
router.delete('/:id', cancelBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
