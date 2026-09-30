// Shared helper for API tests: spins up a real (but in-memory, disposable)
// MongoDB instance via mongodb-memory-server and points mongoose at it.
// This gives integration tests a real database engine — real validation,
// real indexes, real query behavior — without touching your actual Atlas
// cluster, needing Docker, or leaving test data behind anywhere.
//
// Usage in a test file:
//
//   const { connect, closeDatabase, clearDatabase } = require('../helpers/testDb');
//   beforeAll(connect);
//   afterEach(clearDatabase);
//   afterAll(closeDatabase);
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connect() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
}

// Wipes all collections between tests so one test's data can't leak into
// the next. Cheaper than tearing down/recreating the whole server each time.
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { connect, closeDatabase, clearDatabase };
