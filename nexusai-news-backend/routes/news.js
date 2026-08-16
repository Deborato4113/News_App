const router = require('express').Router();
const auth   = require('../middleware/auth');
const { getNews, refreshNews, getArticleById } = require('../controllers/newsController');

router.get('/',         auth, getNews);
router.post('/refresh', auth, refreshNews);
router.get('/:id',      auth, getArticleById);

module.exports = router;
