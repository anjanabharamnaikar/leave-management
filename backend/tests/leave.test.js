const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');

describe('Leave Management Tests', () => {
  let adminToken, managerToken, employeeToken;
  let adminUser, managerUser, employeeUser;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leave_management_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test users
    adminUser = new User({
      name: 'Test Admin',
      email: 'testadmin@test.com',
      password: 'test123',
      role: 'admin'
    });
    await adminUser.save();

    managerUser = new User({
      name: 'Test Manager',
      email: 'testmanager@test.com',
      password: 'test123',
      role: 'manager'
    });
    await managerUser.save();

    employeeUser = new User({
      name: 'Test Employee',
      email: 'testemployee@test.com',
      password: 'test123',
      role: 'employee',
      managerId: managerUser._id
    });
    await employeeUser.save();

    // Login and get tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@test.com', password: 'test123' });
    adminToken = adminRes.body.token;

    const managerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmanager@test.com', password: 'test123' });
    managerToken = managerRes.body.token;

    const employeeRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testemployee@test.com', password: 'test123' });
    employeeToken = employeeRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Leave.deleteMany({});
    await Holiday.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Leave.deleteMany({});
  });

  describe('Leave Overlap Validation Tests', () => {
    test('Should prevent overlapping leave dates', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      // Create first leave
      const firstLeave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'First leave'
        });

      expect(firstLeave.status).toBe(201);

      // Try to create overlapping leave
      const overlappingLeave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: dayAfter.toISOString(),
          endDate: threeDaysLater.toISOString(),
          reason: 'Overlapping leave'
        });

      expect(overlappingLeave.status).toBe(400);
      expect(overlappingLeave.body.message).toContain('overlap');
    });

    test('Should allow non-overlapping leave dates', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const weekLaterPlus1 = new Date(today);
      weekLaterPlus1.setDate(weekLaterPlus1.getDate() + 8);

      // Create first leave
      const firstLeave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'First leave'
        });

      expect(firstLeave.status).toBe(201);

      // Create non-overlapping leave
      const secondLeave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: weekLater.toISOString(),
          endDate: weekLaterPlus1.toISOString(),
          reason: 'Second leave'
        });

      expect(secondLeave.status).toBe(201);
    });

    test('Should allow overlapping dates if previous leave is rejected', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Create and reject a leave
      const leave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Leave to reject'
        });

      const leaveId = leave.body.leave._id;

      await request(app)
        .put(`/api/leaves/${leaveId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ rejectedReason: 'Not approved' });

      // Now create overlapping leave (should be allowed since previous is rejected)
      const overlappingLeave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Overlapping leave after rejection'
        });

      expect(overlappingLeave.status).toBe(201);
    });
  });

  describe('Approval Workflow Tests', () => {
    test('Manager should be able to approve leave for team member', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Employee applies for leave
      const leave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Need a break'
        });

      expect(leave.status).toBe(201);
      const leaveId = leave.body.leave._id;

      // Manager approves leave
      const approval = await request(app)
        .put(`/api/leaves/${leaveId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(approval.status).toBe(200);
      expect(approval.body.leave.status).toBe('approved');
      expect(approval.body.leave.approvedBy).toBeDefined();
    });

    test('Manager should be able to reject leave for team member', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Employee applies for leave
      const leave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Need a break'
        });

      const leaveId = leave.body.leave._id;

      // Manager rejects leave
      const rejection = await request(app)
        .put(`/api/leaves/${leaveId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ rejectedReason: 'Too many leaves this month' });

      expect(rejection.status).toBe(200);
      expect(rejection.body.leave.status).toBe('rejected');
      expect(rejection.body.leave.rejectedReason).toBe('Too many leaves this month');
    });

    test('Employee should not be able to approve their own leave', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Employee applies for leave
      const leave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Need a break'
        });

      const leaveId = leave.body.leave._id;

      // Employee tries to approve (should fail)
      const approval = await request(app)
        .put(`/api/leaves/${leaveId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(approval.status).toBe(403);
    });

    test('Approved leave should deduct from leave balance', async () => {
      const user = await User.findById(employeeUser._id);
      const initialBalance = user.leaveBalance.casual;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Employee applies for leave
      const leave = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'casual',
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          reason: 'Need a break'
        });

      const leaveId = leave.body.leave._id;

      // Manager approves leave
      await request(app)
        .put(`/api/leaves/${leaveId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Check balance is deducted
      const updatedUser = await User.findById(employeeUser._id);
      expect(updatedUser.leaveBalance.casual).toBeLessThan(initialBalance);
    });
  });
});

