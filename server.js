require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// x402 Payment Protocol (Coinbase official)
const { paymentMiddleware, x402ResourceServer } = require('@x402/express');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { HTTPFacilitatorClient } = require('@x402/core/server');

const donationsRoutes = require('./src/routes/donations.routes');
const usersRoutes = require('./src/routes/users.routes');
const x402InfoRoutes = require('./src/routes/x402.routes');
const associationsRoutes = require('./src/routes/associations.routes');
const rewardsRoutes = require('./src/routes/rewards.routes');
const campaignsRoutes = require('./src/routes/campaigns.routes');
const vouchersRoutes = require('./src/routes/vouchers.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ruta raíz: servir inicio.html en lugar de index.html
// Debe ir ANTES de express.static para que no sirva index.html automáticamente
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// x402 Payment Middleware — protects premium endpoints
// Uses Coinbase facilitator for verify/settle on Avalanche Fuji
const payToAddress = process.env.DEPLOYER_ADDRESS || process.env.X402_PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';

const x402ProtectedRoutes = {
  'GET /api/premium-data': {
    accepts: {
      scheme: 'exact',
      price: '$0.01',
      network: 'eip155:43113',
      payTo: payToAddress,
    },
    description: 'Access to ImpactoPool platform statistics',
  },
  'GET /api/donations/transparency': {
    accepts: {
      scheme: 'exact',
      price: '$0.01',
      network: 'eip155:43113',
      payTo: payToAddress,
    },
    description: 'Access to donation transparency data (split details, vault balances)',
  },
};

// Initialize x402 middleware with error-resilient wrapper
// In dev, if facilitator is unreachable, endpoints serve data freely with a warning header
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
});
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register('eip155:43113', new ExactEvmScheme());

const x402Middleware = paymentMiddleware(x402ProtectedRoutes, resourceServer, undefined, undefined, false);

// Wrap x402 middleware — if facilitator is unavailable, pass through with warning
app.use((req, res, next) => {
  try {
    const result = x402Middleware(req, res, (err) => {
      if (err) {
        console.warn('x402 middleware error:', err.message);
        res.set('X-x402-Status', 'facilitator-unavailable');
        next();
      } else {
        next();
      }
    });
    // Handle async errors from the middleware
    if (result && typeof result.catch === 'function') {
      result.catch((err) => {
        console.warn('x402 middleware async error (facilitator unreachable?):', err.message);
        res.set('X-x402-Status', 'facilitator-unavailable');
        next();
      });
    }
  } catch (err) {
    console.warn('x402 middleware sync error (facilitator unreachable?):', err.message);
    res.set('X-x402-Status', 'facilitator-unavailable');
    next();
  }
});

