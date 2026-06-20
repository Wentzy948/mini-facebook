const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modele Utilisateur
 * ------------------
 * Represente un compte du reseau social. Contient les informations
 * de profil (nom, bio, photos), les preferences (theme sombre/clair)
 * et la liste d'amis (relation many-to-many implementee par un tableau
 * de references vers d'autres utilisateurs).
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Le nom d'utilisateur est requis"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9._]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points et underscores"]
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Adresse email invalide']
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      select: false, // ne jamais renvoyer le hash par defaut dans les requetes
      validate: {
        // On ne valide la complexite que si le mot de passe vient d'etre defini/modifie.
        // Sans cette verification, une simple mise a jour du profil (bio, nom...) re-validerait
        // le hash bcrypt deja stocke (qui ne respecte evidemment pas le format attendu) et
        // ferait echouer la sauvegarde.
        validator: function (value) {
          if (!this.isModified('password')) return true;
          const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
          return complexityRegex.test(value);
        },
        message:
          'Le mot de passe doit contenir au moins 8 caracteres, avec une majuscule, une minuscule, un chiffre et un caractere special.'
      }
    },
    fullName: {
      type: String,
      required: [true, 'Le nom complet est requis'],
      trim: true,
      maxlength: 60
    },
    bio: {
      type: String,
      default: '',
      maxlength: 250
    },
    profilePicture: {
      type: String,
      default: '' // chemin relatif vers /uploads/profiles/...
    },
    coverPhoto: {
      type: String,
      default: '' // chemin relatif vers /uploads/covers/...
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Marque les comptes de demonstration crees par seed.js. Sert a auto-ajouter
    // ces comptes comme amis de tout nouvel inscrit, pour que son fil d'actualite
    // ne soit jamais vide (voir authController.register).
    isSeedAccount: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  {
    timestamps: true // ajoute createdAt et updatedAt automatiquement
  }
);

// Index texte pour permettre la recherche d'utilisateurs par nom
userSchema.index({ username: 'text', fullName: 'text' });

/**
 * Hook pre-save : on hache le mot de passe avec bcrypt
 * uniquement s'il a ete modifie (evite de re-hacher a chaque update).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare un mot de passe en clair (saisi au login) avec le hash stocke.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Renvoie une version "publique" de l'utilisateur (sans champs sensibles),
 * utilisee pour les reponses API.
 */
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    fullName: this.fullName,
    email: this.email,
    bio: this.bio,
    profilePicture: this.profilePicture,
    coverPhoto: this.coverPhoto,
    friends: this.friends,
    theme: this.theme,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
