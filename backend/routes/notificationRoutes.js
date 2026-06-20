const express = require('express');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/notifications -> mes notifications + nombre non lues
router.get('/', getNotifications);

// PUT /api/notifications/read-all -> tout marquer comme lu
// ⚠️ DOIT etre avant /:id/read pour eviter qu'Express capture "read-all" comme un :id
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:id/read -> marquer une notification specifique comme lue
router.put('/:id/read', markAsRead);

module.exports = router;
