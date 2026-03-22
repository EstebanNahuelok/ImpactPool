const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const donationService = require('../services/donation.service');
const Association = require('../models/Association.model');

// POST /api/donations - Crear donación
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { associationId, amount, campaignId } = req.body;

    if (!associationId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'associationId y amount (> 0) requeridos' });
    }

    const donation = await donationService.createDonation(
      req.user._id,
      associationId,
      amount,
      campaignId || null
    );

    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/donations/donor/me - Mis donaciones
router.get('/donor/me', authMiddleware, async (req, res) => {
  try {
    const donations = await donationService.getDonationsByDonor(req.user._id);
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/donations/org/me - Donaciones recibidas por la asociación del usuario logueado
router.get('/org/me', authMiddleware, async (req, res) => {
  try {
    const association = await Association.findOne({ admin: req.user._id });
    if (!association) {
      return res.json([]);
    }
    const donations = await donationService.getDonationsByAssociation(association._id);
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/donations/association/:id - Donaciones de una asociación
router.get('/association/:id', authMiddleware, async (req, res) => {
  try {
    const donations = await donationService.getDonationsByAssociation(req.params.id);
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/donations/:id - Obtener donación por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donación no encontrada' });
    }
    res.json(donation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
