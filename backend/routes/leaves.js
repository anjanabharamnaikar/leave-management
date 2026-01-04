const express = require('express');
const { body, validationResult } = require('express-validator');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper function to check date overlap
const checkDateOverlap = async (userId, startDate, endDate, excludeLeaveId = null) => {
  const query = {
    userId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  };

  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }

  const overlappingLeaves = await Leave.find(query);
  return overlappingLeaves.length > 0;
};

// Helper function to calculate working days (excluding weekends and holidays)
const calculateWorkingDays = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end }
  });

  const holidayDates = holidays.map(h => h.date.toDateString());

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateString = d.toDateString();
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip holidays
      if (!holidayDates.includes(dateString)) {
        workingDays++;
      }
    }
  }

  return workingDays;
};

// @route   POST /api/leaves
// @desc    Apply for leave (Manager and Employee)
// @access  Private/Manager, Employee
router.post('/',
  auth,
  authorize('manager', 'employee'),
  [
    body('type').isIn(['casual', 'sick', 'earned']).withMessage('Invalid leave type'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').isISO8601().withMessage('Invalid end date'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, startDate, endDate, reason } = req.body;
      const userId = req.user._id;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return res.status(400).json({ message: 'Start date cannot be in the past' });
      }

      if (end < start) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      // Check for date overlap
      const hasOverlap = await checkDateOverlap(userId, start, end);
      if (hasOverlap) {
        return res.status(400).json({ message: 'Leave dates overlap with existing leave' });
      }

      // Calculate working days
      const workingDays = await calculateWorkingDays(start, end);

      // Check leave balance
      const user = await User.findById(userId);
      if (user.leaveBalance[type] < workingDays) {
        return res.status(400).json({ 
          message: `Insufficient leave balance. Available: ${user.leaveBalance[type]}, Required: ${workingDays}` 
        });
      }

      // Create leave request
      const leave = new Leave({
        userId,
        type,
        startDate: start,
        endDate: end,
        reason
      });

      await leave.save();
      await leave.populate('userId', 'name email');

      res.status(201).json({
        message: 'Leave application submitted successfully',
        leave
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/leaves
// @desc    Get leaves (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Employees can only see their own leaves
    if (req.user.role === 'employee') {
      query.userId = req.user._id;
    }
    // Managers can see their own leaves and their team's leaves
    else if (req.user.role === 'manager') {
      const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMemberIds.map(u => u._id);
      query.userId = { $in: [req.user._id, ...teamIds] };
    }
    // Admins can see all leaves
    // query remains empty

    const leaves = await Leave.find(query)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/leaves/:id
// @desc    Get leave by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check access permissions
    if (req.user.role === 'employee' && leave.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'manager') {
      const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMemberIds.map(u => u._id.toString());
      if (leave.userId._id.toString() !== req.user._id.toString() && !teamIds.includes(leave.userId._id.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/leaves/:id/approve
// @desc    Approve leave (Manager only)
// @access  Private/Manager
router.put('/:id/approve',
  auth,
  authorize('manager'),
  async (req, res) => {
    try {
      const leave = await Leave.findById(req.params.id).populate('userId');
      
      if (!leave) {
        return res.status(404).json({ message: 'Leave not found' });
      }

      if (leave.status !== 'pending') {
        return res.status(400).json({ message: 'Leave is not pending' });
      }

      // Check if manager can approve (must be the leave applicant's manager or admin)
      if (req.user.role === 'manager') {
        const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
        const teamIds = teamMemberIds.map(u => u._id.toString());
        
        if (leave.userId._id.toString() !== req.user._id.toString() && 
            !teamIds.includes(leave.userId._id.toString())) {
          return res.status(403).json({ message: 'You can only approve leaves for your team members' });
        }
      }

      // Calculate working days and deduct from balance
      const workingDays = await calculateWorkingDays(leave.startDate, leave.endDate);
      const user = await User.findById(leave.userId._id);
      
      if (user.leaveBalance[leave.type] < workingDays) {
        return res.status(400).json({ message: 'Insufficient leave balance' });
      }

      // Update leave status
      leave.status = 'approved';
      leave.approvedBy = req.user._id;
      await leave.save();

      // Deduct from leave balance
      user.leaveBalance[leave.type] -= workingDays;
      await user.save();

      res.json({
        message: 'Leave approved successfully',
        leave: await Leave.findById(leave._id).populate('userId', 'name email').populate('approvedBy', 'name email')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/leaves/:id/reject
// @desc    Reject leave (Manager only)
// @access  Private/Manager
router.put('/:id/reject',
  auth,
  authorize('manager'),
  [
    body('rejectedReason').trim().notEmpty().withMessage('Rejection reason is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const leave = await Leave.findById(req.params.id).populate('userId');
      
      if (!leave) {
        return res.status(404).json({ message: 'Leave not found' });
      }

      if (leave.status !== 'pending') {
        return res.status(400).json({ message: 'Leave is not pending' });
      }

      // Check if manager can reject
      if (req.user.role === 'manager') {
        const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
        const teamIds = teamMemberIds.map(u => u._id.toString());
        
        if (leave.userId._id.toString() !== req.user._id.toString() && 
            !teamIds.includes(leave.userId._id.toString())) {
          return res.status(403).json({ message: 'You can only reject leaves for your team members' });
        }
      }

      leave.status = 'rejected';
      leave.approvedBy = req.user._id;
      leave.rejectedReason = req.body.rejectedReason;
      await leave.save();

      res.json({
        message: 'Leave rejected',
        leave: await Leave.findById(leave._id).populate('userId', 'name email').populate('approvedBy', 'name email')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/leaves/:id
// @desc    Cancel leave (only if pending)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Only the applicant can cancel, and only if pending
    if (leave.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own leaves' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leaves can be cancelled' });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

