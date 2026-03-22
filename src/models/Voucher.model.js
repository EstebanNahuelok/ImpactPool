const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'redeemed', 'expired', 'cancelled'],
    default: 'active',
  },
}, { timestamps: true });

// Genera código único tipo IP-XXXX-YY
voucherSchema.statics.generateCode = function () {
  const num = Math.floor(1000 + Math.random() * 9000);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
  return `IP-${num}-${suffix}`;
};

module.exports = mongoose.model('Voucher', voucherSchema);
