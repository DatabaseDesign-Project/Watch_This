// MovieCard.jsx
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function MovieCard({ movie, onSelect }) {
    const handleClick = () => {
        if (onSelect) {
            onSelect(movie);
        }
    };

    return (
        <div
            className="movie-card"
            onClick={handleClick}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
            <ImageWithFallback 
                src={movie.poster} 
                alt={movie.title}
                className="movie-poster"
            />
            
            <div className="movie-info">
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-detail">
                    <span className="movie-genre">개봉일 | {movie.releaseDate}</span>
                </div>
                <div className="movie-detail">
                    <span className="movie-genre">장르 | {movie.genre}</span>
                </div>
                <div className="movie-detail">
                    <span className="movie-rating">평점 | {movie.rating}점/10점</span>
                </div>
                <div className="movie-detail">
                    <span className="movie-genre">감독 | {movie.director}</span>
                </div>
            </div>
        </div>
    );
}
