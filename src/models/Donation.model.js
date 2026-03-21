const mongoose = require('mongoose');
const { DONATION_STATUS } = require('../../config/constants');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  association: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Association',
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  // 70% para la asociación
  associationAmount: {
    type: Number,
    required: true,
  },
  // 30% para el vault blockchain
  vaultAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(DONATION_STATUS),
    default: DONATION_STATUS.PENDING,
  },
  // Hash de la transacción en blockchain
  txHash: {
    type: String,
    default: null,
  },
  vaultTxHash: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);
