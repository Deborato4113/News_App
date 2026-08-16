# NexusAI — News Backend

Express + MongoDB + Anthropic AI backend for the NexusAI Regional Current Affairs platform.

---

## Quick Setup

### 1. Drop this folder into your project
```
E-commerce website/
└── server/
    ├── routes/
    │   ├── news.js
    │   ├── ai.js
    │   └── auth.js
    ├── controllers/
    ├── services/
    ├── models/
    ├── middleware/
    ├── server.js
    └── package.json
```

### 2. Install dependencies
```bash
cd server
npm install
```

### 3. Create your .env (copy from .env.example)
```bash
cp .env.example .env
```
Fill in:
- `ANTHROPIC_API_KEY` → from console.anthropic.com
- `NEWS_API_KEY`      → from newsapi.org (free: 100 req/day)
- `JWT_SECRET`        → any long random string

Your MongoDB URI is already pre-filled from your Atlas setup.

### 4. Start the server
```bash
npm run dev       # development with nodemon
npm start         # production
```

Server runs on: http://localhost:5000

---

## API Reference

### News

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news?region=mumbai` | Get articles (cached 30 min) |
| GET | `/api/news?region=mumbai&category=Sports` | Filter by category |
| GET | `/api/news?region=mumbai&limit=20` | Custom limit |
| POST | `/api/news/refresh` | Force fresh fetch from NewsAPI |
| GET | `/api/news/:id` | Single article by ID |
| GET | `/api/health` | Health check |

**Region options:** `mumbai` · `delhi` · `bangalore` · `london` · `newyork` · `singapore`

**Category options:** `Politics` · `Business` · `Technology` · `Sports` · `Weather` · `Health` · `General`

---

### AI

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/ask` | `{ question, region }` | Chat about today's news |
| POST | `/api/ai/quiz` | `{ region, count }` | Generate MCQ quiz |
| POST | `/api/ai/summarize` | `{ text }` | Summarize any article text |

---

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Register |
| POST | `/api/auth/login` | `{ email, password }` | Login → returns JWT |
| GET | `/api/auth/me` | — (Bearer token) | Get current user |
| PATCH | `/api/auth/preferences` | `{ preferredRegions }` | Update region prefs |

---

## Example Requests

```js
// Fetch Mumbai news (React frontend)
const res = await axios.get('http://localhost:5000/api/news?region=mumbai');
console.log(res.data.articles);

// Ask AI a question
const res = await axios.post('http://localhost:5000/api/ai/ask', {
  question: 'What happened in Mumbai today?',
  region: 'mumbai'
});
console.log(res.data.answer);

// Get a quiz
const res = await axios.post('http://localhost:5000/api/ai/quiz', {
  region: 'mumbai',
  count: 5
});
console.log(res.data.questions);
```

---

## How Caching Works

1. Frontend calls `GET /api/news?region=mumbai`
2. Backend checks MongoDB for articles fetched in the last **30 minutes**
3. If found → returns from DB (fast, no API cost)
4. If not → fetches from NewsAPI → enriches with AI → saves to MongoDB → returns
5. Use `POST /api/news/refresh` to force a fresh fetch anytime

---

## Next Steps (Phase 2)

- [ ] Socket.IO for breaking news alerts
- [ ] Daily newsletter cron job (node-cron)
- [ ] PDF current affairs export
- [ ] Google OAuth (passport.js)
- [ ] Bookmark articles (PATCH /api/auth/bookmarks)
