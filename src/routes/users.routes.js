const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const authMiddleware = require('../middleware/auth.middleware');

function generateToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// In-memory store for verification codes (acceptable for hackathon demo)
const verificationCodes = new Map();

// POST /api/users/send-code — Generate and "send" a 6-digit verification code
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    verificationCodes.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // In production, send email here. For demo, return code in response.
    console.log(`[VERIFICATION] Code for ${email}: ${code}`);

    res.json({ message: 'Verification code sent', demoCode: code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/verify-code — Verify the 6-digit code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const stored = verificationCodes.get(email.toLowerCase());
    if (!stored) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email.toLowerCase());
      return res.status(400).json({ error: 'Verification code expired. Request a new one.' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Code is valid — remove it
    verificationCodes.delete(email.toLowerCase());

    res.json({ verified: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/org-apply — Submit an organization application
router.post('/org-apply', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Organization name and email are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // In production, store application in DB and notify admin. For demo, log it.
    console.log(`[ORG APPLICATION] "${name}" — ${email}`);

    res.json({ message: 'Application received successfully', orgName: name, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
