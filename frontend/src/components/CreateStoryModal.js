import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

/**
 * CreateStoryModal
 * ----------------
 * Modal de creation d'une story : l'utilisateur peut soit uploader une image,
 * soit ecrire du texte sur un fond colore. Une seule des deux options est
 * active a la fois (l'ajout d'une image retire le texte et vice-versa).
 *
 * Apres soumission, le callback `onCreated` est appele pour que StoryBar
 * recharge la liste des stories et ferme le modal.
 */
const BG_COLORS = [
  '#1877F2', '#E41E3F', '#31A24C', '#F7A400',
  '#a32cc4', '#000000', '#FF6600', '#007E8A'
];

const CreateStoryModal = ({ onCreated, onClose }) => {
  const [mode, setMode] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setMode('image');
    setText('');
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) {
      setError('Ajoute un texte ou une image.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (image) {
        formData.append('image', image);
      } else {
        formData.append('text', text.trim());
        formData.append('backgroundColor', bgColor);
      }

      await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
        {/* En-tete */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Creer une story</h2>
          <button className="btn--icon btn" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        {/* Onglets Image / Texte */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn ${mode === 'image' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={16} /> Photo
          </button>
          <button
            className={`btn ${mode === 'text' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => { setMode('text'); setImage(null); setPreview(null); }}
          >
            Texte
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />

        {/* Apercu / Editeur */}
        {mode === 'image' && preview ? (
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <img src={preview} alt="Apercu story" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover' }} />
          </div>
        ) : (
          <div
            style={{
              background: bgColor,
              borderRadius: '12px',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              padding: '16px'
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ecris quelque chose..."
              maxLength={200}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                width: '100%',
                resize: 'none',
                minHeight: '120px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}

        {/* Palette de couleurs (mode texte) */}
        {mode === 'text' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {BG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: c,
                  border: bgColor === c ? '3px solid var(--color-text)' : '2px solid transparent',
                  cursor: 'pointer'
                }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <button
          className="btn btn--primary btn--block"
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !image)}
        >
          {loading ? 'Publication...' : 'Partager la story'}
        </button>
      </div>
    </div>
  );
};

export default CreateStoryModal;
