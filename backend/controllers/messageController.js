const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');
const { getIO, getReceiverSocketId } = require('../socket/socketHandler');

const PARTICIPANT_FIELDS = 'username fullName profilePicture';

/**
 * @route   GET /api/messages/conversations
 * @desc    Liste toutes les conversations de l'utilisateur connecte,
 *          triees par activite recente, avec le nombre de messages non lus
 *          pour chacune (affiche en badge dans l'interface).
 * @access  Prive
 */
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1 })
      .populate('participants', PARTICIPANT_FIELDS)
      .populate('lastMessageSender', 'username');

    // Pour chaque conversation, compte les messages non lus envoyes par l'AUTRE personne
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          read: false
        });

        return { ...conv.toObject(), unreadCount };
      })
    );

    return res.json({ conversations: withUnread });
  } catch (error) {
    console.error('Erreur getConversations :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/messages/conversations/:conversationId
 * @desc    Renvoie l'historique des messages d'une conversation et marque
 *          comme lus tous les messages recus par l'utilisateur connecte.
 * @access  Prive
 */
const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Acces non autorise a cette conversation.' });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .populate('sender', PARTICIPANT_FIELDS);

    // Marque comme lus tous les messages que JE n'ai pas envoyes
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, read: false },
      { $set: { read: true } }
    );

    return res.json({ messages });
  } catch (error) {
    console.error('Erreur getMessages :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   POST /api/messages/:recipientId
 * @desc    Envoie un message prive a l'utilisateur :recipientId.
 *          Cree la conversation si elle n'existe pas encore (premier message),
 *          met a jour son resume, cree une notification et pousse le message
 *          en temps reel via Socket.io si le destinataire est connecte.
 * @access  Prive
 */
const sendMessage = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Le message ne peut pas etre vide.' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message a vous-meme.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Destinataire introuvable.' });
    }

    // Cherche une conversation existante entre ces deux utilisateurs, sinon la cree
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 }
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: [req.user._id, recipientId] });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim()
    });

    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessageSender = req.user._id;
    await conversation.save();

    await message.populate('sender', PARTICIPANT_FIELDS);

    await createNotification({ recipient: recipientId, sender: req.user._id, type: 'message' });

    // Push temps reel : si le destinataire est connecte, il recoit le message instantanement
    const io = getIO();
    const socketId = getReceiverSocketId(recipientId);
    if (io && socketId) {
      io.to(socketId).emit('newMessage', { conversationId: conversation._id, message });
    }

    return res.status(201).json({ conversationId: conversation._id, message });
  } catch (error) {
    console.error('Erreur sendMessage :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { getConversations, getMessages, sendMessage };
