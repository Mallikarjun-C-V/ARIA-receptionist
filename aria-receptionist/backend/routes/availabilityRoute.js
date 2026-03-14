const express = require('express');
const router = express.Router();
const { checkAvailability } = require('../services/toolService');

router.get('/', async (req, res) => {
  try {
    const { date, time, people = 2 } = req.query;
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' });
    }
    const result = await checkAvailability(date, time, parseInt(people));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

module.exports = router;
