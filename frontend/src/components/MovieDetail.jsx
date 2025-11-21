import emptyImg from '../assets/empty-img.png';

export default function MovieDetail({ movie, posts = [], loading = false, onBack, onWrite }) {
  // 날짜 포맷팅 (2019-04-24 -> 2019.04.24)
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && date.includes('-')) {
      return date.replace(/-/g, '.');
    }
    return date;
  };

  // 포스트 날짜 포맷팅
  const formatPostDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  return (
    <div className="movie-detail-page">
      {/* Hero Section with Movie Poster */}
      <div className="movie-detail-hero">
        {/* Blurred Background */}
        <div
          className="movie-detail-hero-bg"
          style={{ backgroundImage: `url(${movie.poster || movie.poster_path || movie.image || emptyImg})` }}
        >
          <div className="movie-detail-hero-gradient" />
        </div>

        {/* Back Button */}
        <button className="movie-detail-back-btn" onClick={onBack} aria-label="뒤로가기">
          <svg width="29" height="29" viewBox="0 0 29 29" fill="none">
            <path
              d="M18.62 21.24L11.38 14L18.62 6.76"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="movie-detail-content-card">
        {/* Movie Title */}
        <h1 className="movie-detail-page-title">{movie.title}</h1>

        {/* Movie Info */}
        <div className="movie-detail-info">
          {(movie.releaseDate || movie.release_date) && (
            <>개봉연월 | {formatDate(movie.releaseDate || movie.release_date)}<br /></>
          )}
          {movie.genre && (
            <>장르 | {movie.genre}<br /></>
          )}
          {movie.director && (
            <>감독 | {movie.director}<br /></>
          )}
          {movie.overview && (
            <span className="movie-detail-overview-text">{movie.overview}</span>
          )}
        </div>

        {/* Write Post Button */}
        <button className="movie-detail-write-btn" onClick={onWrite}>
          <span className="movie-detail-write-btn-text">
            이 영화로 포스트 쓰기
          </span>
        </button>

        {/* Divider */}
        <div className="movie-detail-divider" />

        {/* Related Posts Section */}
        <div className="movie-detail-posts-section">
          <h2 className="movie-detail-section-title">관련 포스트</h2>

          {/* Posts List */}
          {loading ? (
            <p className="movie-detail-loading">불러오는 중…</p>
          ) : posts && posts.length > 0 ? (
            <div className="movie-detail-posts-list">
              {posts.map((p) => {
                const postId = p.post_id || p.id;
                const nickname = p.user?.nickname || '익명';
                const postTitle = p.title || '';
                const content = (p.answers || []).map(a => a.answer).join('\n');
                const hasSpoiler = p.is_spoiler || false;
                const emoji = p.emoji?.emoji_image || '🤯';
                const date = formatPostDate(p.created_at);

                return (
                  <div key={postId} className="movie-detail-post-card">
                    {/* Post Header */}
                    <div className="movie-detail-post-header">
                      {nickname} ・ {movie.title}
                    </div>

                    {/* Post Title */}
                    <h3 className="movie-detail-post-title">{postTitle}</h3>

                    {/* Spoiler Badge or Content Preview */}
                    {hasSpoiler ? (
                      <div className="movie-detail-spoiler-badge">
                        <span className="movie-detail-spoiler-text">
                          🤫 스포일러가 포함된 포스트입니다!
                        </span>
                      </div>
                    ) : (
                      <p className="movie-detail-post-content">{content}</p>
                    )}

                    {/* Post Footer */}
                    <div className="movie-detail-post-footer">
                      <span className="movie-detail-post-date">{date}</span>

                      {/* Emoji Badge */}
                      <div className="movie-detail-emoji-badge">
                        <span>{emoji}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="movie-detail-no-posts">관련 포스트가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
