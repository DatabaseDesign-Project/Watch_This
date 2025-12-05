import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import Header from '../../components/Header';
import PostCard from '../../components/PostCard';
import BottomNavigation from '../../components/BottomNavigation';
import FloatingActionButton from '../../components/FloatingActionButton';
import MovieSearch from '../../components/MovieSearch';
import PostWriting from '../../components/PostWriting';
import PostDetail from '../post/PostDetail';

export default function App() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('feed');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [posts, setPosts] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const minimal = urlParams.get('minimal') === '1';

  const fetchFeed = async (retryCount = 0) => {
    try {
      const uid = localStorage.getItem('user_id') || '1';
      
      // 타임아웃 설정 (10초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch('/api/v1/posts/feed', {
        headers: { 'X-User-Id': uid },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.error('feed fetch failed', res.status);
        // 500 에러시 한 번 재시도
        if (res.status >= 500 && retryCount < 1) {
          console.log('재시도 중...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchFeed(retryCount + 1);
        }
        return;
      }
      const data = await res.json();

      const mapped = (data || []).map((p) => {
        const posterImage = p.movie?.poster_image || p.movie?.poster || null;
        const questionMedia =
          Array.isArray(p.questionMedias) && p.questionMedias[0]?.file_path;
        const image = posterImage || questionMedia || null;
        const description = Array.isArray(p.answers)
          ? p.answers.map((a) => a.answer).join('\n')
          : '';

        return {
          id: p.post_id,
          category: p.user?.nickname || '익명',
          movieTitle: p.movie?.title || p.movie?.korean_title || '',
          title: p.title || '',
          description,
          image,
          likes: p.like_cnt || 0,
          comments: (p.comments || []).length || 0,
          liked: p.liked || p.is_liked || false,
          emoji: p.emoji?.emoji_image || null,
          createdAt: p.created_at,
          isSpoiler: Boolean(p.is_spoiler || p.has_spoiler),
          showPlaceholderImage: !image,
        };
      });

      setPosts(mapped);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('피드 로딩 타임아웃');
      } else {
        console.error('feed fetch failed', err);
      }
      // 에러 발생시 빈 배열로 설정 (페이지는 정상 표시)
      setPosts([]);
    }
  };

  useEffect(() => {
    if (currentView === 'feed') fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const handleFabClick = () => setCurrentView('movieSearch');

  const handleBackToFeed = () => {
    setCurrentView('feed');
    setSelectedMovie(null);
    setSelectedPostId(null);
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post.id}`);
  };

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    setCurrentView('postWriting');
  };

  const handleBackToSearch = () => setCurrentView('movieSearch');

  const handleSubmitPost = async () => {
    setCurrentView('feed');
    setSelectedMovie(null);
    await fetchFeed();
  };

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        {currentView === 'feed' && (
          <>
            <Header title="이거봤어" variant="home" />

            <div className="content-container scrollable-container home-feed-content">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onClick={handlePostClick} />
              ))}
            </div>

            {!minimal && (
              <>
                <FloatingActionButton onClick={handleFabClick} />
                <BottomNavigation
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </>
            )}
          </>
        )}

        {currentView === 'movieSearch' && (
          <MovieSearch
            onBack={handleBackToFeed}
            onMovieSelect={handleMovieSelect}
          />
        )}

        {currentView === 'postWriting' && selectedMovie && (
          <PostWriting
            movie={selectedMovie}
            onBack={handleBackToSearch}
            onSubmit={handleSubmitPost}
          />
        )}

        {currentView === 'postDetail' && selectedPostId && (
          <PostDetail
            postId={selectedPostId}
            onBack={handleBackToFeed}
            useStandaloneLayout={false}
          />
        )}
      </div>
    </div>
  );
}
