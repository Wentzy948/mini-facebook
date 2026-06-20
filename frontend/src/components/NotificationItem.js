import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, UserCheck, Mail } from 'lucide-react';
import Avatar from './Avatar';
import { formatRelativeTime } from '../utils/time';
import { useAuth } from '../context/AuthContext';

/**
 * NotificationItem
 * ----------------
 * Affiche une notification individuelle : avatar de l'expediteur avec une
 * petite icone indiquant le type d'action, un texte descriptif et l'heure.
 *
 * Le lien de destination depend du type :
 *  - friend_request / friend_accept -> profil de la personne / page Amis
 *  - like / comment                 -> mon profil (ou se trouve mon post)
 *  - message                        -> la messagerie, avec cette personne ouverte
 */
const ICONS = {
  like: <Heart size={12} fill="#fff" />,
  comment: <MessageCircle size={12} fill="#fff" />,
  friend_request: <UserPlus size={12} />,
  friend_accept: <UserCheck size={12} />,
  message: <Mail size={12} />
};

const getMessage = (notification) => {
  const name = notification.sender?.fullName || notification.sender?.username || 'Quelqu\'un';

  switch (notification.type) {
    case 'friend_request':
      return <><strong>{name}</strong> vous a envoye une demande d'ami.</>;
    case 'friend_accept':
      return <><strong>{name}</strong> a accepte votre demande d'ami.</>;
    case 'like':
      return <><strong>{name}</strong> a aime votre publication.</>;
    case 'comment':
      return <><strong>{name}</strong> a commente votre publication.</>;
    case 'message':
      return <><strong>{name}</strong> vous a envoye un message.</>;
    default:
      return <><strong>{name}</strong> a interagi avec vous.</>;
  }
};

const getLink = (notification, currentUserId) => {
  switch (notification.type) {
    case 'friend_request':
      return '/friends?tab=requests';
    case 'friend_accept':
      return `/profile/${notification.sender?._id}`;
    case 'like':
    case 'comment':
      return `/profile/${currentUserId}`;
    case 'message':
      return `/messages?with=${notification.sender?._id}`;
    default:
      return '/';
  }
};

const NotificationItem = ({ notification, onClick }) => {
  const { user } = useAuth();

  return (
    <Link
      to={getLink(notification, user?._id)}
      onClick={() => onClick && onClick(notification)}
      className={`notification-item ${notification.read ? '' : 'notification-item--unread'}`}
    >
      <div className="notification-item__icon-wrap">
        <Avatar user={notification.sender} size="md" />
        <span className={`notification-item__icon notification-item__icon--${notification.type}`}>
          {ICONS[notification.type]}
        </span>
      </div>
      <div>
        <div className="notification-item__text">{getMessage(notification)}</div>
        <div className="notification-item__time">{formatRelativeTime(notification.createdAt)}</div>
      </div>
    </Link>
  );
};

export default NotificationItem;
