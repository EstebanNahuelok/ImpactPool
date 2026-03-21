const Donation = require('../models/Donation.model');
const Association = require('../models/Association.model');
const User = require('../models/User.model');
const blockchainService = require('./blockchain.service');
const { SPLIT, DONATION_STATUS } = require('../../config/constants');

const IS_DEV = process.env.NODE_ENV !== 'production';

class DonationService {
  /**
   * Crea una donación con el split 70/30
   * Incluye rollback: si blockchain falla, la donación queda como FAILED y no se suma al total
   */
  async createDonation(donorId, associationId, totalAmount) {
    const association = await Association.findById(associationId);
    if (!association) {
      throw new Error('Asociación no encontrada');
    }
    if (!association.verified) {
      throw new Error('La asociación no está verificada');
    }

    const donor = await User.findById(donorId);
    if (!donor) {
      throw new Error('Donador no encontrado');
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

    if (IS_DEV && !process.env.BLOCKCHAIN_ENABLED) {
      // Modo desarrollo: simular transacción exitosa sin blockchain
      donation.txHash = 'dev_' + donation._id;
      donation.vaultTxHash = 'dev_vault_' + donation._id;
      donation.status = DONATION_STATUS.COMPLETED;
      association.totalReceived += associationAmount;
      await association.save();
      console.log(`[DEV] Donación ${donation._id} simulada como completada`);
    } else {
      try {
        // Enviar 70% a la asociación on-chain (con retry)
        const txHash = await blockchainService.transferToAssociation(
          association.walletAddress,
          associationAmount
        );
        donation.txHash = txHash;

        // Enviar 30% al vault on-chain (con retry)
        const vaultTxHash = await blockchainService.depositToVault(
          donor.walletAddress,
          association.walletAddress,
          vaultAmount
        );
        donation.vaultTxHash = vaultTxHash;

        donation.status = DONATION_STATUS.COMPLETED;

        // Solo actualizar total si la tx fue exitosa
        association.totalReceived += associationAmount;
        await association.save();
      } catch (error) {
        // Rollback: marcar como FAILED, no actualizar totales
        donation.status = DONATION_STATUS.FAILED;
        console.error(`Donación ${donation._id} falló:`, error.message);
      }
    }

    await donation.save();

    if (donation.status === DONATION_STATUS.FAILED) {
      throw new Error('La transacción blockchain falló. La donación se registró como fallida.');
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
