// Integration tests for the auth API — these hit the real Express app
// (app.js) with real HTTP requests via supertest, backed by a real but
// disposable in-memory MongoDB (tests/helpers/testDb.js). Unlike
// authSchemas.test.js (which only checks the zod validation rules in
// isolation), these confirm the whole route → validate → controller →
// database round trip actually works.
const request = require('supertest');
const app = require('../../app');
const { connect, closeDatabase, clearDatabase } = require('../helpers/testDb');

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const validUser = {
  name: 'Akash Mondal',
  email: 'akash@example.com',
  password: 'StrongPass123!',
};

describe('POST /api/auth/signup', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: validUser.name,
      email: validUser.email,
      role: 'user',
      authProvider: 'local',
    });
    // The hashed password must never be echoed back to the client.
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects a weak password before it ever reaches the database', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app).post('/api/auth/signup').send(validUser);

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validUser);
  });

  it('logs in with the correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401 and no hint about which part was wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects a non-existent email with the same message (no account enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: validUser.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser);
    const token = signup.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });
});
