const express = require('express');
const {
  getProfile,
  updateProfile,
  updateProfilePicture,
  updateCoverPhoto,
  updateTheme,
  searchUsers,
  getUserPosts
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadProfilePicture, uploadCoverPhoto } = require('../middleware/upload');

const router = express.Router();

// Toutes les routes "utilisateurs" necessitent d'etre connecte
router.use(protect);

// GET /api/users/search?q=... -> recherche d'utilisateurs (pour "Trouver des amis")
router.get('/search', searchUsers);

// PUT /api/users/me -> modifier son propre profil (nom complet, bio)
router.put('/me', updateProfile);

// PUT /api/users/me/theme -> sauvegarder la preference de theme (clair/sombre)
router.put('/me/theme', updateTheme);

// PUT /api/users/me/profile-picture -> changer sa photo de profil (upload)
router.put('/me/profile-picture', uploadProfilePicture.single('image'), updateProfilePicture);

// PUT /api/users/me/cover-photo -> changer sa photo de couverture (upload)
router.put('/me/cover-photo', uploadCoverPhoto.single('image'), updateCoverPhoto);

// GET /api/users/:id -> profil public d'un utilisateur
router.get('/:id', getProfile);

// GET /api/users/:id/posts -> publications d'un utilisateur (page profil)
router.get('/:id/posts', getUserPosts);

module.exports = router;
