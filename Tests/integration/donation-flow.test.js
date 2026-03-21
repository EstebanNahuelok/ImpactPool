const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('Donation Flow - Avalanche', () => {
  let token;
  let associationId;

  beforeAll(async () => {
    // Registrar usuario donador
    const regRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test Donor',
        email: 'donor@test.com',
        password: 'test123456',
        role: 'donor',
      });
    token = regRes.body.token;

    // Registrar usuario asociación
    const assocRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test Association Admin',
        email: 'assoc@test.com',
        password: 'test123456',
        role: 'association',
      });

    // TODO: Crear asociación via API cuando el endpoint esté disponible
    // Por ahora se crearía directamente en MongoDB para tests
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/donations - requiere autenticación', async () => {
    const res = await request(app)
      .post('/api/donations')
      .send({ associationId: '000000000000000000000000', amount: 100 });

    expect(res.status).toBe(401);
  });

  test('POST /api/donations - requiere datos válidos', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/donations/donor/me - retorna donaciones vacías', async () => {
    const res = await request(app)
      .get('/api/donations/donor/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/health - status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
