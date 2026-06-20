import { useState, useEffect } from 'react';
import api from '../api/axios';
import { fileUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

/**
 * StoryBar
 * --------
 * Bandeau horizontal de stories en haut du fil d'actualite.
 * Chaque vignette = un groupe (auteur + toutes ses stories actives).
 * - La vignette "Creer" est toujours en premier.
 * - Cliquer sur un groupe ouvre StoryViewer (plein ecran).
 */
const StoryBar = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadStories = async () => {
    try {
      const { data } = await api.get('/stories');
      setStoryGroups(data.groups);
    } catch (e) {
      console.error('Erreur chargement stories', e);
    }
  };

  useEffect(() => { loadStories(); }, []);

  const openStory = (index) => {
    setViewerIndex(index);
    const first = storyGroups[index]?.stories?.[0];
    if (first) api.put(`/stories/${first._id}/view`).catch(() => {});
  };

  return (
    <>
      <div className="story-bar" aria-label="Stories">
        {/* Vignette Creer */}
        <button className="story-card story-card--add" onClick={() => setShowCreate(true)} aria-label="Creer une story">
          <div
            className="story-card__top"
            style={user?.profilePicture ? { backgroundImage: `url(${fileUrl(user.profilePicture)})` } : {}}
          />
          <span className="story-card__plus">+</span>
          <span className="story-card__name">Creer une story</span>
        </button>

        {/* Vignettes stories */}
        {storyGroups.map((group, index) => {
          const first = group.stories[0];
          const isMine = group.author._id === user?._id;
          return (
            <button
              key={group.author._id}
              className="story-card"
              onClick={() => openStory(index)}
              aria-label={`Story de ${group.author.fullName}`}
              style={{
                backgroundImage: first.image ? `url(${fileUrl(first.image)})` : 'none',
                backgroundColor: !first.image ? (first.backgroundColor || '#1877F2') : undefined
              }}
            >
              <div className="story-card__overlay" />
              <img
                className="story-card__avatar"
                src={group.author.profilePicture
                  ? fileUrl(group.author.profilePicture)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(group.author.fullName)}&background=1877F2&color=fff`}
                alt={group.author.fullName}
              />
              {!first.image && first.text && (
                <span className="story-card__text">{first.text.slice(0, 40)}</span>
              )}
              <span className="story-card__name">{isMine ? 'Ma story' : group.author.fullName.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {viewerIndex !== null && (
        <StoryViewer groups={storyGroups} initialGroupIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
      {showCreate && (
        <CreateStoryModal onCreated={() => { setShowCreate(false); loadStories(); }} onClose={() => setShowCreate(false)} />
      )}
    </>
  );
};

export default StoryBar;
