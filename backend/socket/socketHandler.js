const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Gestion de Socket.io (communication temps reel)
 * ------------------------------------------------
 * Ce module centralise tout ce qui concerne les WebSockets :
 *  - authentification du socket via le token JWT (meme token que l'API REST)
 *  - association userId <-> socketId pour pouvoir cibler un utilisateur precis
 *  - diffusion de la liste des utilisateurs en ligne
 *  - indicateurs "en train d'ecrire..." pour la messagerie
 *
 * Les controleurs (messages, notifications) utilisent `getIO()` et
 * `getReceiverSocketId()` pour emettre des evenements vers un utilisateur
 * specifique sans avoir besoin d'importer Socket.io directement.
 */

let io = null;

// Associe chaque utilisateur connecte a l'id de son socket courant
// (un utilisateur peut etre connecte sur un seul onglet a la fois dans cette version simple)
const userSocketMap = {};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Middleware d'authentification : le frontend envoie le token JWT
  // via `socket.handshake.auth.token` lors de la connexion.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentification requise'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;
    console.log(`Socket connecte : utilisateur ${userId} (${socket.id})`);

    // Informe tout le monde de la liste des utilisateurs actuellement en ligne
    io.emit('onlineUsers', Object.keys(userSocketMap));

    // --- Indicateurs de saisie dans la messagerie ---
    socket.on('typing', ({ recipientId, conversationId }) => {
      const targetSocketId = userSocketMap[recipientId];
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing', { conversationId, senderId: userId });
      }
    });

    socket.on('stopTyping', ({ recipientId, conversationId }) => {
      const targetSocketId = userSocketMap[recipientId];
      if (targetSocketId) {
        io.to(targetSocketId).emit('stopTyping', { conversationId, senderId: userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket deconnecte : utilisateur ${userId}`);
      delete userSocketMap[userId];
      io.emit('onlineUsers', Object.keys(userSocketMap));
    });
  });

  return io;
};

/** Renvoie l'instance Socket.io active (pour emettre depuis les controleurs). */
const getIO = () => io;

/** Renvoie l'id de socket d'un utilisateur, ou undefined s'il n'est pas connecte. */
const getReceiverSocketId = (userId) => userSocketMap[userId ? userId.toString() : userId];

module.exports = { initSocket, getIO, getReceiverSocketId };
