const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  dni: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
}, { timestamps: true });

// Un beneficiario (por DNI) es único dentro de cada campaña
beneficiarySchema.index({ dni: 1, campaign: 1 }, { unique: true });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
