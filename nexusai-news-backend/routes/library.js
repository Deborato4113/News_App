const router   = require('express').Router();
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { collectionNameSchema, noteSchema } = require('../schemas/librarySchemas');
const c = require('../controllers/libraryController');

router.use(auth);

router.get('/collections',        c.listCollections);
router.post('/collections',       validate(collectionNameSchema), c.createCollection);
router.patch('/collections/:id',  validate(collectionNameSchema), c.renameCollection);
router.delete('/collections/:id', c.deleteCollection);
router.get('/collections/:id/articles', c.collectionArticles);
router.post('/collections/:id/articles/:articleId',   c.addToCollection);
router.delete('/collections/:id/articles/:articleId', c.removeFromCollection);

router.get('/notes',               c.listNotes);
router.put('/notes/:articleId',    validate(noteSchema), c.saveNote);
router.delete('/notes/:articleId', c.deleteNote);

module.exports = router;
