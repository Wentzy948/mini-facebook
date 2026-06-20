const mongoose = require('mongoose');

/**
 * Modele Story
 * ------------
 * Une story est une publication ephemere (image ou texte) qui disparait
 * automatiquement 24h apres sa creation.
 *
 * On utilise un INDEX TTL ("Time To Live") MongoDB sur le champ `expiresAt` :
 * un processus interne de MongoDB supprime automatiquement le document
 * dès que `expiresAt` est depasse, sans qu'on ait besoin d'un cron job.
 */
const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    image: {
      type: String,
      default: '' // chemin relatif vers /uploads/stories/...
    },
    text: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    // Couleur de fond utilisee quand la story est uniquement textuelle
    backgroundColor: {
      type: String,
      default: '#1877F2'
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h
    }
  },
  { timestamps: true }
);

// Index TTL : MongoDB supprime le document quand expiresAt est atteint (expireAfterSeconds: 0
// signifie "supprimer exactement a la date indiquee par expiresAt")
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
