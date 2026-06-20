const Notification = require('../models/Notification');

/**
 * @route   GET /api/notifications
 * @desc    Renvoie les 30 dernieres notifications de l'utilisateur connecte
 *          ainsi que le nombre total de notifications non lues (pour le badge
 *          de la cloche dans la barre de navigation).
 * @access  Prive
 */
const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('sender', 'username fullName profilePicture')
        .populate('post', 'content image'),
      Notification.countDocuments({ recipient: req.user._id, read: false })
    ]);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Erreur getNotifications :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Marque une notification specifique comme lue
 * @access  Prive
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification introuvable.' });
    }

    notification.read = true;
    await notification.save();

    return res.json({ notification });
  } catch (error) {
    console.error('Erreur markAsRead :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Marque TOUTES les notifications de l'utilisateur connecte comme lues
 *          (appele quand l'utilisateur ouvre le panneau de notifications)
 * @access  Prive
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.json({ message: 'Toutes les notifications ont ete marquees comme lues.' });
  } catch (error) {
    console.error('Erreur markAllAsRead :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
