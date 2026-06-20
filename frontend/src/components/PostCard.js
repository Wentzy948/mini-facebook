import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { fileUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { formatRelativeTime } from '../utils/time';

/**
 * PostCard
 * --------
 * Carte d'une publication dans le fil d'actualite ou sur la page profil.
 *
 * Fonctionnalites :
 *  - Affichage auteur, horodatage, texte, image
 *  - Bouton J'aime (toggle like/unlike avec mise a jour optimiste)
 *  - Affichage des commentaires existants + formulaire d'ajout de commentaire
 *  - Suppression du post si l'utilisateur connecte en est l'auteur
 *
 * Props :
 *  - post       : l'objet post complet (avec .author populate, .comments, .likes)
 *  - onDelete   : callback appele apres suppression (pour retirer le post du fil)
 *  - onLike     : callback apele apres like/unlike (pour mettre a jour le fil parent)
 */
const PostCard = ({ post: initialPost, onDelete, onLike }) => {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const isLiked = post.likes?.some((id) => id === user?._id || id?._id === user?._id);
  const isAuthor = post.author?._id === user?._id;

  /* ---- Like / Unlike ---- */
  const handleToggleLike = async () => {
    // Mise a jour optimiste : on change l'UI avant la reponse serveur
    const wasLiked = isLiked;
    setPost((prev) => ({
      ...prev,
      likes: wasLiked
        ? prev.likes.filter((id) => (id?._id || id) !== user._id)
        : [...prev.likes, user._id]
    }));

    try {
      const { data } = await api.put(`/posts/${post._id}/like`);
      setPost((prev) => ({ ...prev, likes: data.likes }));
      onLike?.(post._id, data.likes);
    } catch (error) {
      // Annule la mise a jour optimiste si l'API echoue
      setPost((prev) => ({
        ...prev,
        likes: wasLiked ? [...prev.likes, user._id] : prev.likes.filter((id) => (id?._id || id) !== user._id)
      }));
    }
  };

  /* ---- Commentaire ---- */
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setLoadingComment(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comment`, { text: commentText.trim() });
      setPost((prev) => ({ ...prev, comments: data.comments }));
      setCommentText('');
    } catch (error) {
      console.error('Erreur ajout commentaire', error);
    } finally {
      setLoadingComment(false);
    }
  };

  /* ---- Suppression ---- */
  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette publication ?')) return;
    setLoadingDelete(true);
    try {
      await api.delete(`/posts/${post._id}`);
      onDelete?.(post._id);
    } catch (error) {
      console.error('Erreur suppression post', error);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <article className="card post">
      {/* En-tete : auteur + timestamp + menu suppression */}
      <header className="post__header">
        <Link to={`/profile/${post.author?._id}`}>
          <Avatar user={post.author} size="md" />
        </Link>
        <div className="post__author-info">
          <Link to={`/profile/${post.author?._id}`} className="post__author-name">
            {post.author?.fullName}
          </Link>
          <span className="post__timestamp">{formatRelativeTime(post.createdAt)}</span>
        </div>
        {isAuthor && (
          <div className="post__menu">
            <button
              className="btn--icon btn"
              onClick={handleDelete}
              disabled={loadingDelete}
              title="Supprimer la publication"
              aria-label="Supprimer la publication"
            >
              <Trash2 size={18} style={{ color: 'var(--color-danger)' }} />
            </button>
          </div>
        )}
      </header>

      {/* Corps : texte */}
      {post.content && <p className="post__content">{post.content}</p>}

      {/* Corps : media (image ou video) */}
      {post.media?.url && (
        <div className="post__image">
          {post.media.type === 'video' ? (
            <video src={fileUrl(post.media.url)} controls preload="metadata" />
          ) : (
            <img src={fileUrl(post.media.url)} alt="Publication" loading="lazy" />
          )}
        </div>
      )}

      {/* Stats : nombres de likes et commentaires */}
      <div className="post__stats">
        <span className="post__likes">
          {post.likes?.length > 0 && (
            <>
              <span className="post__likes-icon" aria-hidden="true">👍</span>
              <span>{post.likes.length}</span>
            </>
          )}
        </span>
        {post.comments?.length > 0 && (
          <button
            className="text-muted"
            onClick={() => setShowComments((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Boutons d'action : J'aime / Commenter */}
      <div className="post__actions">
        <button
          className={`post__action-btn ${isLiked ? 'post__action-btn--liked' : ''}`}
          onClick={handleToggleLike}
          aria-label={isLiked ? "Je n'aime plus" : "J'aime"}
        >
          <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} />
          J'aime
        </button>
        <button
          className="post__action-btn"
          onClick={() => setShowComments((v) => !v)}
          aria-label="Afficher les commentaires"
        >
          <MessageCircle size={18} />
          Commenter
        </button>
      </div>

      {/* Section commentaires */}
      {showComments && (
        <div className="post__comments">
          {post.comments?.map((comment) => (
            <div key={comment._id} className="comment">
              <Link to={`/profile/${comment.author?._id}`}>
                <Avatar user={comment.author} size="sm" />
              </Link>
              <div className="comment__bubble">
                <Link
                  to={`/profile/${comment.author?._id}`}
                  className="comment__author"
                >
                  {comment.author?.fullName}
                </Link>
                {comment.text}
              </div>
            </div>
          ))}

          {/* Formulaire d'ajout de commentaire */}
          <form className="comment-form" onSubmit={handleAddComment}>
            <Avatar user={user} size="sm" />
            <input
              type="text"
              placeholder="Ecrire un commentaire..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={loadingComment}
              maxLength={500}
            />
            <button
              type="submit"
              className="btn btn--primary"
              style={{ padding: '6px 12px', fontSize: '13px' }}
              disabled={loadingComment || !commentText.trim()}
            >
              {loadingComment ? '...' : 'Envoyer'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
};

export default PostCard;
