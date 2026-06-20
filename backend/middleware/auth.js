const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware d'authentification
 * ------------------------------
 * Verifie la presence et la validite d'un token JWT dans l'en-tete
 * "Authorization: Bearer <token>". Si le token est valide, on recupere
 * l'utilisateur correspondant en base et on l'attache a `req.user`
 * pour que les controleurs suivants puissent l'utiliser.
 *
 * En cas d'absence ou d'invalidite du token, on renvoie une erreur 401.
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorise, token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable pour ce token.' });
    }

    req.user = user; // disponible dans tous les controleurs proteges
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expire.' });
  }
};

module.exports = { protect };
