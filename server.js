require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const donationsRoutes = require('./src/routes/donations.routes');
const usersRoutes = require('./src/routes/users.routes');
const x402Routes = require('./src/routes/x402.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api/donations', donationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pay', x402Routes);

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
