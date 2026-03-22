const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['canastas', 'salud', 'educacion', 'vivienda', 'otro'],
    default: 'otro',
  },
  association: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Association',
    required: true,
  },
  // Bien o beneficio que se entrega
  benefit: {
    type: String,
    required: true,
  },
  // Costo por voucher en USDC
  voucherCost: {
    type: Number,
    required: true,
    min: 1,
  },
  // Total de vouchers que necesita la campaña
  totalVouchers: {
    type: Number,
    required: true,
    min: 1,
  },
  // Vouchers financiados hasta ahora
  fundedVouchers: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active',
  },
  urgent: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: 'volunteer_activism',
  },
}, { timestamps: true });

// Virtual: porcentaje financiado
campaignSchema.virtual('fundedPercent').get(function () {
  return this.totalVouchers > 0
    ? Math.round((this.fundedVouchers / this.totalVouchers) * 100)
    : 0;
});

campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Campaign', campaignSchema);
