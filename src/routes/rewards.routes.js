const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const rewardService = require('../services/reward.service');
const { USER_ROLES } = require('../../config/constants');

// GET /api/rewards/me — rewards del donador autenticado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const rewards = await rewardService.getRewardsForDonor(req.user._id);
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rewards/distribute — solo admin
router.post('/distribute', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ error: 'Solo administradores pueden distribuir rewards' });
    }

    const result = await rewardService.distributeRewards();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
