const mongoose = require('mongoose');

/**
 * Modele Demande d'ami
 * --------------------
 * Represente une demande d'amitie envoyee d'un utilisateur a un autre.
 * Le statut permet de suivre le cycle de vie : en attente -> acceptee/refusee.
 * Une fois acceptee, les deux utilisateurs sont ajoutes mutuellement
 * dans leur tableau `friends` (cf. friendController).
 */
const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Un utilisateur ne peut pas envoyer deux fois une demande en attente a la meme personne
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
