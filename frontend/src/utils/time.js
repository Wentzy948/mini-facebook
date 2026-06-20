/**
 * Formate une date en temps relatif, a la maniere de Facebook :
 * "a l'instant", "5 min", "3 h", "2 j", puis une date complete
 * au-dela d'une semaine.
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "a l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHour < 24) return `${diffHour} h`;
  if (diffDay < 7) return `${diffDay} j`;

  return then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Formate une date en heure courte (ex: 14:32), utilise pour les bulles de messages. */
export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
