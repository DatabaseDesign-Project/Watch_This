// MovieSearch.jsx
import { useState } from 'react';
import MovieCard from './MovieCard';

export default function MovieSearch({ onBack }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    // 목업 데이터
    const mockMovies = [
        {
            id: 1,
            title: '모노노케 히메',
            releaseDate: '2003.04.25',
            genre: '애니메이션',
            rating: 9.2,
            director: '미야자키 하야오',
            poster: 'https://images.unsplash.com/photo-1614500166678-73b0de0bb934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGlyaXRlZCUyMGF3YXklMjBtaXlhemFraSUyMHBvc3RlcnxlbnwxfHx8fDE3NTkzMTE2MjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        },
        {
            id: 2,
            title: '모노노케 히메',
            releaseDate: '2003.04.25',
            genre: '애니메이션',
            rating: 9.2,
            director: '미야자키 하야오',
            poster: 'https://images.unsplash.com/photo-1758432320311-4fbe227550f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBnaGlibGklMjBhbmltYXRpb24lMjBtb3ZpZXxlbnwxfHx8fDE3NTkzMTE2MjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        },
        {
            id: 3,
            title: '모노노케 히메',
            releaseDate: '2003.04.25',
            genre: '애니메이션',
            rating: 9.2,
            director: '미야자키 하야오',
            poster: 'https://images.unsplash.com/photo-1716184047509-041f3bd1d937?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMGFuaW1lJTIwbW92aWUlMjBwb3N0ZXJ8ZW58MXx8fHwxNzU5MzExNjI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        }
    ];

    const handleSearch = () => {
        if (searchQuery.trim()) {
            // 검색어에 따른 필터링 로직 (실제로는 API 호출)
            const filteredMovies = mockMovies.filter(movie => 
                movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                movie.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                movie.director.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            setSearchResults(filteredMovies.length > 0 ? filteredMovies : mockMovies);
            setHasSearched(true);
        }
    };

    const handleMovieSelect = (movie) => {
        console.log('선택된 영화:', movie);
        // 여기서 영화 선택 후 다음 단계로 진행하는 로직 구현
    };

    return (
        <div className="movie-search-container">
            <div className="search-header">
                <button className="back-button" onClick={onBack}>
                    ←
                </button>
                <h2 className="search-title">포스트 작성</h2>
            </div>
            
            <p className="search-subtitle">어떤 영화에 대해 포스트를 남기시겠어요?</p>
            
            <div className="search-section">
                <div className="search-input-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="영화명, 장르, 출연진 등을 검색해보세요!"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSearch();
                            }
                        }}
                    />
                </div>
                
                <button className="search-button" onClick={handleSearch}>
                    🎬 내 주변 영화 찾아보기
                </button>
            </div>
            
            {hasSearched ? (
                <div className="search-results">
                    {searchResults.length > 0 ? (
                        <>
                            <h3 className="search-results-title">검색 결과</h3>
                            {searchResults.map((movie) => (
                                <MovieCard 
                                    key={movie.id} 
                                    movie={movie} 
                                    onSelect={handleMovieSelect}
                                />
                            ))}
                        </>
                    ) : (
                        <div className="search-placeholder">
                            <p>검색 결과가 없습니다.</p>
                            <p>다른 키워드로 검색해보세요.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="search-placeholder">
                    <p>영화를 검색하시거나</p>
                    <p>아래의 인기 영화들을 확인해보세요!</p>
                </div>
            )}
        </div>
    );
}
