const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const authMiddleware = require('../middleware/auth.middleware');

function generateToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, walletAddress } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password y name requeridos' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    const user = await User.create({ email, password, name, role, walletAddress });
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/me - Perfil actual
router.get('/me', authMiddleware, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
