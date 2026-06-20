import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { fileUrl } from '../api/axios';
import api from '../api/axios';
import { formatRelativeTime } from '../utils/time';
import Avatar from './Avatar';

/**
 * StoryViewer
 * -----------
 * Visionneuse plein ecran d'un groupe de stories (toutes les stories d'un auteur).
 *
 * Fonctionnement :
 *  - Une barre de progression par story, animee sur 5 secondes (CSS animation)
 *  - Avance automatiquement a la story suivante a la fin de l'animation
 *  - Clic gauche sur la zone gauche = story precedente, clic droite = suivante
 *  - Ferme la visionneuse a la derniere story du groupe
 *  - Appelle PUT /api/stories/:id/view pour enregistrer la vue cote serveur
 *
 * Props :
 *  - group  : { author, stories: [...] }
 *  - onClose: callback quand on quitte
 */
const STORY_DURATION = 5000; // ms par story

const StoryViewer = ({ group, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const story = group.stories[currentIndex];

  // Marque la story comme vue cote serveur
  useEffect(() => {
    api.put(`/stories/${story._id}/view`).catch(() => {});
  }, [story._id]);

  // Avancement automatique toutes les 5 secondes
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION);

    return () => clearTimeout(timerRef.current);
  });

  const goNext = () => {
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    clearTimeout(timerRef.current);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="story-viewer-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="story-viewer">

        {/* Barres de progression */}
        <div className="story-viewer__progress">
          {group.stories.map((s, i) => (
            <div key={s._id} className="story-viewer__progress-segment">
              <div
                className={`story-viewer__progress-fill ${i < currentIndex ? 'story-viewer__progress-fill--done' : ''}`}
                style={
                  i === currentIndex
                    ? { animationDuration: `${STORY_DURATION}ms` }
                    : {}
                }
              />
            </div>
          ))}
        </div>

        {/* En-tete (avatar + nom + heure) */}
        <div className="story-viewer__header">
          <Avatar user={group.author} size="sm" />
          <div>
            <div className="story-viewer__header-name">
              {group.author.fullName || group.author.username}
            </div>
            <div className="story-viewer__header-time">
              {formatRelativeTime(story.createdAt)}
            </div>
          </div>
          <button className="story-viewer__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Contenu : image ou texte colore */}
        <div className="story-viewer__content">
          {story.image ? (
            <img src={fileUrl(story.image)} alt="Story" />
          ) : (
            <div
              className="story-viewer__text-slide"
              style={{ backgroundColor: story.backgroundColor }}
            >
              {story.text}
            </div>
          )}
        </div>

        {/* Zones cliquables navigation */}
        <button
          className="story-viewer__nav story-viewer__nav--prev"
          onClick={goPrev}
          aria-label="Story précédente"
        />
        <button
          className="story-viewer__nav story-viewer__nav--next"
          onClick={goNext}
          aria-label="Story suivante"
        />

        {/* Compteur de vues (visible pour l'auteur uniquement si on le souhaite) */}
        <div className="story-viewer__viewers" ref={progressRef}>
          👁 {story.viewers?.length || 0} vue{story.viewers?.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
