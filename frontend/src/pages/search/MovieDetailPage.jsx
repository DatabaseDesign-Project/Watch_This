import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import PostWriting from '../../components/PostWriting';
import { getMoviePostsByTmdb, getMovieDetail } from '../../api';
import emptyImg from '../../assets/empty-img.png';

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // location state에서 영화 정보를 가져오거나, 없으면 null
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showPostWriting, setShowPostWriting] = useState(false);

  // 영화 정보 로드 (state로 전달받지 못한 경우에만)
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        let baseMovie = movie;

        // 검색 결과를 통해 기본 정보 확보 (없을 때만)
        if (!baseMovie) {
          const url = new URL('/api/movies/search', window.location.origin);
          url.searchParams.set('q', id);
          url.searchParams.set('page', '1');

          const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { accept: 'application/json' },
            credentials: 'same-origin',
          });

          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data?.results) ? data.results : [];
            baseMovie = items.find((m) => String(m.id) === String(id)) || null;
          }
        }

        // 상세 정보(원제, 출연, 장르 배열 등) 추가 로드
        let detailMovie = null;
        try {
          detailMovie = await getMovieDetail(id);
        } catch (err) {
          console.error('영화 상세 로드 실패:', err);
        }

        const merged = detailMovie ? { ...baseMovie, ...detailMovie } : baseMovie;
        if (merged) {
          setMovie(merged);
        }
      } catch (e) {
        console.error('영화 정보 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    };

    const fetchPosts = async () => {
      try {
        setLoadingPosts(true);
        const postsData = await getMoviePostsByTmdb(id, { limit: 10 });
        setPosts(Array.isArray(postsData) ? postsData : []);
      } catch (e) {
        console.error('포스트 로드 실패:', e);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (id) {
      fetchMovie();
      fetchPosts();
    }
  }, [id]);

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

  const handleBack = () => {
    navigate(-1);
  };

  const handleWrite = () => {
    setShowPostWriting(true);
  };

  const handlePostSubmit = async () => {
    setShowPostWriting(false);
    // 포스트 목록 새로고침
    try {
      setLoadingPosts(true);
      const postsData = await getMoviePostsByTmdb(id, { limit: 10 });
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (e) {
      console.error('포스트 새로고침 실패:', e);
    } finally {
      setLoadingPosts(false);
    }
  };

  // 추가 정보 포맷터
  const originalTitle = movie?.original_title || movie?.originalTitle || '';
  const genres =
    movie?.genre ||
    (Array.isArray(movie?.genres) ? movie.genres.map((g) => g.name).join(', ') : '');
  const castList = Array.isArray(movie?.credits?.cast)
    ? movie.credits.cast.slice(0, 5).map((c) => c.name).join(', ')
    : '';

  if (loading) {
    return (
      <div className="fullscreen">
        <div className="mobile-container">
          <MobileStatusBar />
          <div className="page-container movie-detail-page-container">
            <div className="loading-container">
              <p>불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="fullscreen">
        <div className="mobile-container">
          <MobileStatusBar />
          <div className="page-container movie-detail-page-container">
            <div className="error-container">
              <p>영화를 찾을 수 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showPostWriting) {
    return (
      <div className="fullscreen">
        <div className="mobile-container">
          <MobileStatusBar />
          <PostWriting
            movie={movie}
            onBack={() => setShowPostWriting(false)}
            onSubmit={handlePostSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="page-container movie-detail-page-container">
          <div className="content-container scrollable-container">
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
                <button className="movie-detail-back-btn" onClick={handleBack} aria-label="뒤로가기">
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
                {originalTitle && (
                  <div className="movie-detail-original-title">{originalTitle}</div>
                )}

                {/* Movie Info */}
                <div className="movie-detail-info">
                  {(movie.releaseDate || movie.release_date) && (
                    <>개봉연월 | {formatDate(movie.releaseDate || movie.release_date)}<br /></>
                  )}
                  {genres && (
                    <>장르 | {genres}<br /></>
                  )}
                  {movie.director && (
                    <>감독 | {movie.director}<br /></>
                  )}
                  {castList && (
                    <>출연 | {castList}<br /></>
                  )}
                  {movie.overview && (
                    <>
                      <span className="movie-detail-overview-text">{movie.overview}</span>
                    </>
                  )}
                </div>

                {/* Write Post Button */}
                <button className="movie-detail-write-btn" onClick={handleWrite}>
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
                  {loadingPosts ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}
