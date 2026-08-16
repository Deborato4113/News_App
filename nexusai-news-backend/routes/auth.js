const router = require('express').Router();
const auth   = require('../middleware/auth');
const { signup, login, getMe } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login',  login);
router.get('/me',      auth, getMe);

module.exports = router;