// x402-protected endpoints
app.get('/api/premium-data', (req, res) => {
  res.json({
    platform: 'ImpactoPool',
    totalDonations: 0,
    totalAssociations: 0,
    splitRatio: '70/30',
    rewardRate: '5%',
    network: 'Avalanche Fuji (C-Chain)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/donations/transparency', async (req, res) => {
  try {
    const Donation = require('./src/models/Donation.model');
    const Association = require('./src/models/Association.model');

    const [donations, associations] = await Promise.all([
      Donation.find().sort({ createdAt: -1 }).limit(50).lean(),
      Association.find({ isVerified: true }).lean(),
    ]);

    const totalDonated = donations.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const totalToAssociations = donations.reduce((sum, d) => sum + (d.associationAmount || 0), 0);
    const totalToVault = donations.reduce((sum, d) => sum + (d.vaultAmount || 0), 0);

    res.json({
      summary: {
        totalDonations: donations.length,
        totalDonated,
        totalToAssociations,
        totalToVault,
        splitRatio: '70% associations / 30% vault',
        verifiedAssociations: associations.length,
      },
      recentDonations: donations.map(d => ({
        amount: d.totalAmount,
        associationAmount: d.associationAmount,
        vaultAmount: d.vaultAmount,
        status: d.status,
        txHash: d.txHash,
        date: d.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas API
app.use('/api/donations', donationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/x402', x402InfoRoutes);
app.use('/api/associations', associationsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/vouchers', vouchersRoutes);

// GET /api/stats — estadísticas públicas
app.get('/api/stats', async (req, res) => {
  try {
    const Donation = require('./src/models/Donation.model');
    const Association = require('./src/models/Association.model');
    const User = require('./src/models/User.model');

    const [totalDonations, totalAssociations, verifiedAssociations, totalDonors] = await Promise.all([
      Donation.countDocuments(),
      Association.countDocuments(),
      Association.countDocuments({ verified: true }),
      User.countDocuments({ role: 'donor' }),
    ]);

    const donationAgg = await Donation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$totalAmount' },
          totalToAssociations: { $sum: '$associationAmount' },
          totalToVault: { $sum: '$vaultAmount' },
        },
      },
    ]);

    const agg = donationAgg[0] || { totalDonated: 0, totalToAssociations: 0, totalToVault: 0 };

    res.json({
      totalDonations,
      totalDonated: agg.totalDonated,
      totalToAssociations: agg.totalToAssociations,
      totalToVault: agg.totalToVault,
      totalAssociations,
      verifiedAssociations,
      totalDonors,
      splitRatio: '70/30',
      rewardRate: '5%',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Conectar a MongoDB y levantar servidor
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');

    // Crear usuarios de desarrollo automáticamente si no existen (solo en dev)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const User = require('./src/models/User.model');
        const Association = require('./src/models/Association.model');
        const Campaign = require('./src/models/Campaign.model');

        // Seed: usuario donador
        const seedEmail = process.env.DEV_SEED_EMAIL || 'user@gmail.com';
        const seedPassword = process.env.DEV_SEED_PASSWORD || 'user123';
        const seedName = 'Usuario de Prueba';

        const existing = await User.findOne({ email: seedEmail });
        if (!existing) {
          await User.create({ email: seedEmail, password: seedPassword, name: seedName, role: 'donor' });
          console.log(`Dev user created: ${seedEmail} / ${seedPassword}`);
        } else {
          console.log('Dev user already exists:', seedEmail);
        }

        // Seed: usuario organización
        const orgEmail = 'organizacion@gmail.com';
        const orgPassword = 'organizacion123';
        const orgName = 'Organización ImpactPool';

        let orgUser = await User.findOne({ email: orgEmail });
        if (!orgUser) {
          orgUser = await User.create({ email: orgEmail, password: orgPassword, name: orgName, role: 'association' });
          console.log(`Org user created: ${orgEmail} / ${orgPassword}`);
        } else {
          console.log('Org user already exists:', orgEmail);
        }

        // Seed: asociación vinculada a la org
        const existingAssoc = await Association.findOne({ admin: orgUser._id });
        if (!existingAssoc) {
          await Association.create({
            name: 'Fundación ImpactPool',
            description: 'Organización principal de ImpactPool para recibir donaciones',
            walletAddress: '0x0000000000000000000000000000000000000001',
            category: 'social',
            verified: true,
            admin: orgUser._id,
          });
          console.log('Org association created: Fundación ImpactPool (verified)');
        } else {
          console.log('Org association already exists');
        }
        // Seed 4: Campañas vinculadas a la asociación
        const assoc = await Association.findOne({ admin: orgUser._id });
        if (assoc) {
          const existingCampaigns = await Campaign.countDocuments({ association: assoc._id });
          if (existingCampaigns === 0) {
            await Campaign.insertMany([
              {
                code: 'ALIM-2024',
                name: 'Nutrición Familiar',
                description: 'Programa de canastas alimentarias mensuales para familias vulnerables',
                category: 'canastas',
                association: assoc._id,
                benefit: 'Canasta Alimentaria Mensual',
                voucherCost: 50,
                totalVouchers: 200,
                fundedVouchers: 120,
                status: 'active',
                icon: 'verified',
              },
              {
                code: 'EDUC-2024',
                name: 'Futuro Brillante',
                description: 'Becas escolares semestrales para estudiantes de bajos recursos',
                category: 'educacion',
                association: assoc._id,
                benefit: 'Beca Escolar Semestral',
                voucherCost: 120,
                totalVouchers: 100,
                fundedVouchers: 35,
                status: 'active',
                icon: 'school',
              },
              {
                code: 'SALUD-2024',
                name: 'Salud Crítica',
                description: 'Kits de medicamentos para comunidades sin acceso a salud',
                category: 'salud',
                association: assoc._id,
                benefit: 'Kit de Medicamentos',
                voucherCost: 30,
                totalVouchers: 500,
                fundedVouchers: 425,
                status: 'active',
                urgent: true,
                icon: 'medical_services',
              },
              {
                code: 'HABIT-2024',
                name: 'Hogar Digno',
                description: 'Refuerzo estructural de techos en viviendas precarias',
                category: 'vivienda',
                association: assoc._id,
                benefit: 'Refuerzo Estructural Techo',
                voucherCost: 450,
                totalVouchers: 50,
                fundedVouchers: 6,
                status: 'active',
                icon: 'home',
              },
            ]);
            console.log('Campaigns seeded: 4 campañas creadas');
          } else {
            console.log('Campaigns already exist');
          }
        }
      } catch (err) {
        console.warn('No se pudo crear usuarios dev:', err.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`ImpactoPool corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar:', error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
