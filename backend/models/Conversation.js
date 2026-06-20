const mongoose = require('mongoose');

/**
 * Modele Conversation
 * -------------------
 * Represente un fil de discussion entre deux utilisateurs (messagerie privee 1-a-1).
 * On stocke un resume du dernier message pour pouvoir afficher rapidement
 * la liste des conversations sans avoir a interroger la collection `Message`.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Index pour retrouver rapidement les conversations d'un utilisateur, triees par activite
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
