// Integration tests for the quiz attempts/stats API — covers recording an
// attempt, listing history, and the streak/percentage math in getStats(),
// which is exactly the kind of logic that's easy to get subtly wrong and
// hard to verify just by reading the code.
const request = require('supertest');
const app = require('../../app');
const { connect, closeDatabase, clearDatabase } = require('../helpers/testDb');

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

async function signUpAndGetToken(email = 'quizzer@example.com') {
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Quiz Taker',
    email,
    password: 'StrongPass123!',
  });
  return res.body.token;
}

describe('quiz attempts API', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/quiz/attempts')
      .send({ region: 'mumbai', score: 3, total: 5 });
    expect(res.status).toBe(401);
  });

  it('records a valid attempt', async () => {
    const token = await signUpAndGetToken();

    const res = await request(app)
      .post('/api/quiz/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({ region: 'mumbai', score: 4, total: 5 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ region: 'mumbai', score: 4, total: 5 });
  });

  it('rejects a score greater than total', async () => {
    const token = await signUpAndGetToken();

    const res = await request(app)
      .post('/api/quiz/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({ region: 'mumbai', score: 6, total: 5 });

    expect(res.status).toBe(400);
  });

  it('lists past attempts newest-first', async () => {
    const token = await signUpAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post('/api/quiz/attempts').set(auth).send({ region: 'delhi', score: 2, total: 5 });
    await request(app).post('/api/quiz/attempts').set(auth).send({ region: 'mumbai', score: 4, total: 5 });

    const res = await request(app).get('/api/quiz/attempts').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(2);
    expect(res.body.attempts[0].region).toBe('mumbai'); // most recent first
  });

  it('keeps each user\'s attempts separate from other users\'', async () => {
    const tokenA = await signUpAndGetToken('userA@example.com');
    const tokenB = await signUpAndGetToken('userB@example.com');

    await request(app)
      .post('/api/quiz/attempts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ region: 'mumbai', score: 5, total: 5 });

    const res = await request(app)
      .get('/api/quiz/attempts')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.body.attempts).toHaveLength(0);
  });
});

describe('GET /api/quiz/stats', () => {
  it('returns zeroed stats for a user with no attempts yet', async () => {
    const token = await signUpAndGetToken();

    const res = await request(app)
      .get('/api/quiz/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalAttempts: 0, bestScorePct: 0, averagePct: 0, currentStreak: 0, longestStreak: 0,
    });
  });

  it('computes best/average percentage correctly across several attempts', async () => {
    const token = await signUpAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };

    // 60%, then 100% — best should be 100, average should be 80.
    await request(app).post('/api/quiz/attempts').set(auth).send({ region: 'mumbai', score: 3, total: 5 });
    await request(app).post('/api/quiz/attempts').set(auth).send({ region: 'mumbai', score: 5, total: 5 });

    const res = await request(app).get('/api/quiz/stats').set(auth);

    expect(res.body.totalAttempts).toBe(2);
    expect(res.body.bestScorePct).toBe(100);
    expect(res.body.averagePct).toBe(80);
    expect(res.body.currentStreak).toBe(1); // both attempts land on today (UTC)
  });
});
