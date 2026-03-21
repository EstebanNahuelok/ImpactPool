module.exports = {
  // Distribución de donaciones
  SPLIT: {
    ASSOCIATION_PERCENT: 70,   // 70% va directo a la asociación
    BLOCKCHAIN_PERCENT: 30,    // 30% va al vault en blockchain
  },

  // Rewards para donadores
  REWARDS: {
    DONOR_REWARD_PERCENT: 5,   // 5% de las ganancias del vault
  },

  // Estados de donación
  DONATION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },

  // Roles de usuario
  USER_ROLES: {
    DONOR: 'donor',
    ASSOCIATION: 'association',
    ADMIN: 'admin',
  },
};
