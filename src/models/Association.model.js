const mongoose = require('mongoose');

const associationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  walletAddress: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['educacion', 'salud', 'ambiente', 'social', 'otro'],
    default: 'otro',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  // Usuario admin de la asociación
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  totalReceived: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Association', associationSchema);
