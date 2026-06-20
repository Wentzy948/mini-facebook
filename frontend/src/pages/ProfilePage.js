import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Edit2, UserPlus, UserCheck, UserX, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import { fileUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';

/**
 * Page Profil
 * -----------
 * Affiche le profil d'un utilisateur (le sien ou celui d'un autre).
 *
 * Si c'est mon profil :
 *  - Boutons "Modifier le profil" (nom + bio), "Changer la photo de profil",
 *    "Changer la photo de couverture"
 *
 * Si c'est le profil d'un autre :
 *  - Bouton variable selon l'etat de l'amitie :
 *    "Ajouter" / "Demande envoyee" (annuler) / "Amis" (retirer)
 *  - Bouton "Envoyer un message" (redirige vers /messages?with=<userId>)
 *
 * En dessous : liste des publications de l'utilisateur.
 */
const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();

  const isOwnProfile = id === currentUser?._id;

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendStatus, setFriendStatus] = useState('none'); // 'none'|'pending'|'received'|'friends'
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const profilePicRef = useRef(null);
  const coverRef = useRef(null);

  /* ---- Chargement du profil + statut d'amitie ---- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [userRes, postsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/users/${id}/posts`)
        ]);
        setProfileUser(userRes.data.user);
        setPosts(postsRes.data.posts);
        setEditForm({ fullName: userRes.data.user.fullName, bio: userRes.data.user.bio || '' });

        if (!isOwnProfile) {
          // Verifie si on est amis
          if (userRes.data.user.friends?.some((f) => (f._id || f) === currentUser?._id)) {
            setFriendStatus('friends');
          } else {
            // Verifie les demandes en attente (envoyees ET recues)
            const [sentRes, recRes] = await Promise.all([
              api.get('/friends/sent'),
              api.get('/friends/requests')
            ]);
            const sentReq = sentRes.data.requests.find((r) => r.receiver?._id === id);
            const recReq = recRes.data.requests.find((r) => r.sender?._id === id);
            if (sentReq) { setFriendStatus('pending'); setFriendRequestId(sentReq._id); }
            else if (recReq) { setFriendStatus('received'); setFriendRequestId(recReq._id); }
            else setFriendStatus('none');
          }
        }
      } catch (e) {
        console.error('Erreur chargement profil', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isOwnProfile, currentUser?._id]);

  /* ---- Actions sur l'amitie ---- */
  const handleAddFriend = async () => {
    try {
      await api.post(`/friends/request/${id}`);
      setFriendStatus('pending');
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur.');
    }
  };

  const handleCancelRequest = async () => {
    if (!friendRequestId) return;
    try {
      await api.delete(`/friends/reject/${friendRequestId}`);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur.');
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendRequestId) return;
    try {
      await api.put(`/friends/accept/${friendRequestId}`);
      setFriendStatus('friends');
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur.');
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm('Retirer cet ami ?')) return;
    try {
      await api.delete(`/friends/${id}`);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur.');
    }
  };

  /* ---- Modification du profil (nom + bio) ---- */
  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/users/me', editForm);
      setProfileUser(data.user);
      updateUser(data.user);
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Upload photo de profil ---- */
  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.put('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfileUser(data.user);
      updateUser(data.user);
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur upload.');
    }
  };

  /* ---- Upload photo de couverture ---- */
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.put('/users/me/cover-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfileUser(data.user);
      updateUser(data.user);
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur upload.');
    }
  };

  const handleDeletePost = (postId) => setPosts((prev) => prev.filter((p) => p._id !== postId));

  if (loading) return <main className="app-shell"><div className="spinner" /></main>;
  if (!profileUser) return <main className="app-shell"><div className="page-container"><p>Utilisateur introuvable.</p></div></main>;

  const friendsCount = profileUser.friends?.length || 0;

  return (
    <main className="app-shell">
      <div className="page-container page-container--wide">

        {/* ===== En-tete du profil ===== */}
        <div className="card profile-header">
          {/* Photo de couverture */}
          <div style={{ position: 'relative' }}>
            {profileUser.coverPhoto
              ? <img src={fileUrl(profileUser.coverPhoto)} alt="Couverture" className="profile-header__cover" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
              : <div className="profile-header__cover-empty" />
            }
            {isOwnProfile && (
              <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                <label className="btn btn--secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} /> Modifier la couverture
                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={coverRef} onChange={handleCoverChange} />
                </label>
              </div>
            )}
          </div>

          {/* Infos principales */}
          <div className="profile-header__body">
            <div className="profile-header__avatar-wrap">
              <Avatar user={profileUser} size="xl" />
              {isOwnProfile && (
                <label
                  style={{
                    position: 'absolute', bottom: '4px', right: '4px',
                    background: 'var(--color-surface-hover)',
                    borderRadius: '50%', width: '34px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: '2px solid var(--color-surface)'
                  }}
                  title="Changer la photo de profil"
                >
                  <Camera size={16} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={profilePicRef} onChange={handleProfilePicChange} />
                </label>
              )}
            </div>

            {editing ? (
              <div style={{ marginTop: '12px', width: '100%', maxWidth: '420px' }}>
                {error && <div className="error-banner">{error}</div>}
                <div className="field">
                  <label>Nom complet</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    maxLength={60}
                  />
                </div>
                <div className="field">
                  <label>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Parle de toi..."
                    maxLength={250}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn--secondary" onClick={() => setEditing(false)}>Annuler</button>
                  <button className="btn btn--primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="profile-header__name">{profileUser.fullName}</h1>
                <span className="profile-header__username text-muted">@{profileUser.username}</span>
                {profileUser.bio && <p className="profile-header__bio">{profileUser.bio}</p>}
                <p className="text-muted" style={{ marginBottom: '12px' }}>
                  {friendsCount} ami{friendsCount !== 1 ? 's' : ''}
                </p>

                {/* Boutons d'action */}
                <div className="profile-header__actions">
                  {isOwnProfile ? (
                    <button className="btn btn--secondary" onClick={() => setEditing(true)}>
                      <Edit2 size={16} /> Modifier le profil
                    </button>
                  ) : (
                    <>
                      {friendStatus === 'none' && (
                        <button className="btn btn--primary" onClick={handleAddFriend}>
                          <UserPlus size={16} /> Ajouter
                        </button>
                      )}
                      {friendStatus === 'pending' && (
                        <button className="btn btn--secondary" onClick={handleCancelRequest}>
                          Demande envoyee ✓
                        </button>
                      )}
                      {friendStatus === 'received' && (
                        <button className="btn btn--primary" onClick={handleAcceptRequest}>
                          <UserCheck size={16} /> Accepter la demande
                        </button>
                      )}
                      {friendStatus === 'friends' && (
                        <button className="btn btn--secondary" onClick={handleRemoveFriend}>
                          <UserX size={16} /> Amis
                        </button>
                      )}
                      <a className="btn btn--secondary" href={`/messages?with=${id}`}>
                        <MessageCircle size={16} /> Message
                      </a>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== Publications ===== */}
        <div style={{ marginTop: '16px' }}>
          {posts.length === 0 ? (
            <div className="card empty-state">
              <p>Aucune publication pour l'instant.</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={isOwnProfile ? handleDeletePost : undefined}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
