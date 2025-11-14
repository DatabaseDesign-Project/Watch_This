import React from 'react';
import PostCard from './PostCard';

export default function MovieDetail({ movie, posts = [], loading = false, onBack, onWrite }) {
  return (
    <div className="movie-detail-page">
      <div className="movie-hero" style={{ position: 'relative' }}>
        <div
          className="movie-hero-poster"
          style={{
            backgroundImage: `url(${movie.poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: 260,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        />
        <button className="back-button-hero" onClick={onBack} style={{ position: 'absolute', left: 12, top: 12 }}>
          ←
        </button>
      </div>

      <div className="movie-card-overlay" style={{ marginTop: -40, background: '#fff', borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0 }}>{movie.title}</h2>
        <div style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
          <div>개봉연월 | {movie.releaseDate}</div>
          <div>장르 | {movie.genre}</div>
          <div>감독 | {movie.director}</div>
        </div>

        <p style={{ marginTop: 12, color: '#333' }}>
          영화 정보 from api
        </p>

        <div style={{ marginTop: 16 }}>
          <button className="write-post-btn" onClick={onWrite} style={{ padding: '10px 16px', borderRadius: 24, border: '1px solid #f2a6a6', background: 'transparent', color: '#f04e4e' }}>
            이 영화로 포스트 쓰기
          </button>
        </div>
      </div>

      <div className="related-posts-section" style={{ padding: '12px 6px' }}>
        <h3 style={{ margin: '12px 8px' }}>관련 포스트</h3>
        {loading ? (
          <p style={{ marginLeft: 8 }}>불러오는 중…</p>
        ) : posts && posts.length > 0 ? (
          posts.map((p) => (
            <div key={p.post_id || p.id} style={{ margin: '8px 0' }}>
              <PostCard post={{
                id: p.post_id || p.id,
                author: p.user?.nickname || '익명',
                title: p.title || '',
                preview: (p.answers || []).map(a => a.answer).join('\n'),
                image: (p.questionMedias && p.questionMedias[0]) ? p.questionMedias[0].file_path : null,
                likes: p.like_cnt || 0,
                comments: (p.comments || []).length || 0,
                createdAt: p.created_at,
              }} />
            </div>
          ))
        ) : (
          <p style={{ marginLeft: 8 }}>관련 포스트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
