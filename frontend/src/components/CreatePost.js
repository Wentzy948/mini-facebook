import { useState, useRef } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

/**
 * CreatePost
 * ----------
 * Boite de creation de publication en haut du fil d'actualite.
 *
 * Deux modes :
 *  - "Ferme" (defaut) : un simple bouton-texte qui declenche l'ouverture du formulaire.
 *  - "Ouvert" : un formulaire avec une textarea pour le texte, un apercu du media
 *    selectionne (image OU video), et les boutons d'action (ajouter media / publier).
 *
 * Le type de media (image vs video) est determine cote client a partir du
 * `file.type` (ex: "video/mp4") pour choisir le bon apercu (<img> ou <video>),
 * mais c'est le BACKEND qui fait foi en relisant le mimetype reel du fichier
 * recu (voir postController.createPost) - on ne fait jamais confiance
 * uniquement a l'extension ou au type cote client pour des raisons de securite.
 *
 * A la soumission, le post est envoye via POST /api/posts (multipart/form-data
 * si un media est present, JSON sinon). Le callback `onPostCreated` permet
 * a la page parente d'ajouter le nouveau post en tete du fil sans recharger.
 */
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 Mo, doit matcher MEDIA_SIZE_LIMIT du backend

const CreatePost = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);     // fichier File (image ou video)
  const [mediaKind, setMediaKind] = useState(null);      // 'image' | 'video'
  const [preview, setPreview] = useState(null);          // URL.createObjectURL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Seules les images et les videos sont acceptees.');
      return;
    }
    if (file.size > MAX_MEDIA_SIZE) {
      setError('Le fichier depasse la taille maximale autorisee (50 Mo).');
      return;
    }

    setError('');
    setMediaFile(file);
    setMediaKind(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaKind(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDiscard = () => {
    setOpen(false);
    setContent('');
    handleRemoveMedia();
    setError('');
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      setError('Ecris quelque chose ou ajoute une image/video.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data;

      if (mediaFile) {
        // Envoi multipart/form-data car il y a un fichier
        const formData = new FormData();
        formData.append('content', content.trim());
        formData.append('media', mediaFile);
        const res = await api.post('/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        data = res.data;
      } else {
        const res = await api.post('/posts', { content: content.trim() });
        data = res.data;
      }

      onPostCreated?.(data.post);
      handleDiscard();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la publication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card create-post">
      {/* Mode ferme : simple declencheur */}
      {!open && (
        <div className="create-post__top">
          <Avatar user={user} size="md" />
          <button className="create-post__trigger" onClick={handleOpen}>
            Quoi de neuf, {user?.fullName?.split(' ')[0]} ?
          </button>
        </div>
      )}

      {/* Mode ouvert : formulaire complet */}
      {open && (
        <div className="create-post__form">
          <div className="create-post__top">
            <Avatar user={user} size="md" />
            <strong>{user?.fullName}</strong>
          </div>

          <textarea
            ref={textareaRef}
            style={{
              width: '100%',
              border: 'none',
              resize: 'vertical',
              minHeight: '80px',
              fontSize: '17px',
              background: 'transparent',
              color: 'var(--color-text)',
              outline: 'none',
              fontFamily: 'inherit',
              padding: '10px 0'
            }}
            placeholder={`Quoi de neuf, ${user?.fullName?.split(' ')[0]} ?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
          />

          {/* Apercu du media selectionne (image ou video) */}
          {preview && (
            <div className="create-post__preview">
              {mediaKind === 'video' ? (
                <video src={preview} controls />
              ) : (
                <img src={preview} alt="Apercu" />
              )}
              <button className="create-post__remove-image" onClick={handleRemoveMedia} aria-label="Retirer le media">
                <X size={16} />
              </button>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          <div className="create-post__actions">
            {/* Bouton d'ajout de media (image ou video, un seul input couvrant les deux) */}
            <label className="create-post__image-btn btn" style={{ cursor: 'pointer' }}>
              {mediaKind === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
              <span>Photo/Video</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                aria-label="Ajouter une photo ou une video"
              />
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn--secondary" onClick={handleDiscard} disabled={loading}>
                Annuler
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={loading || (!content.trim() && !mediaFile)}
              >
                {loading ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
