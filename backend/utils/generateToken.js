const jwt = require('jsonwebtoken');

/**
 * Genere un token JWT signe contenant l'id de l'utilisateur.
 * Ce token est renvoye au frontend apres inscription/connexion et
 * doit etre inclus dans l'en-tete Authorization de chaque requete protegee :
 *   Authorization: Bearer <token>
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

module.exports = generateToken;
