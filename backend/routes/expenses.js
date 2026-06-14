const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const AuditLog = require('../models/AuditLog');

// @GET /api/expenses?groupId=
router.get('/', protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    const query = { isDeleted: false };
    if (groupId) query.group = groupId;

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .populate('createdBy', 'name');

    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/expenses
router.post('/', protect, async (req, res) => {
  try {
    const {
      groupId, title, description, amount, currency,
      date, paidBy, splitType, splits, category, notes, exchangeRate
    } = req.body;

    // Validate split percentages
    if (splitType === 'percentage') {
      const total = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ success: false, message: `Percentages must sum to 100%, got ${total}%` });
      }
    }

    // Calculate split amounts
    const processedSplits = calculateSplits(splits, amount, splitType);

    const expense = await Expense.create({
      group: groupId,
      title,
      description,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      exchangeRate: exchangeRate || (currency === 'USD' ? 84 : 1),
      amountINR: currency === 'USD' ? amount * (exchangeRate || 84) : amount,
      date: new Date(date),
      paidBy,
      splitType,
      splits: processedSplits,
      category: category || 'General',
      notes,
      createdBy: req.user._id
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_EXPENSE',
      entity: 'expense',
      entityId: expense._id,
      after: { title, amount, currency }
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/expenses/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('createdBy', 'name');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/expenses/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const before = expense.toObject();
    const { title, description, amount, currency, date, paidBy, splitType, splits, category, notes } = req.body;

    if (title) expense.title = title;
    if (description !== undefined) expense.description = description;
    if (amount) expense.amount = parseFloat(amount);
    if (currency) expense.currency = currency;
    if (date) expense.date = new Date(date);
    if (paidBy) expense.paidBy = paidBy;
    if (splitType) expense.splitType = splitType;
    if (splits) expense.splits = calculateSplits(splits, expense.amount, expense.splitType);
    if (category) expense.category = category;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE_EXPENSE',
      entity: 'expense',
      entityId: expense._id,
      before,
      after: expense.toObject()
    });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/expenses/:id - Soft delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const before = { isDeleted: false };
    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = req.user._id;
    await expense.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE_EXPENSE',
      entity: 'expense',
      entityId: expense._id,
      before,
      after: { isDeleted: true, deletedAt: expense.deletedAt },
      notes: req.body.reason || 'Deleted by user'
    });

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function calculateSplits(splits, totalAmount, splitType) {
  if (!splits || splits.length === 0) return [];
  const amount = parseFloat(totalAmount);

  if (splitType === 'equal') {
    const share = Math.round((amount / splits.length) * 100) / 100;
    let remaining = amount;
    return splits.map((s, i) => {
      const splitAmount = i === splits.length - 1 ? Math.round(remaining * 100) / 100 : share;
      remaining -= share;
      return { memberName: s.memberName, memberId: s.memberId || null, amount: splitAmount };
    });
  }

  if (splitType === 'unequal') {
    return splits.map(s => ({
      memberName: s.memberName,
      memberId: s.memberId || null,
      amount: parseFloat(s.amount) || 0
    }));
  }

  if (splitType === 'percentage') {
    return splits.map(s => ({
      memberName: s.memberName,
      memberId: s.memberId || null,
      percentage: parseFloat(s.percentage) || 0,
      amount: Math.round((amount * (parseFloat(s.percentage) || 0) / 100) * 100) / 100
    }));
  }

  if (splitType === 'share') {
    const totalShares = splits.reduce((sum, s) => sum + (parseFloat(s.shares) || 1), 0);
    const perShare = amount / totalShares;
    return splits.map(s => ({
      memberName: s.memberName,
      memberId: s.memberId || null,
      shares: parseFloat(s.shares) || 1,
      amount: Math.round(perShare * (parseFloat(s.shares) || 1) * 100) / 100
    }));
  }

  return splits;
}

module.exports = router;
