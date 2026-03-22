const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Voucher = require('../models/Voucher.model');
const Beneficiary = require('../models/Beneficiary.model');
const Campaign = require('../models/Campaign.model');
const Association = require('../models/Association.model');
const blockchainService = require('../services/blockchain.service');

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

    // Mint VoucherToken NFT on-chain
    try {
      const associationWallet = association.walletAddress || '0x0000000000000000000000000000000000000000';
      const mintResult = await blockchainService.mintVoucherToken(
        code,
        associationWallet,
        campaign.voucherCost
      );
      voucher.tokenId = parseInt(mintResult.tokenId);
      voucher.mintTxHash = mintResult.txHash;
      await voucher.save();
      console.log(`[VOUCHER] Minted token #${mintResult.tokenId} for ${code} — TX: ${mintResult.txHash}`);
    } catch (mintError) {
      console.warn(`[VOUCHER] Mint failed for ${code}: ${mintError.message} (voucher created without token)`);
    }

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

// PATCH /api/vouchers/:id/cancel — cancelar voucher (solo org admin)
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id).populate({
      path: 'campaign',
      populate: { path: 'association' },
    });
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Verificar que el usuario es admin de la asociación dueña de la campaña
    const association = await Association.findById(voucher.campaign.association._id);
    if (!association || association.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No permission to cancel vouchers in this campaign' });
    }

    if (voucher.status !== 'active') {
      return res.status(400).json({ error: 'Only active vouchers can be cancelled' });
    }

    voucher.status = 'cancelled';
    await voucher.save();

    // Burn VoucherToken NFT on-chain if it was minted
    if (voucher.tokenId) {
      try {
        const burnTxHash = await blockchainService.burnVoucherToken(voucher.tokenId);
        voucher.burnTxHash = burnTxHash;
        await voucher.save();
        console.log(`[VOUCHER] Burned token #${voucher.tokenId} for ${voucher.code} — TX: ${burnTxHash}`);
      } catch (burnError) {
        console.warn(`[VOUCHER] Burn failed for token #${voucher.tokenId}: ${burnError.message}`);
      }
    }

    const populated = await Voucher.findById(voucher._id)
      .populate('beneficiary', 'dni name')
      .populate('campaign', 'code name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
