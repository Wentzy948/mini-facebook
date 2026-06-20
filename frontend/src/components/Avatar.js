import { fileUrl } from '../api/axios';

/**
 * Avatar
 * ------
 * Affiche la photo de profil d'un utilisateur, ou a defaut ses initiales
 * sur un fond colore (genere a partir de son nom). Utilise partout
 * (navbar, posts, commentaires, listes d'amis, messagerie...).
 *
 * Props :
 *  - user : { fullName, username, profilePicture }
 *  - size : 'sm' | 'md' | 'lg' | 'xl'
 */
const SIZE_CLASS = {
  sm: 'avatar--sm',
  md: 'avatar--md',
  lg: 'avatar--lg',
  xl: 'avatar--xl'
};

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;
  const name = user?.fullName || user?.username || '?';

  if (user?.profilePicture) {
    return (
      <img
        src={fileUrl(user.profilePicture)}
        alt={name}
        className={`avatar ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div className={`avatar avatar-placeholder ${sizeClass} ${className}`}>
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
