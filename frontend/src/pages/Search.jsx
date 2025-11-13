import { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import BottomNavigation from '../components/BottomNavigation';
import Header from '../components/Header';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([
    '어벤져스',
    '스파이더맨',
    '인터스텔라'
  ]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 검색 기록에 추가
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory([searchQuery, ...searchHistory]);
      }
      console.log('검색:', searchQuery);
      // 검색 로직 구현
    }
  };

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

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="search-container">
          {/* 상단 헤더 (고정) */}
          <Header title="이거봤어" variant="search" />

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="search-content">
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
                  <button
                    type="button"
                    className="clear-search-button"
                    onClick={handleClearSearch}
                  >
                    <svg className="clear-icon" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                <button type="submit" className="search-submit-button">
                  <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </form>
            </div>

            {/* 검색어 입력 중일 때: 검색 기록만 표시 */}
            {searchQuery ? (
            searchHistory.length > 0 && (
              <div className="search-history-section">
                <div className="search-history-header">
                  <h2 className="search-history-title">최근 검색어</h2>
                  <button className="clear-all-button" onClick={handleClearAllHistory}>
                    전체 삭제
                  </button>
                </div>
                <ul className="search-history-list">
                  {searchHistory.map((query, index) => (
                    <li key={index} className="search-history-item">
                      <button
                        className="history-query"
                        onClick={() => handleHistoryClick(query)}
                      >
                        {query}
                      </button>
                      <button
                        className="delete-history-button"
                        onClick={() => handleDeleteHistory(query)}
                      >
                        <svg className="delete-icon" viewBox="0 0 10 10" fill="none">
                          <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : (
            <>
              {/* 검색어가 없을 때: 인기 작품 & 후기 많은 작품 표시 */}
              <section className="search-movie-section">
                <h2 className="search-section-title">인기 작품</h2>
                <div className="search-movie-list">
                  {popularMovies.map((movie) => (
                    <div key={movie.id} className="search-movie-card">
                      <div
                        className="search-movie-poster"
                        style={{
                          backgroundImage: `url(${movie.image})`,
                        }}
                      />
                      <div className="search-movie-info">
                        <h3 className="search-movie-title">{movie.title}</h3>
                        <p className="search-movie-meta">{movie.year} | {movie.genre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="search-movie-section">
                <h2 className="search-section-title">후기 많은 작품</h2>
                <div className="search-movie-list">
                  {reviewedMovies.map((movie) => (
                    <div key={movie.id} className="search-movie-card">
                      <div
                        className="search-movie-poster"
                        style={{
                          backgroundImage: `url(${movie.image})`,
                        }}
                      />
                      <div className="search-movie-info">
                        <h3 className="search-movie-title">{movie.title}</h3>
                        <p className="search-movie-meta">{movie.year} | {movie.genre}</p>
                      </div>
                    </div>
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
