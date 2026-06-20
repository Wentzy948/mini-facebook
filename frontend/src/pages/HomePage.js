import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import StoryBar from '../components/StoryBar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';

/**
 * Page Accueil – Fil d'actualite
 * --------------------------------
 * Structure :
 *  1. StoryBar   : bandeau de stories en haut
 *  2. CreatePost : boite de creation de publication
 *  3. Liste de PostCard : publications de l'utilisateur et de ses amis,
 *     chargees par page de 10 (pagination infinie via IntersectionObserver)
 *
 * Gestion du fil :
 *  - `onPostCreated` : ajoute le nouveau post en tete du fil (mise a jour optimiste)
 *  - `onDeletePost`  : retire le post supprime du fil
 *  - Quand le sentinel (div vide en bas) entre dans le viewport, on charge
 *    la page suivante → simulation d'un "infinite scroll".
 */
const LIMIT = 10;

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const sentinelRef = useRef(null);

  const loadPosts = useCallback(async (pageNum) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/posts/feed?page=${pageNum}&limit=${LIMIT}`);
      setPosts((prev) => pageNum === 1 ? data.posts : [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Erreur chargement fil', error);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [loading]);

  // Chargement initial
  useEffect(() => {
    loadPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver pour l'infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPosts(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPosts]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  return (
    <main className="app-shell">
      <div className="page-container">
        {/* ---- Stories ---- */}
        <StoryBar />

        {/* ---- Creer un post ---- */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* ---- Fil d'actualite ---- */}
        {!initialLoaded ? (
          <div className="spinner" />
        ) : posts.length === 0 ? (
          <div className="card empty-state">
            <p style={{ fontSize: '24px', marginBottom: '8px' }}>👋</p>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>Ton fil est vide pour l'instant.</p>
            <p className="text-muted">
              Ajoute des amis pour voir leurs publications ici, ou cree ta premiere publication !
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={handleDeletePost}
              />
            ))}

            {/* Sentinel d'infinite scroll */}
            <div ref={sentinelRef} style={{ height: '1px' }} />

            {loading && <div className="spinner" />}

            {!hasMore && posts.length > 0 && (
              <p className="text-muted" style={{ textAlign: 'center', marginTop: '16px' }}>
                Tu as tout vu !
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default HomePage;
