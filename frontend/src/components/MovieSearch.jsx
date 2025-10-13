// src/components/MovieSearch.jsx
import { useState } from 'react';
import MovieCard from './MovieCard';

export default function MovieSearch({ onBack, onMovieSelect }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q) return;

        setLoading(true);
        setError('');
        setHasSearched(true);

        try {
            const url = new URL('/api/movies/search', window.location.origin);
            url.searchParams.set('q', q);
            url.searchParams.set('page', '1');

            const res = await fetch(url.toString(), {
                method: 'GET',
                headers: { 'accept': 'application/json' },
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
            setError(e.message || '검색 중 문제가 발생했습니다.');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMovieSelect = (movie) => {
        onMovieSelect(movie);
    };

    return (
        <div className="movie-search-container">
            <div className="search-header">
                <button className="back-button" onClick={onBack}>
                    취소
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearch();
                        }}
                    />
                </div>

                <button className="search-button" onClick={handleSearch} disabled={loading}>
                    {loading ? '검색 중…' : '내가 본 영화 검색하기'}
                </button>
            </div>

            {hasSearched ? (
                <div className="search-results">
                    {error && (
                        <div className="search-placeholder">
                            <p>{error}</p>
                        </div>
                    )}

                    {!error && searchResults.length > 0 ? (
                        <>
                            {searchResults.map((movie) => (
                                <MovieCard
                                    key={movie.id}
                                    movie={movie}
                                    onSelect={handleMovieSelect}
                                />
                            ))}
                        </>
                    ) : !error ? (
                        <div className="search-placeholder">
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="search-placeholder" />
            )}
        </div>
    );
}
