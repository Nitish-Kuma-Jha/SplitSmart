const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const AuditLog = require('../models/AuditLog');
const ImportJob = require('../models/ImportJob');

// @GET /api/reports/group/:groupId
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenses = await Expense.find({ group: groupId, isDeleted: false }).sort({ date: 1 });
    const settlements = await Settlement.find({ group: groupId }).sort({ date: 1 });

    // Monthly breakdown
    const monthly = {};
    expenses.forEach(e => {
      const key = `${new Date(e.date).getFullYear()}-${String(new Date(e.date).getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, total: 0, count: 0, expenses: [] };
      const amt = e.currency === 'USD' ? e.amount * (e.exchangeRate || 84) : e.amount;
      monthly[key].total += amt;
      monthly[key].count++;
    });

    // Category breakdown
    const categories = {};
    expenses.forEach(e => {
      const cat = e.category || 'General';
      if (!categories[cat]) categories[cat] = { category: cat, total: 0, count: 0 };
      const amt = e.currency === 'USD' ? e.amount * (e.exchangeRate || 84) : e.amount;
      categories[cat].total += amt;
      categories[cat].count++;
    });

    const totalExpenses = expenses.reduce((sum, e) => {
      return sum + (e.currency === 'USD' ? e.amount * (e.exchangeRate || 84) : e.amount);
    }, 0);

    const totalSettlements = settlements.reduce((sum, s) => sum + s.amount, 0);

    res.json({
      success: true,
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalSettlements: Math.round(totalSettlements * 100) / 100,
        expenseCount: expenses.length,
        settlementCount: settlements.length
      },
      monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
      categories: Object.values(categories),
      recentExpenses: expenses.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/reports/audit/:groupId
router.get('/audit/:groupId', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
