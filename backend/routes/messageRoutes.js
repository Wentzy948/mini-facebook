const express = require('express');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/messages/conversations -> liste de mes conversations
router.get('/conversations', getConversations);

// GET /api/messages/conversations/:conversationId -> historique d'une conversation
router.get('/conversations/:conversationId', getMessages);

// POST /api/messages/:recipientId -> envoyer un message a un utilisateur
router.post('/:recipientId', sendMessage);

module.exports = router;
