const Donation = require('../models/Donation.model');
const Association = require('../models/Association.model');
const blockchainService = require('./blockchain.service');
const { SPLIT, DONATION_STATUS } = require('../../config/constants');

class DonationService {
  /**
   * Crea una donación con el split 70/30
   */
  async createDonation(donorId, associationId, totalAmount) {
    const association = await Association.findById(associationId);
    if (!association) {
      throw new Error('Asociación no encontrada');
    }

    const associationAmount = (totalAmount * SPLIT.ASSOCIATION_PERCENT) / 100;
    const vaultAmount = (totalAmount * SPLIT.BLOCKCHAIN_PERCENT) / 100;

    const donation = await Donation.create({
      donor: donorId,
      association: associationId,
      totalAmount,
      associationAmount,
      vaultAmount,
      status: DONATION_STATUS.PROCESSING,
    });

    try {
      // Enviar 70% a la asociación on-chain
      const txHash = await blockchainService.transferToAssociation(
        association.walletAddress,
        associationAmount
      );
      donation.txHash = txHash;

      // Enviar 30% al vault on-chain
      const vaultTxHash = await blockchainService.depositToVault(
        donorId,
        associationId,
        vaultAmount
      );
      donation.vaultTxHash = vaultTxHash;

      donation.status = DONATION_STATUS.COMPLETED;

      // Actualizar total recibido por la asociación
      association.totalReceived += associationAmount;
      await association.save();
    } catch (error) {
      donation.status = DONATION_STATUS.FAILED;
      throw error;
    } finally {
      await donation.save();
    }

    return donation;
  }

  async getDonationById(donationId) {
    return Donation.findById(donationId)
      .populate('donor', 'name email walletAddress')
      .populate('association');
  }

  async getDonationsByDonor(donorId) {
    return Donation.find({ donor: donorId })
      .populate('association', 'name category')
      .sort({ createdAt: -1 });
  }

  async getDonationsByAssociation(associationId) {
    return Donation.find({ association: associationId })
      .populate('donor', 'name')
      .sort({ createdAt: -1 });
  }
}

module.exports = new DonationService();
