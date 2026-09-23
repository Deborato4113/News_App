const router   = require('express').Router();
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimiters');
const { askSchema, quizSchema, summarizeSchema, translateSchema } = require('../schemas/aiSchemas');
const { askNews, getQuiz, summarizeText, translate } = require('../controllers/aiController');

router.post('/ask',       auth, aiLimiter, validate(askSchema),       askNews);
router.post('/quiz',      auth, aiLimiter, validate(quizSchema),      getQuiz);
router.post('/summarize', auth, aiLimiter, validate(summarizeSchema), summarizeText);
router.post('/translate', auth, aiLimiter, validate(translateSchema), translate);

module.exports = router;
