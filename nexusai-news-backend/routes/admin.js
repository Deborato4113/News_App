const router        = require('express').Router();
const auth          = require('../middleware/auth');
const requireAdmin  = require('../middleware/requireAdmin');
const validate       = require('../middleware/validate');
const { flagArticleSchema, bulkRefreshSchema } = require('../schemas/adminSchemas');
const {
  getStats, listArticles, flagArticle, unflagArticle, deleteArticle, bulkRefresh,
} = require('../controllers/adminController');

// Every route here requires a logged-in user with role === 'admin'.
router.use(auth, requireAdmin);

router.get('/stats',                 getStats);
router.get('/articles',              listArticles);
router.post('/articles/:id/flag',    validate(flagArticleSchema), flagArticle);
router.post('/articles/:id/unflag',  unflagArticle);
router.delete('/articles/:id',       deleteArticle);
router.post('/refresh',              validate(bulkRefreshSchema), bulkRefresh);

module.exports = router;
