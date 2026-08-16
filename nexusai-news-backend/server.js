require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/ai',   require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀  Server running on http://localhost:${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
