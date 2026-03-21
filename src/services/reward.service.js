const Donation = require('../models/Donation.model');
const { REWARDS, DONATION_STATUS } = require('../../config/constants');

class RewardService {
  /**
   * Calcula rewards pendientes para un donador
   * 5% de las ganancias del vault proporcional a su contribución
   */
  async getRewardsForDonor(donorId) {
    const donations = await Donation.find({
      donor: donorId,
      status: DONATION_STATUS.COMPLETED,
    });

    const totalVaultContributed = donations.reduce(
      (sum, d) => sum + (d.vaultAmount || 0),
      0
    );

    // Reward estimado: 5% del total contribuido al vault
    const estimatedReward =
      (totalVaultContributed * REWARDS.DONOR_REWARD_PERCENT) / 100;

    return {
      donorId,
      totalDonations: donations.length,
      totalVaultContributed,
      rewardPercent: REWARDS.DONOR_REWARD_PERCENT,
      estimatedReward,
      donations: donations.map((d) => ({
        id: d._id,
        totalAmount: d.totalAmount,
        vaultAmount: d.vaultAmount,
        date: d.createdAt,
      })),
    };
  }

  /**
   * Distribuye rewards (admin trigger)
   * En producción esto llamaría a DonationVault.distributeReward()
   */
  async distributeRewards() {
    // Por ahora: calcular para todos los donadores con donaciones completadas
    const completedDonations = await Donation.find({
      status: DONATION_STATUS.COMPLETED,
    }).populate('donor', 'name email walletAddress');

    // Agrupar por donador
    const donorMap = {};
    for (const d of completedDonations) {
      const key = d.donor._id.toString();
      if (!donorMap[key]) {
        donorMap[key] = {
          donor: d.donor,
          totalVault: 0,
          count: 0,
        };
      }
      donorMap[key].totalVault += d.vaultAmount || 0;
      donorMap[key].count += 1;
    }

    const distributions = Object.values(donorMap).map((entry) => ({
      donorId: entry.donor._id,
      donorName: entry.donor.name,
      donorEmail: entry.donor.email,
      donorWallet: entry.donor.walletAddress,
      totalVaultContributed: entry.totalVault,
      rewardAmount:
        (entry.totalVault * REWARDS.DONOR_REWARD_PERCENT) / 100,
      donationCount: entry.count,
    }));

    // TODO: Llamar DonationVault.distributeReward() on-chain para cada donador

    return {
      totalDistributions: distributions.length,
      totalRewardsDistributed: distributions.reduce(
        (sum, d) => sum + d.rewardAmount,
        0
      ),
      distributions,
    };
  }
}

module.exports = new RewardService();
