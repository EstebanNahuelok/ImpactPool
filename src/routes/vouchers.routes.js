const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Voucher = require('../models/Voucher.model');
const Beneficiary = require('../models/Beneficiary.model');
const Campaign = require('../models/Campaign.model');
const Association = require('../models/Association.model');

// GET /api/vouchers?campaign=ID — listar vouchers de una campaña
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { campaign } = req.query;
    if (!campaign) {
      return res.status(400).json({ error: 'Se requiere el parámetro campaign' });
    }

    const vouchers = await Voucher.find({ campaign })
      .populate('beneficiary', 'dni name')
      .populate('campaign', 'code name')
      .sort({ createdAt: -1 });

    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vouchers — emitir nuevo voucher para un beneficiario
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { campaignId, dni, beneficiaryName } = req.body;

    if (!campaignId || !dni || !beneficiaryName) {
      return res.status(400).json({ error: 'Se requieren campaignId, dni y beneficiaryName' });
    }

    // Verificar que la campaña existe y pertenece a la org del usuario
    const campaign = await Campaign.findById(campaignId).populate('association');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    // Verificar que el usuario es admin de la asociación dueña de la campaña
    const association = await Association.findById(campaign.association._id);
    if (!association || association.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para emitir vouchers en esta campaña' });
    }

    // Buscar o crear al beneficiario (único por DNI + campaña)
    let beneficiary = await Beneficiary.findOne({ dni: dni.trim(), campaign: campaignId });
    if (!beneficiary) {
      beneficiary = await Beneficiary.create({
        dni: dni.trim(),
        name: beneficiaryName.trim(),
        campaign: campaignId,
      });
    }

    // Generar código único
    let code;
    let attempts = 0;
    do {
      code = Voucher.generateCode();
      attempts++;
    } while (await Voucher.findOne({ code }) && attempts < 10);

    const voucher = await Voucher.create({
      code,
      campaign: campaignId,
      beneficiary: beneficiary._id,
      amount: campaign.voucherCost,
    });

    const populated = await Voucher.findById(voucher._id)
      .populate('beneficiary', 'dni name')
      .populate('campaign', 'code name');

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Este beneficiario ya tiene un voucher en esta campaña' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
