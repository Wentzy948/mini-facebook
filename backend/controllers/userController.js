const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * @route   GET /api/users/:id
 * @desc    Renvoie le profil public d'un utilisateur (par id)
 * @access  Prive
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'friends',
      'username fullName profilePicture'
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    return res.json({ user: user.toPublicJSON ? { ...user.toPublicJSON(), friends: user.friends } : user });
  } catch (error) {
    console.error('Erreur getProfile :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/users/me
 * @desc    Met a jour les informations textuelles du profil
 *          (nom complet, bio) de l'utilisateur connecte
 * @access  Prive
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, bio } = req.body;

    if (fullName !== undefined) req.user.fullName = fullName;
    if (bio !== undefined) req.user.bio = bio;

    await req.user.save();

    return res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(' ') });
    }
    console.error('Erreur updateProfile :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Supprime l'ancien fichier image d'un utilisateur (photo de profil ou de couverture)
 * pour eviter d'accumuler des fichiers orphelins sur le disque.
 */
const deleteOldFile = (relativePath) => {
  if (!relativePath) return;
  const fullPath = path.join(__dirname, '..', relativePath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn('Impossible de supprimer l\'ancien fichier :', err.message);
    }
  });
};

/**
 * @route   PUT /api/users/me/profile-picture
 * @desc    Met a jour la photo de profil (upload multipart via Multer)
 * @access  Prive
 */
const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image recue.' });
    }

    const oldPicture = req.user.profilePicture;
    req.user.profilePicture = `/uploads/profiles/${req.file.filename}`;
    await req.user.save();

    deleteOldFile(oldPicture);

    return res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    console.error('Erreur updateProfilePicture :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/users/me/cover-photo
 * @desc    Met a jour la photo de couverture (upload multipart via Multer)
 * @access  Prive
 */
const updateCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image recue.' });
    }

    const oldCover = req.user.coverPhoto;
    req.user.coverPhoto = `/uploads/covers/${req.file.filename}`;
    await req.user.save();

    deleteOldFile(oldCover);

    return res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    console.error('Erreur updateCoverPhoto :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/users/me/theme
 * @desc    Sauvegarde la preference de theme (clair/sombre) de l'utilisateur
 *          afin qu'elle soit retrouvee lors d'une connexion depuis un autre appareil
 * @access  Prive
 */
const updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;

    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ message: "Le theme doit etre 'light' ou 'dark'." });
    }

    req.user.theme = theme;
    await req.user.save();

    return res.json({ theme: req.user.theme });
  } catch (error) {
    console.error('Erreur updateTheme :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/users/search?q=...
 * @desc    Recherche des utilisateurs par nom d'utilisateur ou nom complet
 *          (utilise pour l'onglet "Trouver des amis")
 * @access  Prive
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q.trim(), 'i'); // recherche insensible a la casse, "contient"

    const users = await User.find({
      _id: { $ne: req.user._id }, // exclure soi-meme des resultats
      $or: [{ username: regex }, { fullName: regex }]
    })
      .select('username fullName profilePicture friends')
      .limit(20);

    return res.json({ users });
  } catch (error) {
    console.error('Erreur searchUsers :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/users/:id/posts
 * @desc    Renvoie toutes les publications d'un utilisateur (pour sa page profil),
 *          triees de la plus recente a la plus ancienne
 * @access  Prive
 */
const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePicture')
      .populate('comments.author', 'username fullName profilePicture');

    return res.json({ posts });
  } catch (error) {
    console.error('Erreur getUserPosts :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePicture,
  updateCoverPhoto,
  updateTheme,
  searchUsers,
  getUserPosts
};
