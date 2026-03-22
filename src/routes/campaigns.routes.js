const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Campaign = require('../models/Campaign.model');
const Donation = require('../models/Donation.model');
const Voucher = require('../models/Voucher.model');
const Association = require('../models/Association.model');

// GET /api/campaigns — Listar campañas activas (público con auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    if (req.query.urgent === 'true') {
      filter.urgent = true;
    }
    const campaigns = await Campaign.find(filter)
      .populate('association', 'name category verified')
      .sort({ urgent: -1, createdAt: -1 });

    // Agregar conteo real de vouchers emitidos por campaña
    const campaignIds = campaigns.map(c => c._id);
    const voucherCounts = await Voucher.aggregate([
      { $match: { campaign: { $in: campaignIds }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$campaign', emittedCount: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
    ]);
    const countMap = {};
    voucherCounts.forEach(vc => { countMap[vc._id.toString()] = vc; });

    const result = campaigns.map(c => {
      const obj = c.toJSON();
      const counts = countMap[c._id.toString()] || { emittedCount: 0, activeCount: 0 };
      obj.emittedVouchers = counts.emittedCount;
      obj.activeVouchers = counts.activeCount;
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/campaigns/:id — Detalle de una campaña
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('association', 'name category verified walletAddress');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    const voucherStats = await Voucher.aggregate([
      { $match: { campaign: campaign._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, emittedCount: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
    ]);
    const obj = campaign.toJSON();
    const counts = voucherStats[0] || { emittedCount: 0, activeCount: 0 };
    obj.emittedVouchers = counts.emittedCount;
    obj.activeVouchers = counts.activeCount;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/campaigns/:id/donations — Donaciones/vouchers de una campaña (org only)
router.get('/:id/donations', authMiddleware, async (req, res) => {
  try {
    const donations = await Donation.find({ campaign: req.params.id })
      .populate('donor', 'name email')
      .populate('association', 'name')
      .sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/campaigns — Crear nueva campaña (solo org admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const association = await Association.findOne({ admin: req.user._id });
    if (!association) {
      return res.status(403).json({ error: 'You must be an organization admin to create campaigns' });
    }

    const { code, name, description, category, benefit, voucherCost, totalVouchers, urgent, icon } = req.body;

    if (!code || !name || !benefit || !voucherCost || !totalVouchers) {
      return res.status(400).json({ error: 'code, name, benefit, voucherCost and totalVouchers are required' });
    }

    const campaign = await Campaign.create({
      code: code.trim(),
      name: name.trim(),
      description: (description || '').trim(),
      category: category || 'otro',
      association: association._id,
      benefit: benefit.trim(),
      voucherCost,
      totalVouchers,
      urgent: !!urgent,
      icon: icon || 'volunteer_activism',
    });

    const populated = await Campaign.findById(campaign._id).populate('association', 'name category verified');
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A campaign with this code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/campaigns/:id — Editar campaña (solo org admin dueña)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const association = await Association.findById(campaign.association);
    if (!association || association.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No permission to edit this campaign' });
    }

    const allowed = ['name', 'description', 'category', 'benefit', 'voucherCost', 'totalVouchers', 'urgent', 'icon', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    await campaign.save();
    const populated = await Campaign.findById(campaign._id).populate('association', 'name category verified');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/campaigns/:id — Eliminar campaña (solo org admin dueña, sin vouchers emitidos)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const association = await Association.findById(campaign.association);
    if (!association || association.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No permission to delete this campaign' });
    }

    const voucherCount = await Voucher.countDocuments({ campaign: campaign._id, status: { $ne: 'cancelled' } });
    if (voucherCount > 0) {
      return res.status(400).json({ error: `Cannot delete: campaign has ${voucherCount} active vouchers. Cancel them first.` });
    }

    await Campaign.findByIdAndDelete(campaign._id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
