const router   = require('express').Router();
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { refreshNewsSchema } = require('../schemas/newsSchemas');
const { addCommentSchema } = require('../schemas/commentSchemas');
const {
  getNews, refreshNews, getArticleById, toggleLike,
  searchArticles, getTrending, getSavedArticles, toggleSave,
} = require('../controllers/newsController');
const { getComments, addComment, deleteComment } = require('../controllers/commentController');

router.get('/',         auth, getNews);
router.post('/refresh', auth, validate(refreshNewsSchema), refreshNews);

// These single-segment GET routes must come BEFORE `GET /:id` — Express
// matches routes in registration order, and `/:id` would otherwise treat
// "search", "trending" or "saved" as an article id.
router.get('/search',   auth, searchArticles);
router.get('/trending', auth, getTrending);
router.get('/saved',    auth, getSavedArticles);

// Comments (article-scoped)
router.get('/:id/comments',  auth, getComments);
router.post('/:id/comments', auth, validate(addCommentSchema), addComment);
router.delete('/comments/:commentId', auth, deleteComment);

// Likes & saves
router.post('/:id/like', auth, toggleLike);
router.post('/:id/save', auth, toggleSave);

router.get('/:id', auth, getArticleById);

module.exports = router;
