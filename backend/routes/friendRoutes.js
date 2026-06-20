const express = require('express');
const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  getFriends,
  getReceivedRequests,
  getSentRequests
} = require('../controllers/friendController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/friends -> ma liste d'amis
router.get('/', getFriends);

// GET /api/friends/requests -> demandes recues en attente
router.get('/requests', getReceivedRequests);

// GET /api/friends/sent -> demandes envoyees en attente
router.get('/sent', getSentRequests);

// POST /api/friends/request/:userId -> envoyer une demande d'ami
router.post('/request/:userId', sendRequest);

// PUT /api/friends/accept/:requestId -> accepter une demande recue
router.put('/accept/:requestId', acceptRequest);

// DELETE /api/friends/reject/:requestId -> refuser/annuler une demande
router.delete('/reject/:requestId', rejectRequest);

// DELETE /api/friends/:userId -> retirer un ami
router.delete('/:userId', removeFriend);

module.exports = router;
