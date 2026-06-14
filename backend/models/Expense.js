const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  memberName: String,
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  amount: Number,
  percentage: Number,
  shares: Number,
  settled: {
    type: Boolean,
    default: false
  }
});

const expenseSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  amount: {
    type: Number,
    required: true
  },
  amountINR: {
    type: Number // Converted amount in INR for calculations
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  exchangeRate: {
    type: Number,
    default: 1 // USD to INR rate at time of expense
  },
  date: {
    type: Date,
    required: true
  },
  paidBy: {
    memberName: String,
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  splitType: {
    type: String,
    enum: ['equal', 'unequal', 'percentage', 'share'],
    required: true
  },
  splits: [splitSchema],
  category: {
    type: String,
    default: 'General'
  },
  isRefund: {
    type: Boolean,
    default: false
  },
  isSettlement: {
    type: Boolean,
    default: false
  },
  receiptUrl: String,
  importedFrom: {
    type: String,
    default: null // CSV filename if imported
  },
  importRowIndex: Number,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  anomalyFlags: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
