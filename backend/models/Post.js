const mongoose = require('mongoose');

/**
 * Sous-document Commentaire
 * -------------------------
 * Les commentaires sont stockes directement dans le tableau `comments`
 * du post (embedding MongoDB). C'est pertinent ici car :
 *  - on affiche toujours les commentaires avec leur post (pas d'acces independant)
 *  - leur nombre par post reste raisonnable pour un mini reseau social
 */
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

/**
 * Modele Publication (Post)
 * -------------------------
 * Une publication appartient a un auteur, contient un texte et/ou un media
 * (image OU video), une liste de "likes" (references vers les utilisateurs
 * ayant aime) et une liste de commentaires embarques.
 */
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },
    media: {
      url: {
        type: String,
        default: '' // chemin relatif vers /uploads/posts/...
      },
      type: {
        type: String,
        enum: ['image', 'video', null],
        default: null
      }
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    comments: [commentSchema]
  },
  { timestamps: true }
);

// Validation : un post doit avoir au moins un texte OU un media (image/video)
postSchema.pre('validate', function (next) {
  if (!this.content && !this.media?.url) {
    return next(new Error('Une publication doit contenir du texte, une image ou une video.'));
  }
  next();
});

// ---------------------------------------------------------------------------
// INDEX MONGODB — critiques pour les performances
// ---------------------------------------------------------------------------

// Index composé principal : couvre la requete getFeed
//   Post.find({ author: { $in: [...amis] } }).sort({ createdAt: -1 })
// Sans cet index, MongoDB fait un "collection scan" complet a chaque
// chargement du fil d'actualite → temps O(n) au lieu de O(log n).
postSchema.index({ author: 1, createdAt: -1 });

// Index sur les likes : permet de compter rapidement et d'eviter
// de charger tout le tableau de likes en memoire pour verifier un like.
postSchema.index({ likes: 1 });

module.exports = mongoose.model('Post', postSchema);
