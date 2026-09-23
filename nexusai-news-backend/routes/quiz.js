const router   = require('express').Router();
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recordAttemptSchema } = require('../schemas/quizSchemas');
const { recordAttempt, getHistory, getStats } = require('../controllers/quizController');

router.post('/attempts', auth, validate(recordAttemptSchema), recordAttempt);
router.get('/attempts',  auth, getHistory);
router.get('/stats',     auth, getStats);

module.exports = router;
