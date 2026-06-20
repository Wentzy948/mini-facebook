import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/axios';
import { useAuth } from './AuthContext';

/**
 * SocketContext
 * -------------
 * Ouvre UNE connexion Socket.io partagee par toute l'application, uniquement
 * lorsque l'utilisateur est authentifie (le token JWT est envoye lors du
 * "handshake" pour que le serveur sache qui se connecte, cf. backend/socket/socketHandler.js).
 *
 * Expose :
 *  - `socket`      : l'instance socket.io-client (peut etre null si non connecte)
 *  - `onlineUsers` : tableau des IDs des utilisateurs actuellement en ligne
 *                    (utilise pour afficher le petit point vert dans la messagerie)
 */
const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Pas de token = pas d'utilisateur connecte => pas de socket
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_URL, {
      auth: { token }
    });

    newSocket.on('onlineUsers', (users) => setOnlineUsers(users));

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
