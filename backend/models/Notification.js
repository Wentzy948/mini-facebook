const mongoose = require('mongoose');

/**
 * Modele Notification
 * -------------------
 * Centralise toutes les notifications recues par un utilisateur :
 * demandes d'ami, acceptations, likes, commentaires et messages.
 *
 * Le champ `type` permet au frontend de choisir l'icone et le texte
 * a afficher, et le champ `link` indique vers quelle page rediriger
 * l'utilisateur lorsqu'il clique sur la notification.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['friend_request', 'friend_accept', 'like', 'comment', 'message'],
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
