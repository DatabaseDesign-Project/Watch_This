import { useState } from 'react';
import { toggleLike } from '../api';

export default function PostCard({ post, onClick }) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likes, setLikes] = useState(post.likes || 0);

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      await toggleLike(post.id, liked);
      setLiked((prev) => {
        setLikes((n) => (prev ? Math.max(0, n - 1) : n + 1));
        return !prev;
      });
    } catch (err) {
      console.error('좋아요 실패', err);
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick(post);
  };

  const hasImage = Boolean(post.image);

  return (
    <article className="home-post-card" onClick={() => onClick && onClick(post)}>
      <div className="home-post-header">
        <span className="home-post-author">
          {post.category}
          {post.movieTitle ? ` ・ ${post.movieTitle}` : ''}
        </span>
        {post.emoji && <span className="home-post-emoji">{post.emoji}</span>}
      </div>

      {post.title && <h3 className="home-post-title">{post.title}</h3>}

      {post.description && (
        <p className="home-post-preview">{post.description}</p>
      )}

      {post.isSpoiler && (
        <div className="home-post-spoiler">
          <span role="img" aria-label="spoiler">🤫</span>
          <span>스포일러가 포함된 포스트입니다!</span>
        </div>
      )}

      {(hasImage || post.showPlaceholderImage) && (
        <div className={`home-post-image ${!hasImage ? 'placeholder' : ''}`}>
          {hasImage && <img src={post.image} alt={post.title || 'post'} />}
        </div>
      )}

      <div className="home-post-footer">
        <span className="home-post-date">{formatDate(post.createdAt)}</span>
        <div className="home-post-actions">
          <button
            type="button"
            className={`home-post-action ${liked ? 'active' : ''}`}
            onClick={handleLike}
            aria-pressed={liked}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likes}</span>
          </button>
          <button
            type="button"
            className="home-post-action"
            onClick={handleCommentClick}
          >
            <span>💬</span>
            <span>{post.comments ?? 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
