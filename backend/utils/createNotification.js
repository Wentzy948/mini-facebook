const Notification = require('../models/Notification');
const { getIO, getReceiverSocketId } = require('../socket/socketHandler');

/**
 * Cree une notification en base ET la pousse en temps reel via Socket.io
 * si le destinataire est actuellement connecte.
 *
 * Utilise par : friendController (demande/acceptation d'ami),
 * postController (like, commentaire), messageController (nouveau message).
 *
 * @param {Object} params
 * @param {ObjectId|string} params.recipient - utilisateur qui recoit la notification
 * @param {ObjectId|string} params.sender - utilisateur qui a declenche l'action
 * @param {'friend_request'|'friend_accept'|'like'|'comment'|'message'} params.type
 * @param {ObjectId|string} [params.post] - post concerne (pour like/comment)
 */
const createNotification = async ({ recipient, sender, type, post = null }) => {
  // On ne notifie jamais une action que l'utilisateur a faite sur lui-meme
  if (recipient.toString() === sender.toString()) return null;

  const notification = await Notification.create({ recipient, sender, type, post });

  const populated = await notification.populate(
    'sender',
    'username fullName profilePicture'
  );

  const io = getIO();
  const socketId = getReceiverSocketId(recipient);
  if (io && socketId) {
    io.to(socketId).emit('newNotification', populated);
  }

  return populated;
};

module.exports = createNotification;
