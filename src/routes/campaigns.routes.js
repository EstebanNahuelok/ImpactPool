const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Campaign = require('../models/Campaign.model');
const Donation = require('../models/Donation.model');

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
    res.json(campaigns);
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
    res.json(campaign);
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

module.exports = router;
