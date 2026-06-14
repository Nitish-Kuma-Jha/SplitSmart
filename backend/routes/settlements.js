const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Settlement = require('../models/Settlement');
const AuditLog = require('../models/AuditLog');

// @GET /api/settlements?groupId=
router.get('/', protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    const query = {};
    if (groupId) query.group = groupId;

    const settlements = await Settlement.find(query)
      .sort({ date: -1 })
      .populate('createdBy', 'name');

    res.json({ success: true, settlements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/settlements
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, paidBy, receivedBy, amount, currency, date, notes } = req.body;

    if (!paidBy || !receivedBy || !amount) {
      return res.status(400).json({ success: false, message: 'paidBy, receivedBy and amount are required' });
    }

    const settlement = await Settlement.create({
      group: groupId,
      paidBy,
      receivedBy,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      date: date ? new Date(date) : new Date(),
      notes,
      createdBy: req.user._id
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_SETTLEMENT',
      entity: 'settlement',
      entityId: settlement._id,
      after: { paidBy, receivedBy, amount }
    });

    res.status(201).json({ success: true, settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/settlements/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const settlement = await Settlement.findByIdAndDelete(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE_SETTLEMENT',
      entity: 'settlement',
      entityId: settlement._id
    });

    res.json({ success: true, message: 'Settlement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
