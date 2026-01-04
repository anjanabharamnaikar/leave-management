const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/leaves
// @desc    Get leave reports (Admin and Manager only)
// @access  Private/Admin, Manager
router.get('/leaves', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, userId, status, type } = req.query;
    let query = {};

    // Date range filter
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // User filter
    if (userId) {
      query.userId = userId;
    } else if (req.user.role === 'manager') {
      // Managers can only see their team's reports
      const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMemberIds.map(u => u._id);
      query.userId = { $in: [req.user._id, ...teamIds] };
    }

    const leaves = await Leave.find(query)
      .populate('userId', 'name email role')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    // Calculate statistics
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      byType: {
        casual: leaves.filter(l => l.type === 'casual').length,
        sick: leaves.filter(l => l.type === 'sick').length,
        earned: leaves.filter(l => l.type === 'earned').length
      }
    };

    res.json({
      leaves,
      statistics: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/attendance
// @desc    Get attendance reports (Admin and Manager only)
// @access  Private/Admin, Manager
router.get('/attendance', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    let userQuery = {};
    if (req.user.role === 'manager') {
      const teamMemberIds = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMemberIds.map(u => u._id);
      userQuery._id = { $in: [req.user._id, ...teamIds] };
    }
    if (userId) {
      userQuery._id = userId;
    }

    const users = await User.find(userQuery).select('name email role leaveBalance');

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const attendanceData = await Promise.all(
      users.map(async (user) => {
        const leaves = await Leave.find({
          userId: user._id,
          status: 'approved',
          startDate: { $gte: start },
          endDate: { $lte: end }
        });

        const totalDays = leaves.reduce((sum, leave) => {
          const days = Math.ceil((leave.endDate - leave.startDate) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);

        return {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          totalLeaves: leaves.length,
          totalDays,
          leaveBalance: user.leaveBalance
        };
      })
    );

    res.json(attendanceData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

