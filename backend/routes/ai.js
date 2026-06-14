const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// Rule-based AI explanations (no external API needed for demo)
// @POST /api/ai/explain-balance
router.post('/explain-balance', protect, async (req, res) => {
  try {
    const { memberName, groupId } = req.body;
    const expenses = await Expense.find({ group: groupId, isDeleted: false });
    const settlements = await Settlement.find({ group: groupId });

    const name = memberName.toLowerCase().trim();
    const owedExpenses = [];
    let totalOwed = 0;
    let totalPaid = 0;

    for (const exp of expenses) {
      if (exp.isSettlement) continue;
      const amtINR = exp.currency === 'USD' ? exp.amount * (exp.exchangeRate || 84) : exp.amount;

      // What this person paid
      if (exp.paidBy.memberName.toLowerCase().trim() === name) {
        totalPaid += amtINR;
      }

      // What this person owes
      const split = exp.splits.find(s => s.memberName.toLowerCase().trim() === name);
      if (split) {
        const splitAmt = exp.currency === 'USD' ? split.amount * (exp.exchangeRate || 84) : split.amount;
        totalOwed += splitAmt;
        owedExpenses.push({
          title: exp.title,
          date: exp.date,
          amount: Math.round(splitAmt * 100) / 100,
          paidBy: exp.paidBy.memberName,
          currency: 'INR'
        });
      }
    }

    // Settlements
    let settledAmount = 0;
    for (const s of settlements) {
      if (s.paidBy.memberName.toLowerCase().trim() === name) settledAmount += s.amount;
      if (s.receivedBy.memberName.toLowerCase().trim() === name) settledAmount -= s.amount;
    }

    const netBalance = totalPaid - totalOwed + settledAmount;

    const explanation = {
      memberName,
      netBalance: Math.round(netBalance * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      settledAmount: Math.round(settledAmount * 100) / 100,
      breakdown: owedExpenses.sort((a, b) => b.amount - a.amount),
      summary: netBalance < 0
        ? `${memberName} owes ₹${Math.abs(Math.round(netBalance * 100) / 100)} net across ${owedExpenses.length} expenses.`
        : `${memberName} is owed ₹${Math.round(netBalance * 100) / 100} net.`
    };

    res.json({ success: true, explanation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/ai/ask
router.post('/ask', protect, async (req, res) => {
  try {
    const { question, groupId } = req.body;
    const q = question.toLowerCase();

    const expenses = await Expense.find({ group: groupId, isDeleted: false }).sort({ date: -1 });
    const settlements = await Settlement.find({ group: groupId }).sort({ date: -1 });

    let answer = '';
    let data = [];

    // Pattern matching for natural language queries
    const memberMatch = q.match(/involving\s+(\w+)|expenses\s+of\s+(\w+)|(\w+)'s\s+expenses/);
    const monthMatch = q.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/);
    const categoryMatch = q.match(/grocery|food|electricity|rent|travel|fuel|medicine|dining|dinner|lunch/);

    if (memberMatch) {
      const member = (memberMatch[1] || memberMatch[2] || memberMatch[3]).toLowerCase();
      data = expenses.filter(e =>
        e.paidBy.memberName.toLowerCase().includes(member) ||
        e.splits.some(s => s.memberName.toLowerCase().includes(member))
      );
      answer = `Found ${data.length} expenses involving ${member}. Total: ₹${data.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0).toFixed(2)}`;
    } else if (monthMatch) {
      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const monthIdx = monthNames.indexOf(monthMatch[1]);
      data = expenses.filter(e => new Date(e.date).getMonth() === monthIdx);
      answer = `Found ${data.length} expenses in ${monthMatch[1]}. Total: ₹${data.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0).toFixed(2)}`;
    } else if (categoryMatch) {
      data = expenses.filter(e => e.title.toLowerCase().includes(categoryMatch[0]) || (e.category || '').toLowerCase().includes(categoryMatch[0]));
      answer = `Found ${data.length} ${categoryMatch[0]} expenses totaling ₹${data.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0).toFixed(2)}`;
    } else if (q.includes('largest') || q.includes('biggest') || q.includes('most expensive')) {
      data = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
      answer = `Top 5 largest expenses shown below.`;
    } else if (q.includes('settlement')) {
      data = settlements;
      answer = `Found ${settlements.length} settlements totaling ₹${settlements.reduce((s, st) => s + st.amount, 0).toFixed(2)}`;
    } else if (q.includes('usd') || q.includes('dollar')) {
      data = expenses.filter(e => e.currency === 'USD');
      answer = `Found ${data.length} USD expenses totaling $${data.reduce((s, e) => s + e.amount, 0).toFixed(2)} (≈₹${data.reduce((s, e) => s + e.amount * 84, 0).toFixed(2)} at ₹84/USD)`;
    } else {
      answer = `I can help with: "Show expenses involving [name]", "expenses in March", "largest expenses", "USD expenses", "settlements". Try one of those!`;
    }

    res.json({ success: true, answer, results: data.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
