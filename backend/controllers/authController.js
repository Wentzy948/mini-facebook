const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @route   POST /api/auth/register
 * @desc    Cree un nouveau compte utilisateur
 * @access  Public
 *
 * Etapes :
 *  1. Verifie que tous les champs requis sont presents
 *  2. Verifie qu'aucun utilisateur n'existe deja avec ce username/email
 *  3. Cree l'utilisateur (le hash du mot de passe se fait automatiquement
 *     dans le hook pre('save') du modele User)
 *  4. Renvoie un token JWT + les infos publiques de l'utilisateur
 */
const register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ message: 'Tous les champs sont requis (username, email, password, fullName).' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : "nom d'utilisateur";
      return res.status(400).json({ message: `Ce ${field} est deja utilise.` });
    }

    const user = await User.create({ username, email, password, fullName });

    // -----------------------------------------------------------------
    // Amis automatiques : on relie le nouvel inscrit a tous les comptes
    // de demonstration (crees via `npm run seed`) pour que son fil
    // d'actualite contienne immediatement des publications (texte,
    // photos, videos) au lieu d'etre vide. Echec silencieux si jamais
    // aucun compte de demo n'existe (ex: avant le premier seed).
    // -----------------------------------------------------------------
    try {
      const seedAccounts = await User.find({ isSeedAccount: true }).select('_id');
      if (seedAccounts.length > 0) {
        const seedIds = seedAccounts.map((s) => s._id);
        user.friends.push(...seedIds);
        await user.save();

        // Relation symetrique : on ajoute aussi le nouvel utilisateur
        // a la liste d'amis de chaque compte de demo.
        await User.updateMany(
          { _id: { $in: seedIds } },
          { $addToSet: { friends: user._id } }
        );
      }
    } catch (autoFriendError) {
      // Ne bloque jamais l'inscription si cette etape echoue
      console.warn('Auto-amitie avec les comptes de demo echouee :', autoFriendError.message);
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    // Erreurs de validation Mongoose (ex: format username invalide)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(' ') });
    }
    console.error('Erreur register :', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Connecte un utilisateur existant
 * @access  Public
 *
 * On recupere explicitement le champ `password` (qui est `select: false`
 * par defaut dans le schema) pour pouvoir le comparer avec bcrypt.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const token = generateToken(user._id);

    return res.json({
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erreur login :', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Renvoie les infos de l'utilisateur actuellement connecte
 *          (utilise au chargement de l'app pour restaurer la session
 *          a partir du token stocke en localStorage)
 * @access  Prive
 */
const getMe = async (req, res) => {
  // req.user est rempli par le middleware `protect`
  return res.json({ user: req.user.toPublicJSON() });
};

module.exports = { register, login, getMe };
