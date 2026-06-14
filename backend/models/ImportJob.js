const mongoose = require('mongoose');

const importJobSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  filename: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'pending_review', 'approved', 'importing', 'completed', 'failed'],
    default: 'uploaded'
  },
  totalRows: { type: Number, default: 0 },
  importedRows: { type: Number, default: 0 },
  skippedRows: { type: Number, default: 0 },
  errorRows: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
  anomalies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anomaly'
  }],
  rawData: [mongoose.Schema.Types.Mixed],
  report: {
    type: String,
    default: ''
  },
  completedAt: Date,
  exchangeRateUsed: { type: Number, default: 84 } // USD to INR
}, { timestamps: true });

module.exports = mongoose.model('ImportJob', importJobSchema);
