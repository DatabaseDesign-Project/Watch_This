import { useState, useEffect, useCallback, useMemo } from 'react';
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

const CACHE_KEY = 'home_feed_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

// 캐시에서 데이터 로드 (컴포넌트 외부)
const loadFromCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp < CACHE_TTL) {
      return data;
    }
    
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (err) {
    console.error('캐시 로드 실패:', err);
    return null;
  }
};

// 캐시에 데이터 저장 (컴포넌트 외부)
const saveToCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('캐시 저장 실패:', err);
  }
};

export default function App() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('feed');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  
  // 초기 캐시 로드 (즉시 실행)
  const [posts, setPosts] = useState(() => {
    const cached = loadFromCache();
    if (cached) {
      console.log('초기 캐시 데이터 로드');
      return cached;
    }
    return [];
  });

  const urlParams = new URLSearchParams(window.location.search);
  const minimal = urlParams.get('minimal') === '1';

  const fetchFeed = useCallback(async (retryCount = 0, useCache = true) => {
    try {
      // 캐시 먼저 확인 (첫 로딩시에만)
      if (useCache && posts.length === 0) {
        const cachedData = loadFromCache();
        if (cachedData) {
          console.log('캐시된 데이터 사용');
          setPosts(cachedData);
          // 백그라운드에서 최신 데이터 가져오기
          fetchFeed(0, false);
          return;
        }
      }

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
          return fetchFeed(retryCount + 1, false);
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
          comments: p._count?.comments || (p.comments || []).length || 0,
          liked: p.liked || p.is_liked || false,
          emoji: p.emoji?.emoji_image || null,
          createdAt: p.created_at,
          isSpoiler: Boolean(p.is_spoiler || p.has_spoiler),
          showPlaceholderImage: !image,
        };
      });

      setPosts(mapped);
      
      // 캐시에 저장
      if (!useCache) {
        saveToCache(mapped);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('피드 로딩 타임아웃');
      } else {
        console.error('feed fetch failed', err);
      }
      // 에러 발생시 캐시 데이터 사용 시도
      if (posts.length === 0) {
        const cachedData = loadFromCache();
        if (cachedData) {
          console.log('에러 발생, 캐시된 데이터 사용');
          setPosts(cachedData);
          return;
        }
      }
      // 에러 발생시 빈 배열로 설정 (페이지는 정상 표시)
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'feed') {
      // 캐시가 있으면 백그라운드에서만 업데이트
      const hasCache = posts.length > 0;
      if (hasCache) {
        fetchFeed(0, false); // 백그라운드 업데이트
      } else {
        fetchFeed(); // 캐시 확인 후 로드
      }
    }
  }, [currentView, fetchFeed]);

  const handleFabClick = useCallback(() => setCurrentView('movieSearch'), []);

  const handleBackToFeed = useCallback(() => {
    setCurrentView('feed');
    setSelectedMovie(null);
    setSelectedPostId(null);
  }, []);

  const handlePostClick = useCallback((post) => {
    navigate(`/post/${post.id}`);
  }, [navigate]);

  const handleMovieSelect = useCallback((movie) => {
    setSelectedMovie(movie);
    setCurrentView('postWriting');
  }, []);

  const handleBackToSearch = useCallback(() => setCurrentView('movieSearch'), []);

  const handleSubmitPost = useCallback(async () => {
    setCurrentView('feed');
    setSelectedMovie(null);
    await fetchFeed();
  }, [fetchFeed]);

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
