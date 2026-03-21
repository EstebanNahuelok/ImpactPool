const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('x402 Payment Protocol (Coinbase Official)', () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('GET /api/premium-data sin pago retorna 402 Payment Required', async () => {
    const res = await request(app)
      .get('/api/premium-data');

    // x402 middleware should return 402 with PAYMENT-REQUIRED header
    expect(res.status).toBe(402);
  });

  test('GET /api/donations/transparency sin pago retorna 402', async () => {
    const res = await request(app)
      .get('/api/donations/transparency');

    expect(res.status).toBe(402);
  });

  test('GET /api/x402/info retorna info de endpoints protegidos', async () => {
    const res = await request(app)
      .get('/api/x402/info');

    expect(res.status).toBe(200);
    expect(res.body.protocol).toBe('x402');
    expect(res.body.network).toBe('eip155:43113');
    expect(res.body.protectedEndpoints).toBeDefined();
    expect(res.body.protectedEndpoints.length).toBe(2);
  });

  test('GET /api/health no está protegido por x402', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
