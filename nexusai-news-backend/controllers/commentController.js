const Comment = require('../models/Comment');
const Article = require('../models/Article');
const User    = require('../models/User');

// ── GET /api/news/:id/comments ──────────────────────────────────
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ article: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .lean();

    res.json({
      count: comments.length,
      comments: comments.map(c => ({
        id: c._id,
        text: c.text,
        createdAt: c.createdAt,
        user: { id: c.user?._id, name: c.user?.name || 'Deleted user' },
      })),
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── POST /api/news/:id/comments  { text } ───────────────────────
exports.addComment = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    const comment = await Comment.create({
      article: article._id,
      user: req.user.id,
      text: req.body.text, // validated by zod
    });

    const user = await User.findById(req.user.id).select('name');

    res.status(201).json({
      id: comment._id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: { id: user._id, name: user.name },
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── DELETE /api/news/comments/:commentId ────────────────────────
// A user can delete their own comment; an admin can delete any comment.
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.user.toString() === req.user.id;
    if (!isOwner) {
      const user = await User.findById(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not allowed to delete this comment' });
      }
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid comment id' });
    next(err);
  }
};
