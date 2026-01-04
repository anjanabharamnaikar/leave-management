const express = require('express');
const { body, validationResult } = require('express-validator');
const Holiday = require('../models/Holiday');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/holidays
// @desc    Create holiday (Admin only)
// @access  Private/Admin
router.post('/',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Holiday name is required'),
    body('date').isISO8601().withMessage('Invalid date'),
    body('type').isIn(['national', 'regional', 'company']).withMessage('Invalid holiday type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, date, type } = req.body;

      // Check if holiday already exists on this date
      const existingHoliday = await Holiday.findOne({ date: new Date(date) });
      if (existingHoliday) {
        return res.status(400).json({ message: 'Holiday already exists on this date' });
      }

      const holiday = new Holiday({ name, date: new Date(date), type });
      await holiday.save();

      res.status(201).json({
        message: 'Holiday created successfully',
        holiday
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/holidays
// @desc    Get all holidays
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = {};

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (month && year) {
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(`${year}-${month}-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/holidays/:id
// @desc    Get holiday by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    res.json(holiday);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/holidays/:id
// @desc    Update holiday (Admin only)
// @access  Private/Admin
router.put('/:id',
  auth,
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Holiday name cannot be empty'),
    body('date').optional().isISO8601().withMessage('Invalid date'),
    body('type').optional().isIn(['national', 'regional', 'company']).withMessage('Invalid holiday type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const holiday = await Holiday.findById(req.params.id);
      if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }

      const { name, date, type } = req.body;
      if (name) holiday.name = name;
      if (date) holiday.date = new Date(date);
      if (type) holiday.type = type;

      await holiday.save();
      res.json({
        message: 'Holiday updated successfully',
        holiday
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/holidays/:id
// @desc    Delete holiday (Admin only)
// @access  Private/Admin
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await holiday.deleteOne();
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

