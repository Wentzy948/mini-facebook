import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/Avatar';
import { formatTime } from '../utils/time';

/**
 * Page Messagerie
 * ---------------
 * Mise en page deux colonnes :
 *  - Gauche : liste des conversations (chat-list)
 *  - Droite : fenetre de chat active (chat-window)
 *
 * Comportement :
 *  - Si l'URL contient `?with=<userId>`, on ouvre ou cree automatiquement
 *    la conversation avec cet utilisateur (vient du bouton "Message" du profil).
 *  - Les messages arrivent en temps reel via Socket.io (evenement `newMessage`).
 *  - L'indicateur "en train d'ecrire..." est envoye via Socket.io (evenements
 *    `typing` / `stopTyping`) et affiche dans la fenetre de l'autre utilisateur.
 *  - Sur mobile (< 800 px), on affiche soit la liste, soit le chat (pas les deux).
 */
const MessagesPage = () => {
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);      // l'autre cote ecrit-il ?
  const [showChat, setShowChat] = useState(false);       // mobile : afficher la colonne de droite

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  /* ---- Utilitaire : recupere le participant "autre" d'une conversation ---- */
  const getOtherParticipant = useCallback((conv) => {
    return conv.participants?.find((p) => (p._id || p) !== currentUser?._id);
  }, [currentUser?._id]);

  /* ---- Chargement de la liste des conversations ---- */
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations);
      return data.conversations;
    } catch (e) { console.error(e); return []; }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ---- Si ?with=userId, ouvre ou cree la conversation ---- */
  useEffect(() => {
    if (!withUserId || loadingConvs || conversations === null) return;

    const existing = conversations.find((c) =>
      c.participants?.some((p) => (p._id || p) === withUserId)
    );

    if (existing) {
      openConversation(existing._id);
    } else {
      // Pas encore de conversation : on ouvre un "brouillon" en envoyant un
      // premier message vide fictif non. On garde juste la reference de l'utilisateur
      // et on cree la conversation lors du premier vrai envoi via sendMessage.
      setActiveConvId(`__new__${withUserId}`);
      setMessages([]);
      setShowChat(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId, loadingConvs]);

  /* ---- Ouverture d'une conversation ---- */
  const openConversation = async (convId) => {
    setActiveConvId(convId);
    setShowChat(true);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/messages/conversations/${convId}`);
      setMessages(data.messages);
      // Met a jour le compteur non lus dans la liste
      setConversations((prev) =>
        prev.map((c) => c._id === convId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (e) { console.error(e); }
    finally { setLoadingMessages(false); }
  };

  /* ---- Scroll automatique vers le bas a chaque nouveau message ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---- Socket.io : reception de messages et indicateur de saisie ---- */
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      if (conversationId === activeConvId) {
        setMessages((prev) => [...prev, message]);
        setIsTyping(false);
      }
      // Mise a jour du dernier message dans la liste
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message.text, lastMessageAt: message.createdAt }
            : c
        )
      );
    };

    const handleTyping = ({ conversationId }) => {
      if (conversationId === activeConvId) setIsTyping(true);
    };

    const handleStopTyping = ({ conversationId }) => {
      if (conversationId === activeConvId) setIsTyping(false);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, activeConvId]);

  /* ---- Envoi de message ---- */
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');

    let recipientId = null;

    // Si la conversation est "nouvelle" (pas encore cree cote serveur)
    if (activeConvId?.startsWith('__new__')) {
      recipientId = activeConvId.replace('__new__', '');
    } else {
      const conv = conversations.find((c) => c._id === activeConvId);
      const other = getOtherParticipant(conv || {});
      recipientId = other?._id || other;
    }

    if (!recipientId) { setSending(false); return; }

    try {
      const { data } = await api.post(`/messages/${recipientId}`, { text: trimmed });

      // Si c'etait une nouvelle conversation, on met a jour l'id
      if (activeConvId?.startsWith('__new__')) {
        setActiveConvId(data.conversationId);
        await loadConversations();
      }

      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      console.error('Erreur envoi message', e);
    } finally {
      setSending(false);
    }
  };

  /* ---- Indicateur de saisie (emit Socket.io) ---- */
  const handleTextChange = (e) => {
    setText(e.target.value);

    if (!socket || !activeConvId || activeConvId.startsWith('__new__')) return;

    const conv = conversations.find((c) => c._id === activeConvId);
    const other = getOtherParticipant(conv || {});
    const recipientId = other?._id || other;

    if (recipientId) {
      socket.emit('typing', { recipientId, conversationId: activeConvId });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { recipientId, conversationId: activeConvId });
      }, 1500);
    }
  };

  /* ---- Donnees de la conversation active ---- */
  const activeConv = conversations.find((c) => c._id === activeConvId);
  const otherUser = activeConv ? getOtherParticipant(activeConv) : null;
  const isOnline = onlineUsers.includes(otherUser?._id);

  return (
    <main className="app-shell">
      <div className="messages-layout">

        {/* ======================================
            Colonne gauche : liste des conversations
        ====================================== */}
        <aside className={`chat-list ${showChat ? 'chat-list--hidden' : ''}`}>
          <div className="chat-list__header">Messages</div>

          {loadingConvs ? (
            <div className="spinner" />
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              Aucune conversation. Envoie un message a un ami !
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isActive = conv._id === activeConvId;
              const hasUnread = conv.unreadCount > 0;
              const isOtherOnline = onlineUsers.includes(other?._id);

              return (
                <button
                  key={conv._id}
                  className={`chat-list-item ${isActive ? 'chat-list-item--active' : ''} ${hasUnread ? 'chat-list-item--unread' : ''}`}
                  onClick={() => openConversation(conv._id)}
                >
                  <div className="chat-list-item__avatar-wrap">
                    <Avatar user={other} size="md" />
                    {isOtherOnline && <span className="online-dot" />}
                  </div>
                  <div className="chat-list-item__info">
                    <div className="chat-list-item__name">{other?.fullName}</div>
                    <div className="chat-list-item__preview">
                      {conv.lastMessage || 'Demarrer une conversation'}
                    </div>
                  </div>
                  {hasUnread && (
                    <span className="chat-list-item__badge">{conv.unreadCount}</span>
                  )}
                </button>
              );
            })
          )}
        </aside>

        {/* ======================================
            Colonne droite : fenetre de chat
        ====================================== */}
        <section className={`chat-window ${!showChat ? 'chat-window--hidden' : ''}`}>
          {!activeConvId ? (
            /* Etat vide (aucune conversation selectionnee) */
            <div className="empty-state" style={{ margin: 'auto' }}>
              <p style={{ fontSize: '32px' }}>💬</p>
              <p>Selectionne une conversation ou envoie un message a un ami.</p>
            </div>
          ) : (
            <>
              {/* En-tete du chat */}
              <div className="chat-window__header">
                <button
                  className="btn--icon btn chat-back-btn"
                  onClick={() => setShowChat(false)}
                  aria-label="Retour a la liste"
                >
                  <ArrowLeft size={20} />
                </button>
                {otherUser && <Avatar user={otherUser} size="sm" />}
                <div>
                  <div className="chat-window__title">{otherUser?.fullName || '...'}</div>
                  <div className="chat-window__status">
                    {isOnline ? '🟢 En ligne' : 'Hors ligne'}
                  </div>
                </div>
              </div>

              {/* Corps : messages */}
              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="spinner" />
                ) : messages.length === 0 ? (
                  <div className="empty-state">Aucun message. Dis bonjour !</div>
                ) : (
                  messages.map((msg) => {
                    const isMine = (msg.sender?._id || msg.sender) === currentUser?._id;
                    return (
                      <div key={msg._id}>
                        <div className={`message-row ${isMine ? 'message-row--mine' : ''}`}>
                          {!isMine && <Avatar user={msg.sender} size="sm" style={{ flexShrink: 0 }} />}
                          <div className={`message-bubble ${isMine ? 'message-bubble--mine' : ''}`}>
                            {msg.text}
                          </div>
                        </div>
                        <div className={`message-time ${isMine ? 'message-time--mine' : ''}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    );
                  })
                )}
                {isTyping && <div className="typing-indicator">En train d'ecrire...</div>}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire de saisie */}
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Aa"
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending}
                  maxLength={2000}
                  aria-label="Ecrire un message"
                />
                <button onClick={handleSend} disabled={!text.trim() || sending} aria-label="Envoyer">
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default MessagesPage;
