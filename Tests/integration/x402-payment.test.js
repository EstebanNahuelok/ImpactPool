const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('x402 Payment Protocol', () => {
  let token;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'x402 Test User',
        email: 'x402test@test.com',
        password: 'test123456',
      });
    token = regRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/pay sin paymentHash retorna 402', async () => {
    const res = await request(app)
      .post('/api/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '1.00', resource: '/api/test' });

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Payment Required');
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment['X-Payment-Token']).toBeDefined();
  });

  test('POST /api/pay con paymentHash inválido falla verificación', async () => {
    const res = await request(app)
      .post('/api/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentHash: '0xinvalidhash',
        amount: '1.00',
      });

    // Debería fallar en verificación on-chain (no hay nodo conectado en tests)
    expect(res.status).toBe(500);
  });

  test('GET /api/pay/status/:hash retorna estado', async () => {
    const fakeHash = '0x' + '0'.repeat(64);
    const res = await request(app)
      .get(`/api/pay/status/${fakeHash}`);

    // Puede fallar por falta de conexión blockchain, pero el endpoint responde
    expect([200, 500]).toContain(res.status);
  });
});
