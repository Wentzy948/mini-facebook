const mongoose = require('mongoose');

/**
 * Modele Message
 * --------------
 * Un message individuel envoye dans une conversation. Chaque message
 * reference la conversation a laquelle il appartient (clé etrangere)
 * ainsi que son expediteur.
 */
const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Pour charger rapidement l'historique d'une conversation, trie par date
messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
