const router = require('express').Router();
const auth   = require('../middleware/auth');
const { askNews, getQuiz, summarizeText } = require('../controllers/aiController');

router.post('/ask',       auth, askNews);
router.post('/quiz',      auth, getQuiz);
router.post('/summarize', auth, summarizeText);

module.exports = router;
