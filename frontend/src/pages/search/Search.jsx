import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import BottomNavigation from '../../components/BottomNavigation';
import Header from '../../components/Header';
import { Button } from '../../components/Button';
import MovieCard from '../../components/MovieCard';

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([
    '어벤져스',
    '스파이더맨',
    '인터스텔라'
  ]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  // 인기 작품 데이터
  const popularMovies = [
    {
      id: 1,
      title: '모노노케 히메',
      year: 2003,
      genre: '애니메이션',
      image: '/images/mononoke.jpg'
    },
    {
      id: 2,
      title: '스파이더맨: 노 웨이 홈',
      year: 2021,
      genre: '액션/SF',
      image: '/images/spiderman.jpg'
    },
    {
      id: 3,
      title: 'F1 더 무비',
      year: 2025,
      genre: '스포츠/액션',
      image: '/images/f1.jpg'
    }
  ];

  // 후기 많은 작품 데이터
  const reviewedMovies = [
    {
      id: 4,
      title: '스파이더맨: 노 웨이 홈',
      year: 2021,
      genre: '액션/SF',
      image: '/images/spiderman.jpg'
    },
    {
      id: 5,
      title: 'F1 더 무비',
      year: 2025,
      genre: '스포츠/액션',
      image: '/images/f1.jpg'
    },
    {
      id: 6,
      title: '모노노케 히메',
      year: 2003,
      genre: '애니메이션',
      image: '/images/mononoke.jpg'
    }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // run immediate (on submit)
    await searchMovies(q);
  };

  async function searchMovies(q) {
    if (!q) return;
    // add to history
    if (!searchHistory.includes(q)) setSearchHistory([q, ...searchHistory]);

    setHasSearched(true);
    setSearchResults([]);

    try {
      const url = new URL('/api/movies/search', window.location.origin);
      url.searchParams.set('q', q);
      url.searchParams.set('page', '1');

      setLoading(true);
      setError('');
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '검색 API 실패');
      }
      const data = await res.json();
      const items = Array.isArray(data?.results) ? data.results : [];
      setSearchResults(items);
    } catch (e) {
      console.error(e);
      setError(e.message || '검색 중 문제가 발생했습니다.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleHistoryClick = (query) => {
    setSearchQuery(query);
    console.log('검색 기록 클릭:', query);
  };

  const handleDeleteHistory = (query) => {
    setSearchHistory(searchHistory.filter(item => item !== query));
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
  };

  const handleMovieSelect = (movie) => {
    // 영화 상세 페이지로 이동 (영화 정보를 state로 전달)
    navigate(`/movie/${movie.id}`, { state: { movie } });
  };

  // debounced live search as user types (300ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      // clear search view
      clearTimeout(debounceRef.current);
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchMovies(q);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="page-container search-container">
          {/* 상단 헤더 (고정) */}
          <Header title="이거봤어" variant="search" />

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="content-container search-content scrollable-container">
            {/* 검색 입력 */}
            <div className="search-input-wrapper">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  className="search-page-input"
                  placeholder="영화 제목, 감독, 출연진 등으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    className="clear-search-button"
                    onClick={handleClearSearch}
                  >
                    <svg className="clear-icon" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </Button>
                )}
                <Button variant="ghost" type="submit" className="search-submit-button">
                  <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </Button>
              </form>
            </div>

            {/* 검색 결과: 검색을 실행한 경우 TMDB 검색 결과와 선택한 영화의 관련 포스트를 표시합니다 */}
            {hasSearched ? (
              <div className="search-results">
                {error && (
                  <div className="search-placeholder">
                    <p>{error}</p>
                  </div>
                )}

                {!error && searchResults.length > 0 ? (
                  <div className="search-movie-list">
                    {searchResults.map((movie) => (
                      <MovieCard key={movie.id} movie={movie} onSelect={handleMovieSelect} />
                    ))}
                  </div>
                ) : (
                  <div className="search-placeholder">
                    <p>{loading ? '검색 중…' : '검색 결과가 없습니다.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 검색어가 없을 때: 인기 작품 & 후기 많은 작품 표시 */}
                <section className="search-movie-section">
                  <h2 className="search-section-title text-md font-bold font-inter text-primary">인기 작품</h2>
                  <div className="search-movie-list">
                    {popularMovies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        movie={{ ...movie, poster: movie.image, releaseDate: movie.year }}
                        onSelect={handleMovieSelect}
                      />
                    ))}
                  </div>
                </section>

                <section className="search-movie-section">
                  <h2 className="search-section-title text-md font-bold font-inter text-primary">후기 많은 작품</h2>
                  <div className="search-movie-list">
                    {reviewedMovies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        movie={{ ...movie, poster: movie.image, releaseDate: movie.year }}
                        onSelect={handleMovieSelect}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNavigation activeTab="search" />
        </div>
      </div>
    </div>
  );
};

export default Search;
