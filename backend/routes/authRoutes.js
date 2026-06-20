const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register -> creer un compte
router.post('/register', register);

// POST /api/auth/login -> se connecter et recevoir un token JWT
router.post('/login', login);

// GET /api/auth/me -> recuperer l'utilisateur connecte (a partir du token)
router.get('/me', protect, getMe);

module.exports = router;
