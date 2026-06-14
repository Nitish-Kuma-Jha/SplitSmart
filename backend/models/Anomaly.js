const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  importJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImportJob'
  },
  rowIndex: Number,
  rowData: mongoose.Schema.Types.Mixed,
  type: {
    type: String,
    enum: [
      'DUPLICATE',
      'SETTLEMENT_AS_EXPENSE',
      'MISSING_PAYER',
      'INVALID_DATE',
      'MISSING_CURRENCY',
      'MEMBERSHIP_VIOLATION',
      'UNKNOWN_PARTICIPANT',
      'ZERO_AMOUNT',
      'NEGATIVE_AMOUNT',
      'CONFLICTING_RECORD',
      'PERCENTAGE_ERROR',
      'SPLIT_MISMATCH',
      'AMBIGUOUS_DATE',
      'PRECISION_ISSUE',
      'FUTURE_DATE'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['error', 'warning', 'info'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  suggestion: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_resolved'],
    default: 'pending'
  },
  resolution: String,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  autoAction: {
    type: String // what the system will do if approved: 'skip', 'convert_settlement', 'use_row', etc.
  }
}, { timestamps: true });

module.exports = mongoose.model('Anomaly', anomalySchema);
