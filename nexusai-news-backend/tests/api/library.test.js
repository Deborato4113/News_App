// Integration tests for collections, notes and reading history.
const request = require('supertest');
const app = require('../../app');
const Article = require('../../models/Article');
const { connect, closeDatabase, clearDatabase } = require('../helpers/testDb');

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

async function signUp(email) {
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Reader', email, password: 'StrongPass123!',
  });
  return res.body.token;
}
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const makeArticle = (title) => Article.create({ title, region: 'mumbai', description: 'x' });

describe('collections', () => {
  it('creates, lists, adds an article, and removes it', async () => {
    const t = await signUp('c1@example.com');
    const a = await makeArticle('Story one');

    const created = await request(app).post('/api/library/collections').set(bearer(t)).send({ name: 'Exam prep' });
    expect(created.status).toBe(201);
    const id = created.body.collection.id;

    const add = await request(app).post(`/api/library/collections/${id}/articles/${a._id}`).set(bearer(t));
    expect(add.status).toBe(200);
    expect(add.body.collection.count).toBe(1);

    // adding twice does not duplicate
    const again = await request(app).post(`/api/library/collections/${id}/articles/${a._id}`).set(bearer(t));
    expect(again.body.collection.count).toBe(1);

    const arts = await request(app).get(`/api/library/collections/${id}/articles`).set(bearer(t));
    expect(arts.body.articles).toHaveLength(1);
    expect(arts.body.articles[0].title).toBe('Story one');

    const rm = await request(app).delete(`/api/library/collections/${id}/articles/${a._id}`).set(bearer(t));
    expect(rm.body.collection.count).toBe(0);
  });

  it('rejects duplicate names and keeps collections private per user', async () => {
    const t1 = await signUp('c2@example.com');
    const t2 = await signUp('c3@example.com');

    const first = await request(app).post('/api/library/collections').set(bearer(t1)).send({ name: 'Later' });
    const dup = await request(app).post('/api/library/collections').set(bearer(t1)).send({ name: 'Later' });
    expect(dup.status).toBe(409);

    const other = await request(app).get('/api/library/collections').set(bearer(t2));
    expect(other.body.collections).toHaveLength(0);

    const steal = await request(app).delete(`/api/library/collections/${first.body.collection.id}`).set(bearer(t2));
    expect(steal.status).toBe(404);
  });
});

describe('notes', () => {
  it('upserts one note per article and deletes it', async () => {
    const t = await signUp('n1@example.com');
    const a = await makeArticle('Noted story');

    await request(app).put(`/api/library/notes/${a._id}`).set(bearer(t)).send({ text: 'first' });
    const upd = await request(app).put(`/api/library/notes/${a._id}`).set(bearer(t)).send({ text: 'second' });
    expect(upd.body.note.text).toBe('second');

    const list = await request(app).get('/api/library/notes').set(bearer(t));
    expect(list.body.notes).toHaveLength(1);

    await request(app).delete(`/api/library/notes/${a._id}`).set(bearer(t));
    const after = await request(app).get('/api/library/notes').set(bearer(t));
    expect(after.body.notes).toHaveLength(0);
  });
});

describe('reading history', () => {
  it('records reads, lists ids and history, and is idempotent', async () => {
    const t = await signUp('r1@example.com');
    const a = await makeArticle('Read me');

    await request(app).post(`/api/news/${a._id}/read`).set(bearer(t));
    await request(app).post(`/api/news/${a._id}/read`).set(bearer(t));

    const ids = await request(app).get('/api/news/read-ids').set(bearer(t));
    expect(ids.body.ids).toEqual([String(a._id)]);

    const hist = await request(app).get('/api/news/history').set(bearer(t));
    expect(hist.body.total).toBe(1);
    expect(hist.body.articles[0].title).toBe('Read me');
  });

  it('404s for an unknown article', async () => {
    const t = await signUp('r2@example.com');
    const res = await request(app).post('/api/news/64b000000000000000000000/read').set(bearer(t));
    expect(res.status).toBe(404);
  });
});
