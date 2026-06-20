const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const createNotification = require('../utils/createNotification');

const POST_POPULATE_AUTHOR = 'username fullName profilePicture';

/**
 * @route   POST /api/posts
 * @desc    Cree une nouvelle publication (texte et/ou media image/video)
 * @access  Prive
 *
 * Le media est optionnel et arrive via Multer (champ "media" en multipart/form-data).
 * Le type (image ou video) est detecte automatiquement a partir du mimetype du fichier
 * envoye par le navigateur (ex: "image/png" -> "image", "video/mp4" -> "video").
 * Si aucun media ET aucun texte ne sont fournis, le modele renvoie une erreur de validation.
 */
const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    let media = { url: '', type: null };
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      media = {
        url: `/uploads/posts/${req.file.filename}`,
        type: isVideo ? 'video' : 'image'
      };
    }

    const post = await Post.create({
      author: req.user._id,
      content: content || '',
      media
    });

    await post.populate('author', POST_POPULATE_AUTHOR);

    return res.status(201).json({ post });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(' ') });
    }
    console.error('Erreur createPost :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/posts/feed?page=1&limit=10
 * @desc    Renvoie le fil d'actualite : les publications de l'utilisateur connecte
 *          ET de ses amis, triees de la plus recente a la plus ancienne, paginees.
 * @access  Prive
 */
const getFeed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    // Le fil affiche : mes posts + ceux de mes amis
    const authorIds = [req.user._id, ...req.user.friends];

    const [posts, total] = await Promise.all([
      Post.find({ author: { $in: authorIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', POST_POPULATE_AUTHOR)
        .populate('comments.author', POST_POPULATE_AUTHOR),
      Post.countDocuments({ author: { $in: authorIds } })
    ]);

    return res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + posts.length < total
    });
  } catch (error) {
    console.error('Erreur getFeed :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/posts/:id/like
 * @desc    Bascule le "j'aime" sur une publication (like si pas encore aime, sinon unlike)
 * @access  Prive
 */
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publication introuvable.' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(req.user._id);
      await createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: 'like',
        post: post._id
      });
    }

    await post.save();

    return res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (error) {
    console.error('Erreur toggleLike :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   POST /api/posts/:id/comment
 * @desc    Ajoute un commentaire a une publication
 * @access  Prive
 */
const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Le commentaire ne peut pas etre vide.' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publication introuvable.' });
    }

    post.comments.push({ author: req.user._id, text: text.trim() });
    await post.save();
    await post.populate('comments.author', POST_POPULATE_AUTHOR);

    await createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      post: post._id
    });

    return res.status(201).json({ comments: post.comments });
  } catch (error) {
    console.error('Erreur addComment :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   DELETE /api/posts/:id
 * @desc    Supprime une publication (et son image associee si elle existe).
 *          Seul l'auteur de la publication peut la supprimer.
 * @access  Prive
 */
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publication introuvable.' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres publications.' });
    }

    if (post.media?.url) {
      const mediaPath = path.join(__dirname, '..', post.media.url);
      fs.unlink(mediaPath, (err) => {
        if (err && err.code !== 'ENOENT') console.warn('Suppression media echouee :', err.message);
      });
    }

    await post.deleteOne();

    return res.json({ message: 'Publication supprimee.' });
  } catch (error) {
    console.error('Erreur deletePost :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { createPost, getFeed, toggleLike, addComment, deletePost };
