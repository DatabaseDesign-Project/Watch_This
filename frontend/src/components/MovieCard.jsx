// MovieCard.jsx
import { ImageWithFallback } from './figma/ImageWithFallback';
import emptyImg from '../assets/empty-img.png';

export default function MovieCard({ movie, onSelect }) {
    const handleClick = () => {
        if (onSelect) {
            onSelect(movie);
        }
    };

    // Normalize poster property from different API shapes
    const posterUrl = movie?.poster || movie?.image || (movie?.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : emptyImg);

    return (
        <div
            className="movie-card"
            onClick={handleClick}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) handleClick(); }}
        >
            <div className="movie-poster-wrap">
                <ImageWithFallback
                    src={posterUrl}
                    alt={movie?.title}
                    className="movie-poster"
                />
                {movie?.rating !== undefined && (
                    <div className="rating-badge">{Math.round(movie.rating * 10) / 10}</div>
                )}
            </div>

            <div className="movie-info">
                <h3 className="movie-title">{movie?.title}</h3>

                {movie?.overview && (
                    <p className="movie-overview">{movie.overview}</p>
                )}

                <div className="movie-meta-row">
                    {movie?.releaseDate && <div className="movie-detail">개봉 | {movie.releaseDate}</div>}
                    {movie?.genre && <div className="movie-detail">장르 | {movie.genre}</div>}
                    {movie?.director && <div className="movie-detail">감독 | {movie.director}</div>}
                </div>
            </div>
        </div>
    );
}
