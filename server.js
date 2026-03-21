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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Conectar a MongoDB y levantar servidor
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');

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
