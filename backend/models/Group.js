const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String, // For CSV-imported members who may not have accounts
  email: String,
  joinDate: {
    type: Date,
    required: true
  },
  leaveDate: {
    type: Date,
    default: null // null means still active
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  isExternal: {
    type: Boolean,
    default: false // true for CSV-imported people without accounts
  }
});

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [membershipSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: String
}, { timestamps: true });

// Get active members at a given date
groupSchema.methods.getActiveMembersAt = function(date) {
  return this.members.filter(m => {
    const joinDate = new Date(m.joinDate);
    const leaveDate = m.leaveDate ? new Date(m.leaveDate) : null;
    const checkDate = new Date(date);
    return joinDate <= checkDate && (!leaveDate || leaveDate >= checkDate);
  });
};

module.exports = mongoose.model('Group', groupSchema);
