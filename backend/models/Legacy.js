const mongoose = require('mongoose');

const legacySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  beneficiaries: [{
    name: String,
    email: String,
    relationship: String
  }],
  triggerDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'triggered'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Legacy', legacySchema);
