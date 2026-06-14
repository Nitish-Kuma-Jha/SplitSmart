const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const AuditLog = require('../models/AuditLog');

// @GET /api/groups - Get all groups for user
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    }).populate('createdBy', 'name email');

    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/groups - Create group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    const group = await Group.create({
      name,
      description,
      currency: currency || 'INR',
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        joinDate: new Date(),
        role: 'admin'
      }]
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_GROUP',
      entity: 'group',
      entityId: group._id,
      after: { name, description }
    });

    res.status(201).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/groups/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');

    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/groups/:id - Update group
router.put('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const { name, description, currency } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (currency) group.currency = currency;

    await group.save();
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/groups/:id/members - Add member
router.post('/:id/members', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const { name, email, joinDate, isExternal } = req.body;

    group.members.push({
      name,
      email,
      joinDate: joinDate || new Date(),
      isExternal: isExternal || false,
      role: 'member'
    });

    await group.save();
    await AuditLog.create({
      user: req.user._id,
      action: 'ADD_MEMBER',
      entity: 'group',
      entityId: group._id,
      after: { name, email, joinDate }
    });

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/groups/:id/members/:memberId/leave - Set leave date
router.put('/:id/members/:memberId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const member = group.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const before = { leaveDate: member.leaveDate };
    member.leaveDate = req.body.leaveDate || new Date();
    await group.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'SET_MEMBER_LEAVE_DATE',
      entity: 'member',
      entityId: member._id,
      before,
      after: { leaveDate: member.leaveDate }
    });

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/groups/:id/balances - Calculate balances
router.get('/:id/balances', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const expenses = await Expense.find({ group: req.params.id, isDeleted: false });
    const settlements = await Settlement.find({ group: req.params.id });

    // Build balance map: memberName -> net balance (positive = owed to them, negative = they owe)
    const balances = {};
    const expenseBreakdown = {}; // memberName -> array of expense contributions

    // Initialize all members
    group.members.forEach(m => {
      const key = m.name.toLowerCase().trim();
      balances[key] = { name: m.name, balance: 0, paid: 0, owed: 0 };
      expenseBreakdown[key] = [];
    });

    // Process expenses
    for (const expense of expenses) {
      if (expense.isSettlement) continue;

      const paidByKey = expense.paidBy.memberName.toLowerCase().trim();

      // Payer gets credit
      if (!balances[paidByKey]) {
        balances[paidByKey] = { name: expense.paidBy.memberName, balance: 0, paid: 0, owed: 0 };
        expenseBreakdown[paidByKey] = [];
      }

      const amountInINR = expense.currency === 'USD'
        ? expense.amount * (expense.exchangeRate || 84)
        : expense.amount;

      balances[paidByKey].paid += amountInINR;
      balances[paidByKey].balance += amountInINR;

      // Each split participant owes their share
      for (const split of expense.splits) {
        const splitKey = split.memberName.toLowerCase().trim();
        if (!balances[splitKey]) {
          balances[splitKey] = { name: split.memberName, balance: 0, paid: 0, owed: 0 };
          expenseBreakdown[splitKey] = [];
        }

        const splitAmountINR = expense.currency === 'USD'
          ? split.amount * (expense.exchangeRate || 84)
          : split.amount;

        balances[splitKey].owed += splitAmountINR;
        balances[splitKey].balance -= splitAmountINR;

        expenseBreakdown[splitKey].push({
          expenseId: expense._id,
          title: expense.title,
          date: expense.date,
          amount: splitAmountINR,
          currency: 'INR',
          originalAmount: split.amount,
          originalCurrency: expense.currency
        });
      }
    }

    // Process settlements
    for (const settlement of settlements) {
      const paidByKey = settlement.paidBy.memberName.toLowerCase().trim();
      const receivedByKey = settlement.receivedBy.memberName.toLowerCase().trim();

      if (balances[paidByKey]) balances[paidByKey].balance += settlement.amount;
      if (balances[receivedByKey]) balances[receivedByKey].balance -= settlement.amount;
    }

    // Simplify debts
    const simplifiedDebts = simplifyDebts(balances);

    res.json({
      success: true,
      balances: Object.values(balances),
      simplifiedDebts,
      expenseBreakdown
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];

  Object.values(balances).forEach(b => {
    const rounded = Math.round(b.balance * 100) / 100;
    if (rounded < -0.01) debtors.push({ name: b.name, amount: -rounded });
    else if (rounded > 0.01) creditors.push({ name: b.name, amount: rounded });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(d.amount, c.amount);

    transactions.push({
      from: d.name,
      to: c.name,
      amount: Math.round(amount * 100) / 100
    });

    d.amount -= amount;
    c.amount -= amount;

    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }

  return transactions;
}

module.exports = router;
