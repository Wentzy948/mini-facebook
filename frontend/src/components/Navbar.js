import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, MessageCircle, Bell, Sun, Moon, LogOut, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import Avatar from './Avatar';
import NotificationItem from './NotificationItem';

/**
 * Navbar
 * ------
 * Barre de navigation fixee en haut de l'application. Regroupe :
 *  - une barre de recherche d'utilisateurs (redirige vers /friends?tab=search)
 *  - les liens principaux (Accueil, Amis, Messages, Notifications) avec badges
 *  - le bouton de bascule clair/sombre (ThemeContext)
 *  - le profil et la deconnexion
 *
 * Les compteurs de notifications/messages non lus sont charges au montage
 * puis mis a jour en temps reel via Socket.io (`newNotification`, `newMessage`).
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadNotif(data.unreadCount);
    } catch (error) {
      console.error('Erreur chargement notifications', error);
    }
  }, []);

  const loadUnreadMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      const total = data.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadMessages(total);
    } catch (error) {
      console.error('Erreur chargement conversations', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadUnreadMessages();
  }, [loadNotifications, loadUnreadMessages]);

  // Mises a jour en temps reel via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotif((prev) => prev + 1);
    };

    const handleNewMessage = () => {
      // Si on n'est pas deja sur la page Messages, on incremente le badge.
      // La page Messages se charge elle-meme de remettre les compteurs a jour.
      if (location.pathname !== '/messages') {
        setUnreadMessages((prev) => prev + 1);
      }
    };

    socket.on('newNotification', handleNewNotification);
    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, location.pathname]);

  // Quand on revient sur /messages, on suppose que les messages seront lus -> reset du badge
  useEffect(() => {
    if (location.pathname === '/messages') {
      const timeout = setTimeout(() => loadUnreadMessages(), 800);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, loadUnreadMessages]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/friends?tab=search&q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const toggleNotifDropdown = async () => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);

    if (willOpen && unreadNotif > 0) {
      setUnreadNotif(0);
      try {
        await api.put('/notifications/read-all');
      } catch (error) {
        console.error('Erreur markAllAsRead', error);
      }
      // Laisse l'effet visuel "non lu" un court instant avant de l'estomper
      setTimeout(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }, 2000);
    }
  };

  const navLinkClass = ({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`;

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <NavLink to="/" className="navbar__logo" style={{ fontSize: '20px', letterSpacing: '-0.5px' }}>
          WentzyFace
        </NavLink>
        <form className="navbar__search" onSubmit={handleSearchSubmit} role="search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher des amis"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Rechercher des utilisateurs"
          />
        </form>
      </div>

      <div className="navbar__center">
        <NavLink to="/" className={navLinkClass} end title="Accueil">
          <Home size={24} />
        </NavLink>
        <NavLink to="/friends" className={navLinkClass} title="Amis">
          <Users size={24} />
        </NavLink>
        <NavLink to="/messages" className={navLinkClass} title="Messages">
          <MessageCircle size={24} />
          {unreadMessages > 0 && (
            <span className="navbar__badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
          )}
        </NavLink>
      </div>

      <div className="navbar__right">
        <div className="dropdown">
          <button className="navbar__link" onClick={toggleNotifDropdown} title="Notifications" aria-label="Notifications">
            <Bell size={22} />
            {unreadNotif > 0 && (
              <span className="navbar__badge">{unreadNotif > 9 ? '9+' : unreadNotif}</span>
            )}
          </button>

          {notifOpen && (
            <div className="dropdown__panel">
              <div className="dropdown__header">Notifications</div>
              {notifications.length === 0 ? (
                <div className="empty-state">Aucune notification pour le moment.</div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem key={n._id} notification={n} onClick={() => setNotifOpen(false)} />
                ))
              )}
            </div>
          )}
        </div>

        <button className="btn--icon navbar__link" onClick={toggleTheme} title="Changer de theme" aria-label="Changer de theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <NavLink to={`/profile/${user?._id}`} className="navbar__user-link" title="Mon profil">
          <Avatar user={user} size="sm" />
        </NavLink>

        <button className="btn--icon navbar__link" onClick={logout} title="Se deconnecter" aria-label="Se deconnecter">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
