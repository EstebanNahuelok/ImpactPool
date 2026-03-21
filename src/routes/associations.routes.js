const express = require('express');
const router = express.Router();
const Association = require('../models/Association.model');
const authMiddleware = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

// GET /api/associations — listar todas (soporta ?verified=true)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.verified === 'true') {
      filter.verified = true;
    }
    const associations = await Association.find(filter)
      .populate('admin', 'name email')
      .sort({ createdAt: -1 });
    res.json(associations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/associations/:id — detalle
router.get('/:id', async (req, res) => {
  try {
    const association = await Association.findById(req.params.id)
      .populate('admin', 'name email');
    if (!association) {
      return res.status(404).json({ error: 'Asociación no encontrada' });
    }
    res.json(association);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/associations — crear (requiere auth)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, walletAddress, category } = req.body;

    if (!name || !walletAddress) {
      return res.status(400).json({ error: 'name y walletAddress requeridos' });
    }

    const association = await Association.create({
      name,
      description,
      walletAddress,
      category,
      admin: req.user._id,
    });

    res.status(201).json(association);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/associations/:id/verify — solo admin
router.patch('/:id/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ error: 'Solo administradores pueden verificar asociaciones' });
    }

    const association = await Association.findById(req.params.id);
    if (!association) {
      return res.status(404).json({ error: 'Asociación no encontrada' });
    }

    association.verified = true;
    await association.save();

    // TODO: llamar blockchainService.verifyAssociation() cuando el contrato esté desplegado

    res.json({ message: 'Asociación verificada', association });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
