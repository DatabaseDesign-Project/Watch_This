import { useState, useEffect } from 'react';
import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, getMoviePosts } from '../api';
import { ImageWithFallback } from './figma/ImageWithFallback';
import StarRating from './StarRating';
import emptyImg from '../assets/empty-img.png'; 

export default function PostDetail({ postId, onBack, onEdit, onDelete }) {
    const [post, setPost] = useState(null);
    const [movieInfo, setMovieInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        // 현재 사용자 ID 가져오기
        try {
            const userId = localStorage.getItem('user_id');
            if (userId) {
                setCurrentUserId(parseInt(userId));
            }
        } catch (e) {
            console.error('Failed to get user ID:', e);
        }
        
        loadPostData();
    }, [postId]);

    const loadPostData = async () => {
        try {
            setLoading(true);
            
            const postData = await getPostDetail(postId);
            console.log("📝 포스트 데이터:", postData);
            
            const commentList = await getComments(postId);

            setPost(postData);
            setIsLiked(postData.is_liked || postData.liked || false);
            setLikeCount(postData.like_cnt || 0);
            setComments(Array.isArray(commentList) ? commentList : []);

            let movieData = postData.movie;
            const movieId = postData.movie_id;
            const tmdbId = postData.tmdb_id;

            console.log("🎬 영화 정보(DB):", movieData);
            console.log("🆔 Movie ID:", movieId, "TMDB ID:", tmdbId);

            if (!movieData || !movieData.title) {
                if (tmdbId) {
                    console.log("🚀 TMDB ID로 영화 정보 조회:", tmdbId);
                    try {
                        const fetchedMovie = await getMovieDetail(tmdbId);
                        console.log("📦 TMDB API 응답:", fetchedMovie);
                        if (fetchedMovie) {
                            movieData = fetchedMovie;
                        }
                    } catch (err) {
                        console.error("❌ TMDB 조회 실패:", err);
                    }
                } else if (movieId) {
                    console.log("🔍 Movie ID로 영화 정보 조회:", movieId);
                    try {
                        const postsData = await getMoviePosts(movieId, { limit: 1 });
                        if (postsData && postsData[0] && postsData[0].movie) {
                            movieData = postsData[0].movie;
                            console.log("📦 Movie ID로 찾은 영화:", movieData);
                        } else {
                            console.warn("⚠️ 해당 영화의 포스트를 찾을 수 없습니다.");
                        }
                    } catch (err) {
                        console.error("❌ Movie ID 조회 실패:", err);
                    }
                }
            }

            if (movieData) {
                const mappedInfo = {
                    title: movieData.title || movieData.korean_title || movieData.original_title || '제목 없음',
                    poster: movieData.poster_path 
                        ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
                        : (movieData.poster_image || movieData.poster || emptyImg),
                    releaseDate: movieData.release_date 
                        ? new Date(movieData.release_date).toISOString().split('T')[0] 
                        : (movieData.releaseDate || ''),
                    genre: Array.isArray(movieData.genres) 
                        ? movieData.genres.map(g => g.name).join(', ') 
                        : (movieData.genre || ''),
                    runtime: movieData.runtime_minutes || movieData.runtime || null,
                    director: movieData.director || '',
                };
                setMovieInfo(mappedInfo);
                console.log("✅ 최종 영화 정보:", mappedInfo);
            } else {
                console.log("⚠️ 표시할 영화 정보가 없습니다.");
            }

        } catch (e) {
            console.error("❌ 초기 데이터 로드 실패:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!post) return;
        try {
            const nextState = !isLiked;
            await toggleLike(postId, isLiked);
            setIsLiked(nextState);
            setLikeCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));
        } catch (e) {
            console.error('좋아요 실패:', e);
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim()) return;
        try {
            const newComment = await addComment(postId, commentText);
            setCommentText('');
            setComments(prev => [...prev, newComment]);
        } catch (e) {
            console.error('댓글 작성 실패:', e);
        }
    };

    const handleEdit = () => {
        setShowMenu(false);
        if (onEdit) {
            onEdit(post);
        } else {
            alert('수정 기능은 준비 중입니다.');
        }
    };

    const handleDelete = async () => {
        setShowMenu(false);
        if (!confirm('정말 이 포스트를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/v1/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUserId.toString(),
                },
                body: JSON.stringify({ user_id: currentUserId }),
            });

            if (!response.ok) {
                throw new Error('포스트 삭제 실패');
            }

            alert('포스트가 삭제되었습니다.');
            if (onDelete) {
                onDelete();
            } else {
                onBack();
            }
        } catch (e) {
            console.error('삭제 실패:', e);
            alert('포스트 삭제 중 오류가 발생했습니다.');
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toISOString().split('T')[0].replace(/-/g, '. ');
    };

    const formatDateTime = (d) => {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    };

    // 현재 사용자가 포스트 작성자인지 확인
    const isMyPost = post && currentUserId && post.user_id === currentUserId;

    if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
    if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

    return (
        <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
            {/* 헤더 */}
            <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0', position: 'relative' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
                    {'<'}
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
                    {post.title || '무제'}
                </h2>
                {isMyPost && (
                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            style={{ background: 'none', border: 'none', fontSize:'24px', cursor: 'pointer', padding: '4px 8px' }}
                        >
                            •••
                        </button>
                        {showMenu && (
                            <>
                                <div 
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                    onClick={() => setShowMenu(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    background: 'white',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 100,
                                    minWidth: '120px',
                                    overflow: 'hidden'
                                }}>
                                    <button
                                        onClick={handleEdit}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#333',
                                            borderBottom: '1px solid #f0f0f0'
                                        }}
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#E35A5A'
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="scroll-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', paddingBottom: '20px' }}>
                {/* 작성자 정보 & 무드 이모지 */}
                <div className="author-section" style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 10px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', overflow: 'hidden' }}>
                        {post.user?.profile_image ? (
                            <img src={post.user.profile_image} alt="profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        ) : (
                            <span style={{ fontWeight: 'bold', color: '#555' }}>{post.user?.nickname?.[0] || 'U'}</span>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.user?.nickname || '익명'}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                             {formatDateTime(post.created_at)}
                        </div>
                    </div>
                    {post.emojis && (
                        <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
                            {post.emojis.emoji_image}
                        </div>
                    )}
                    {post.emoji && (
                        <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
                            {post.emoji.emoji_image}
                        </div>
                    )}
                </div>

                {/* 영화 카드 정보 */}
                <div className="movie-card-compact" style={{ display: 'flex', padding: '10px 20px 20px' }}>
                    <ImageWithFallback 
                        src={movieInfo?.poster || emptyImg} 
                        alt="poster" 
                        style={{ width: '80px', height: '120px', borderRadius: '6px', marginRight: '12px', objectFit:'cover', backgroundColor:'#f0f0f0', flexShrink: 0 }} 
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                            {movieInfo?.title || '영화 정보 없음'}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                            {movieInfo?.releaseDate && <>개봉일 | {movieInfo.releaseDate}<br/></>}
                            {movieInfo?.runtime && <>상영시간 | {movieInfo.runtime}분<br/></>}
                            {movieInfo?.genre && <>장르 | {movieInfo.genre}<br/></>}
                            {movieInfo?.director && <>감독 | {movieInfo.director}</>}
                        </div>
                    </div>
                </div>

                {/* 시청 날짜 및 평점 */}
                <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
                    {post.watch_date && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#666' }}>시청일시</span>
                                <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date)}</span>
                            </div>
                            <span style={{ color: '#ddd' }}>|</span>
                        </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#666' }}>평점</span>
                        <StarRating value={post.rating || 0} readOnly size="small" />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

                {/* Q&A 리스트 */}
                <div className="answers-container" style={{ padding: '0 20px 40px' }}>
                    {post.answers && post.answers.map((ans, idx) => (
                        <div key={idx} style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>
                                Q. {ans.question?.content || '질문 내용'}
                            </h4>
                            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                                {ans.answer}
                            </p>
                            {ans.medias && ans.medias.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                    {ans.medias.map((media, mIdx) => (
                                        <ImageWithFallback 
                                            key={mIdx}
                                            src={media.file_path} 
                                            style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* 좋아요 & 댓글 버튼 */}
                <div style={{ 
                    padding: '20px', 
                    borderTop: '1px solid #eee',
                    display: 'flex', 
                    gap: '24px',
                    alignItems: 'center'
                }}>
                    <button onClick={handleLike} style={{ 
                        background: 'none', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '16px', 
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                    }}>
                        <span style={{ fontSize: '20px' }}>{isLiked ? '❤️' : '🤍'}</span>
                        <span style={{ fontWeight: '500', color: '#333' }}>{likeCount}</span>
                    </button>
                    <button onClick={() => setShowComments(!showComments)} style={{ 
                        background: 'none', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '16px', 
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                    }}>
                        <span style={{ fontSize: '20px' }}>💬</span>
                        <span style={{ fontWeight: '500', color: '#333' }}>{comments.length}</span>
                    </button>
                </div>
            </div>

            {/* 댓글 Drawer */}
            {showComments && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display:'flex', flexDirection:'column', justifyContent:'flex-end'
                }} onClick={() => setShowComments(false)}>
                    <div style={{ backgroundColor: '#fff', height: '60%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <h3>댓글</h3>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                            {comments.map(c => (
                                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <b>{c.user?.nickname || '익명'}</b>: {c.body || c.content}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={commentText} 
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="댓글 입력..."
                                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                            <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px' }}>등록</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}