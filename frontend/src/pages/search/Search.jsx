import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import BottomNavigation from '../../components/BottomNavigation';
import Header from '../../components/Header';
import { Button } from '../../components/Button';
import MovieCard from '../../components/MovieCard';
import { getMovieHighlights, searchMoviesTmdb } from '../../api';

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  // search history UI removed for now
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlights, setHighlights] = useState({ popular: [], mostReviewed: [] });
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const debounceRef = useRef(null);

  // Load highlights on component mount
  useEffect(() => {
    const loadHighlights = async () => {
      setHighlightsLoading(true);
      try {
        const data = await getMovieHighlights();
        setHighlights({
          popular: data?.popular || [],
          mostReviewed: data?.mostReviewed || []
        });
      } catch (e) {
        console.error('Failed to load highlights:', e);
        setHighlights({ popular: [], mostReviewed: [] });
      } finally {
        setHighlightsLoading(false);
      }
    };
    loadHighlights();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // run immediate (on submit)
    await searchMovies(q);
  };

  async function searchMovies(q) {
    if (!q) return;

    // (history not tracked in UI currently)

    setHasSearched(true);
    setSearchResults([]);

    try {
      setLoading(true);
      setError('');
      const data = await searchMoviesTmdb(q, 1);
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

  // (검색 기록 UI는 현재 렌더링되지 않음)

  const handleMovieSelect = (movie, fromDb = false) => {
    // 영화 상세 페이지로 이동 (영화 정보를 state로 전달)
    // fromDb 플래그: 후기 많은 작품(DB movie ID)인지 구분
    navigate(`/movie/${movie.id}`, { state: { movie, fromDb } });
  };

  // debounced live search as user types (300ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      // clear search view
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchMovies(q);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

            {/* 검색 결과: 검색을 실행한 경우 TMDB 검색 결과를 표시합니다 */}
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
                {/* 검색어가 없을 때: 하이라이트 영화(인기 작품 & 후기 많은 작품) 표시 */}
                {!highlightsLoading && highlights.popular.length > 0 && (
                  <section className="search-movie-section">
                    <h2 className="search-section-title text-md font-bold font-inter text-primary">인기 작품</h2>
                    <div className="search-movie-list">
                      {highlights.popular.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} onSelect={handleMovieSelect} />
                      ))}
                    </div>
                  </section>
                )}

                {!highlightsLoading && highlights.mostReviewed.length > 0 && (
                  <section className="search-movie-section">
                    <h2 className="search-section-title text-md font-bold font-inter text-primary">후기 많은 작품</h2>
                    <div className="search-movie-list">
                      {highlights.mostReviewed.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} onSelect={(m) => handleMovieSelect(m, true)} />
                      ))}
                    </div>
                  </section>
                )}
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
