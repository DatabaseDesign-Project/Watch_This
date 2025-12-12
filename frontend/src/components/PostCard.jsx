import { useState, memo, useCallback } from 'react';
import { toggleLike } from '../api';

function PostCard({ post, onClick }) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

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

  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLiking) return; // 이미 처리 중이면 무시
    
    const previousLiked = liked;
    const previousLikes = likes;
    
    setIsLiking(true);
    // 낙관적 업데이트 (Optimistic Update)
    setLiked(!previousLiked);
    setLikes(previousLiked ? Math.max(0, previousLikes - 1) : previousLikes + 1);
    
    try {
      await toggleLike(post.id, previousLiked);
    } catch (err) {
      console.error('좋아요 실패', err);
      // 실패 시 원래 상태로 복구
      setLiked(previousLiked);
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, liked, likes, post.id]);

  const handleCommentClick = useCallback((e) => {
    e.stopPropagation();
    if (onClick) onClick(post);
  }, [onClick, post]);

  const handleCardClick = useCallback(() => {
    if (onClick) onClick(post);
  }, [onClick, post]);

  const hasImage = Boolean(post.image);

  return (
    <article className="home-post-card" onClick={handleCardClick}>
      <div className="home-post-header">
        <span className="home-post-author">
          {post.category}
          {post.movieTitle ? ` ・ ${post.movieTitle}` : ''}
        </span>
        {post.emoji && <span className="home-post-emoji">{post.emoji}</span>}
      </div>

      {post.title && <h3 className="home-post-title">{post.title}</h3>}

      {/* 스포일러가 있으면 내용만 숨기고 경고 메시지 표시 */}
      {post.isSpoiler ? (
        <div className="home-post-spoiler">
          <span role="img" aria-label="spoiler">🤫</span>
          <span>스포일러가 포함된 포스트입니다!</span>
        </div>
      ) : (
        // 스포일러가 없으면 내용 표시
        post.description && (
          <p className="home-post-preview">{post.description}</p>
        )
      )}

      {/* 이미지는 스포일러 여부와 관계없이 항상 표시 */}
      {(hasImage || post.showPlaceholderImage) && (
        <div className={`home-post-image ${!hasImage ? 'placeholder' : ''}`}>
          {hasImage && <img src={post.image} alt={post.title || 'post'} loading="lazy" />}
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

// React.memo로 최적화 - post.id가 같으면 리렌더링 방지
export default memo(PostCard, (prevProps, nextProps) => {
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.liked === nextProps.post.liked &&
         prevProps.post.likes === nextProps.post.likes;
});
