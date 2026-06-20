const express = require('express');
const { createPost, getFeed, toggleLike, addComment, deletePost } = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { uploadPostMedia } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

// GET /api/posts/feed -> fil d'actualite (mes posts + ceux de mes amis)
router.get('/feed', getFeed);

// POST /api/posts -> creer une publication (texte +/- image ou video)
router.post('/', uploadPostMedia.single('media'), createPost);

// PUT /api/posts/:id/like -> aimer / ne plus aimer
router.put('/:id/like', toggleLike);

// POST /api/posts/:id/comment -> ajouter un commentaire
router.post('/:id/comment', addComment);

// DELETE /api/posts/:id -> supprimer sa propre publication
router.delete('/:id', deletePost);

module.exports = router;
