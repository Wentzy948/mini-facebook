const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');

/**
 * @route   POST /api/friends/request/:userId
 * @desc    Envoie une demande d'ami a l'utilisateur :userId
 * @access  Prive
 *
 * Verifications effectuees :
 *  - on ne peut pas s'envoyer une demande a soi-meme
 *  - le destinataire doit exister
 *  - on ne peut pas etre deja amis
 *  - il ne doit pas exister deja une demande en attente (dans un sens ou l'autre)
 */
const sendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (userId === senderId.toString()) {
      return res.status(400).json({ message: 'Tu ne peux pas t\'envoyer une demande a toi-meme.' });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (req.user.friends.some((f) => f.toString() === userId)) {
      return res.status(400).json({ message: 'Vous etes deja amis.' });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: userId },
        { sender: userId, receiver: senderId }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'Une demande est deja en attente entre vous deux.' });
    }

    const request = await FriendRequest.create({ sender: senderId, receiver: userId });

    await createNotification({ recipient: userId, sender: senderId, type: 'friend_request' });

    return res.status(201).json({ request });
  } catch (error) {
    console.error('Erreur sendRequest :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/friends/accept/:requestId
 * @desc    Accepte une demande d'ami recue : ajoute chaque utilisateur
 *          a la liste d'amis de l'autre, puis supprime la demande.
 * @access  Prive
 */
const acceptRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Demande introuvable.' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous ne pouvez pas accepter cette demande.' });
    }

    // Ajoute chaque utilisateur dans la liste d'amis de l'autre (relation symetrique)
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    await createNotification({
      recipient: request.sender,
      sender: request.receiver,
      type: 'friend_accept'
    });

    await request.deleteOne();

    return res.json({ message: 'Demande acceptee.' });
  } catch (error) {
    console.error('Erreur acceptRequest :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   DELETE /api/friends/reject/:requestId
 * @desc    Refuse une demande d'ami recue (ou annule une demande envoyee
 *          si c'est l'expediteur qui appelle cette route)
 * @access  Prive
 */
const rejectRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Demande introuvable.' });
    }

    const isReceiver = request.receiver.toString() === req.user._id.toString();
    const isSender = request.sender.toString() === req.user._id.toString();

    if (!isReceiver && !isSender) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    await request.deleteOne();

    return res.json({ message: 'Demande supprimee.' });
  } catch (error) {
    console.error('Erreur rejectRequest :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   DELETE /api/friends/:userId
 * @desc    Retire un ami de la liste d'amis (dans les deux sens)
 * @access  Prive
 */
const removeFriend = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { friends: req.user._id } });

    // Nettoyage : supprime toute demande residuelle entre les deux utilisateurs
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    });

    return res.json({ message: 'Ami retire.' });
  } catch (error) {
    console.error('Erreur removeFriend :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/friends
 * @desc    Renvoie la liste d'amis de l'utilisateur connecte (infos publiques)
 * @access  Prive
 */
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'friends',
      'username fullName profilePicture'
    );

    return res.json({ friends: user.friends });
  } catch (error) {
    console.error('Erreur getFriends :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/friends/requests
 * @desc    Renvoie les demandes d'ami RECUES (en attente) par l'utilisateur connecte
 * @access  Prive
 */
const getReceivedRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user._id, status: 'pending' })
      .populate('sender', 'username fullName profilePicture')
      .sort({ createdAt: -1 });

    return res.json({ requests });
  } catch (error) {
    console.error('Erreur getReceivedRequests :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/friends/sent
 * @desc    Renvoie les demandes d'ami ENVOYEES (en attente) par l'utilisateur connecte
 *          -> permet a l'interface d'afficher "Demande envoyee" au lieu de "Ajouter"
 * @access  Prive
 */
const getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ sender: req.user._id, status: 'pending' })
      .populate('receiver', 'username fullName profilePicture')
      .sort({ createdAt: -1 });

    return res.json({ requests });
  } catch (error) {
    console.error('Erreur getSentRequests :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  getFriends,
  getReceivedRequests,
  getSentRequests
};
