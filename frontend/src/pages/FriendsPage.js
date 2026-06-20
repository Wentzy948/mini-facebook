import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, UserX, Search } from 'lucide-react';
import api from '../api/axios';
import { fileUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

/**
 * Page Amis
 * ---------
 * Trois onglets navigables via le parametre URL `?tab=...` :
 *
 * 1. `friends`  : liste de mes amis actuels, avec bouton "Retirer"
 * 2. `requests` : demandes d'ami recues (avec Accepter / Refuser)
 * 3. `search`   : recherche de nouveaux utilisateurs, avec leurs statuts
 *                 (Ajouter / Demande envoyee / Amis), pre-remplie si
 *                 un parametre `?q=...` est present (venant de la navbar)
 */
const FriendsPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'friends';
  const initialQuery = searchParams.get('q') || '';

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [sentRequestIds, setSentRequestIds] = useState([]); // IDs des users a qui j'ai envoye une demande
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ---- Chargement des donnees selon l'onglet ---- */
  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, sentRes] = await Promise.all([
        api.get('/friends/requests'),
        api.get('/friends/sent')
      ]);
      setRequests(recRes.data.requests);
      setUnreadCount(recRes.data.requests.length);
      setSentRequestIds(sentRes.data.requests.map((r) => r.receiver?._id));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'friends') loadFriends();
    else if (tab === 'requests' || tab === 'search') loadRequests();
  }, [tab, loadFriends, loadRequests]);

  // Lance la recherche si un ?q= est present a l'ouverture de la page
  useEffect(() => {
    if (tab === 'search' && initialQuery) handleSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ---- Recherche d'utilisateurs ---- */
  const handleSearch = async (q) => {
    const query = typeof q === 'string' ? q : searchQuery;
    if (!query.trim()) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(data.users);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ---- Actions amitie ---- */
  const handleSendRequest = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      setSentRequestIds((prev) => [...prev, userId]);
    } catch (e) { alert(e.response?.data?.message || 'Erreur.'); }
  };

  const handleAccept = async (requestId, senderId) => {
    try {
      await api.put(`/friends/accept/${requestId}`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      setFriends((prev) => [...prev, requests.find((r) => r._id === requestId)?.sender].filter(Boolean));
    } catch (e) { alert(e.response?.data?.message || 'Erreur.'); }
  };

  const handleReject = async (requestId) => {
    try {
      await api.delete(`/friends/reject/${requestId}`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (e) { alert(e.response?.data?.message || 'Erreur.'); }
  };

  const handleRemoveFriend = async (userId) => {
    if (!window.confirm('Retirer cet ami ?')) return;
    try {
      await api.delete(`/friends/${userId}`);
      setFriends((prev) => prev.filter((f) => f._id !== userId));
    } catch (e) { alert(e.response?.data?.message || 'Erreur.'); }
  };

  /* ---- Statut d'un utilisateur dans les resultats de recherche ---- */
  const getFriendStatus = (userId) => {
    if (currentUser?.friends?.some((f) => (f._id || f) === userId)) return 'friends';
    if (sentRequestIds.includes(userId)) return 'pending';
    return 'none';
  };

  const goToTab = (t) => setSearchParams({ tab: t });

  return (
    <main className="app-shell">
      <div className="page-container">
        <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 16px' }}>Amis</h1>

        {/* ---- Onglets ---- */}
        <div className="friends-tabs">
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => goToTab('friends')}>
            Mes amis ({friends.length})
          </button>
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => goToTab('requests')}>
            Demandes {unreadCount > 0 && <span style={{ color: 'var(--color-danger)' }}>({unreadCount})</span>}
          </button>
          <button className={tab === 'search' ? 'active' : ''} onClick={() => goToTab('search')}>
            Trouver des amis
          </button>
        </div>

        {/* ======================================
            Onglet : Mes Amis
        ====================================== */}
        {tab === 'friends' && (
          loading ? <div className="spinner" /> :
          friends.length === 0 ? (
            <div className="card empty-state">
              <p>Aucun ami pour l'instant.</p>
              <button className="btn btn--primary" style={{ marginTop: '12px' }} onClick={() => goToTab('search')}>
                <UserPlus size={16} /> Trouver des amis
              </button>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend._id} className="card friend-card">
                  <Link to={`/profile/${friend._id}`}>
                    {friend.profilePicture
                      ? <img src={fileUrl(friend.profilePicture)} alt={friend.fullName} className="friend-card__avatar" />
                      : <div className="friend-card__avatar avatar-placeholder" style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', background: 'var(--color-primary)', color: '#fff', borderRadius: '12px' }}>
                          {(friend.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                    }
                  </Link>
                  <Link to={`/profile/${friend._id}`} className="friend-card__name">{friend.fullName}</Link>
                  <div className="friend-card__actions">
                    <Link to={`/messages?with=${friend._id}`} className="btn btn--primary" style={{ fontSize: '13px', padding: '6px 10px' }}>Message</Link>
                    <button className="btn btn--secondary" style={{ fontSize: '13px', padding: '6px 10px' }} onClick={() => handleRemoveFriend(friend._id)}>
                      <UserX size={14} /> Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ======================================
            Onglet : Demandes d'ami
        ====================================== */}
        {tab === 'requests' && (
          loading ? <div className="spinner" /> :
          requests.length === 0 ? (
            <div className="card empty-state">Aucune demande en attente.</div>
          ) : (
            <div className="friends-grid">
              {requests.map((req) => (
                <div key={req._id} className="card friend-card">
                  <Link to={`/profile/${req.sender._id}`}>
                    <Avatar user={req.sender} size="lg" className="friend-card__avatar" style={{ borderRadius: '12px', width: '100%', height: 'auto', aspectRatio: '1' }} />
                  </Link>
                  <Link to={`/profile/${req.sender._id}`} className="friend-card__name">
                    {req.sender.fullName}
                  </Link>
                  <div className="friend-card__actions">
                    <button className="btn btn--primary" style={{ fontSize: '13px', padding: '6px 10px' }} onClick={() => handleAccept(req._id, req.sender._id)}>
                      <UserCheck size={14} /> Accepter
                    </button>
                    <button className="btn btn--secondary" style={{ fontSize: '13px', padding: '6px 10px' }} onClick={() => handleReject(req._id)}>
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ======================================
            Onglet : Rechercher des amis
        ====================================== */}
        {tab === 'search' && (
          <>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
            >
              <input
                type="text"
                className=""
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '999px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-input-bg)', color: 'var(--color-text)',
                  fontSize: '15px', outline: 'none'
                }}
                placeholder="Rechercher par nom ou @username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn--primary" disabled={loading}>
                <Search size={16} />
              </button>
            </form>

            {loading ? <div className="spinner" /> : (
              searchResults.length === 0 && searchQuery ? (
                <div className="card empty-state">Aucun utilisateur trouve pour "{searchQuery}".</div>
              ) : (
                <div className="friends-grid">
                  {searchResults.map((u) => {
                    const status = getFriendStatus(u._id);
                    return (
                      <div key={u._id} className="card friend-card">
                        <Link to={`/profile/${u._id}`}>
                          {u.profilePicture
                            ? <img src={fileUrl(u.profilePicture)} alt={u.fullName} className="friend-card__avatar" />
                            : <div className="friend-card__avatar avatar-placeholder" style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', background: 'var(--color-primary)', color: '#fff', borderRadius: '12px' }}>
                                {(u.fullName || '?').charAt(0).toUpperCase()}
                              </div>
                          }
                        </Link>
                        <Link to={`/profile/${u._id}`} className="friend-card__name">{u.fullName}</Link>
                        <span className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>@{u.username}</span>
                        <div className="friend-card__actions">
                          {status === 'none' && (
                            <button className="btn btn--primary" style={{ fontSize: '13px' }} onClick={() => handleSendRequest(u._id)}>
                              <UserPlus size={14} /> Ajouter
                            </button>
                          )}
                          {status === 'pending' && (
                            <button className="btn btn--secondary" style={{ fontSize: '13px' }} disabled>
                              Demande envoyee ✓
                            </button>
                          )}
                          {status === 'friends' && (
                            <span className="btn btn--secondary" style={{ fontSize: '13px' }}>
                              <UserCheck size={14} /> Amis
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default FriendsPage;
