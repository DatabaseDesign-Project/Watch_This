import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, deletePost, updatePost } from '../../api';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import StarRating from '../../components/StarRating';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import emptyImg from '../../assets/empty-img.png';
import '../../index.css';

// 이미지 URL 처리 함수 - 백엔드 static 파일 경로 변환
function getImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    if (path.startsWith('/static/')) {
        // [주의] Vite 환경변수나 로컬호스트 주소를 맞춰주세요.
        // 개발 환경 예시: http://localhost:8000
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        return `${backendUrl}${path}`;
    }
    return path;
}

export default function PostDetail({ postId: propPostId, onBack: propOnBack, onEditPost, useStandaloneLayout = true }) {
    const { id } = useParams();
    const navigate = useNavigate();

    // props에서 받거나 URL 파라미터에서 받음
    const postId = propPostId || (id ? parseInt(id) : null);
    const onBack = propOnBack || (() => navigate(-1));
    const [post, setPost] = useState(null);
    const [movieInfo, setMovieInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    useEffect(() => {
        loadPostData();
    }, [postId]);

    const loadPostData = async () => {
        try {
            setLoading(true);
            
            const postData = await getPostDetail(postId);
            
            const commentList = await getComments(postId);

            setPost(postData);
            setIsLiked(postData.is_liked || postData.liked || false);
            setComments(Array.isArray(commentList) ? commentList : []);

            // 영화 정보 처리
            let movieData = postData.movie;
            const tmdbId = postData.tmdb_id;

            // [수정된 로직] 장르 정보가 없으면 TMDB에서 다시 조회하도록 조건 추가
            const hasGenre = movieData && (movieData.genre || (Array.isArray(movieData.genres) && movieData.genres.length > 0));

            if (!movieData || !movieData.title || !hasGenre) {
                if (tmdbId) {
                    try {
                        const fetchedMovie = await getMovieDetail(tmdbId);
                        if (fetchedMovie) {
                            // 기존 DB 정보에 TMDB 정보를 병합
                            movieData = { ...movieData, ...fetchedMovie };
                        }
                    } catch (err) {
                        console.error("TMDB 조회 실패:", err);
                    }
                }
            }

            if (movieData) {
                const mappedInfo = {
                    title: movieData.title || movieData.korean_title || '제목 없음',
                    poster: movieData.poster_path 
                        ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
                        : (movieData.poster_image || movieData.poster || emptyImg),
                    releaseDate: movieData.release_date 
                        ? new Date(movieData.release_date).toISOString().split('T')[0] 
                        : '',
                    // 장르가 배열인 경우와 문자열인 경우 모두 처리
                    genre: Array.isArray(movieData.genres) 
                        ? movieData.genres.map(g => g.name).join(', ') 
                        : (movieData.genre || '장르 정보 없음'),
                    runtime: movieData.runtime_minutes || movieData.runtime || null,
                    director: movieData.director || '',
                };
                setMovieInfo(mappedInfo);
            }

        } catch (e) {
            console.error("데이터 로드 실패:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!post || isLiking) return; // 이미 처리 중이면 무시
        
        const previousLiked = isLiked;
        const previousCount = post.like_cnt || 0;
        
        setIsLiking(true);
        try {
            const nextState = !previousLiked;
            // 낙관적 업데이트
            setIsLiked(nextState);
            setPost(prev => ({
                ...prev,
                like_cnt: nextState ? (previousCount + 1) : Math.max(0, previousCount - 1)
            }));
            
            await toggleLike(postId, previousLiked);
        } catch (e) {
            console.error('Like failed', e);
            // 실패 시 원래 상태로 복구
            setIsLiked(previousLiked);
            setPost(prev => ({
                ...prev,
                like_cnt: previousCount
            }));
        } finally {
            setIsLiking(false);
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim()) return;
        try {
            await addComment(postId, commentText);
            setCommentText('');
            const newComments = await getComments(postId);
            setComments(newComments);
        } catch (e) {
            console.error(e);
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toISOString().split('T')[0].replace(/-/g, '. ');
    };

    // 답변에 미디어 매핑하기 (questionMedias는 포스트 레벨에 있음)
    const getMediasForAnswer = (answerId, questionId) => {
        if (!post?.questionMedias) return [];
        // question_id로 매칭
        return post.questionMedias.filter(m => m.question_id === questionId);
    };

    // 삭제 핸들러
    const handleDelete = async () => {
        if (!window.confirm('정말로 이 포스트를 삭제하시겠습니까?')) return;

        try {
            await deletePost(postId);
            alert('포스트가 삭제되었습니다.');
            onBack();
        } catch (e) {
            console.error('포스트 삭제 실패:', e);
            alert('포스트 삭제에 실패했습니다.');
        }
    };

    // 전체 포스트 수정 핸들러
    const handleEditPost = () => {
        setShowOptionsMenu(false);
        if (onEditPost) {
            onEditPost(post);
        } else {
            alert('포스트 수정 기능이 아직 구현되지 않았습니다.');
        }
    };

    const renderLayout = (node) => {
        if (!useStandaloneLayout) return node;
        return (
            <div className="fullscreen">
                <div className="mobile-container">
                    <MobileStatusBar />
                    {node}
                </div>
            </div>
        );
    };

    if (loading) {
        return renderLayout(
            <div className="page-container" style={{ background: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                <div className="content-container" style={{ flex: 'unset', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f0f0f0', borderTopColor: '#E35A5A', animation: 'postdetail-spin 0.8s linear infinite' }} />
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>포스트를 불러오는 중입니다...</p>
                </div>
            </div>
        );
    }
    if (!post) {
        return renderLayout(
            <div className="page-container" style={{ background: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                <div className="content-container" style={{ flex: 'unset', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <p style={{ margin: 0, color: '#333', fontWeight: '600' }}>포스트를 찾을 수 없습니다.</p>
                    <button onClick={onBack} style={{ marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' }}>
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const emojiData = post.emoji || post.emojis;
    const currentUserId = localStorage.getItem('user_id') || '1';
    const isMyPost = post.user && String(post.user.id) === String(currentUserId);

    // 페이지 레이아웃: 다른 화면과 동일하게 세로 비율을 채우고 스크롤 영역을 분리
    const pageStyle = {
        background: '#fff',
        minHeight: '100vh',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '80px',
    };

    const contentStyle = {
        flex: 1,
        overflowY: 'auto',
        paddingBottom: '20px',
    };

    const content = (
        <div className="post-detail-page" style={pageStyle}>
            {/* 헤더 */}
            <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0', position: 'relative', background:'#fff', zIndex: 5 }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
                    {'<'}
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
                    {post.title || '무제'}
                </h2>
                {isMyPost && (
                    <button
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        style={{ background: 'none', border: 'none', fontSize:'18px', cursor: 'pointer', position: 'relative' }}
                    >
                        •••
                    </button>
                )}

                {/* 옵션 메뉴 */}
                {showOptionsMenu && isMyPost && (
                    <>
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                            onClick={() => setShowOptionsMenu(false)}
                        />
                        <div style={{
                            position: 'absolute',
                            top: '50px',
                            right: '16px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            minWidth: '120px'
                        }}>
                            <button
                                onClick={handleEditPost}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
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
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#e74c3c'
                                }}
                            >
                                삭제
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="scroll-content" style={contentStyle}>
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
                             {formatDate(post.created_at)}
                        </div>
                    </div>
                    {emojiData && (
                        <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
                            {emojiData.emoji_image}
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
                            {movieInfo?.title || post.movie?.title || '영화 정보 없음'}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                            {movieInfo?.releaseDate && <>개봉일 | {movieInfo.releaseDate}<br/></>}
                            {movieInfo?.runtime && <>상영시간 | {movieInfo.runtime}분<br/></>}
                            {movieInfo?.genre && <>장르 | {movieInfo.genre}</>}
                            {movieInfo?.director && <><br/>감독 | {movieInfo.director}</>}
                        </div>
                    </div>
                </div>

                {/* 시청 날짜 및 평점 */}
                <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#666' }}>시청날짜</span>
                        <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date)}</span>
                    </div>

                    {(post.rating !== undefined && post.rating !== null && post.rating > 0) && (
                        <>
                            <span style={{ color: '#ddd' }}>|</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#666' }}>평점</span>
                                <StarRating value={post.rating || 0} readOnly size="small" />
                            </div>
                        </>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

                {/* Q&A 리스트 */}
                <div className="answers-container" style={{ padding: '0 20px 40px' }}>
                    {post.answers && post.answers.map((ans, idx) => {
                        const answerMedias = getMediasForAnswer(ans.id, ans.question_id);
                        
                        return (
                            <div key={idx} style={{ marginBottom: '30px' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>
                                    Q. {ans.question?.content || '질문'}
                                </h4>
                                <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                                    {ans.answer}
                                </p>
                                
                                {/* 미디어 이미지 */}
                                {answerMedias.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                        {answerMedias.map((media, mIdx) => {
                                            const imageUrl = getImageUrl(media.file_path);
                                            return (
                                                <ImageWithFallback 
                                                    key={mIdx}
                                                    src={imageUrl} 
                                                    alt="첨부 이미지"
                                                    style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* answers에 매칭 안 된 미디어가 있을 경우 */}
                    {post.questionMedias && post.questionMedias.length > 0 && (!post.answers || post.answers.length === 0) && (
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>첨부 이미지</h4>
                            {post.questionMedias.map((media, mIdx) => {
                                const imageUrl = getImageUrl(media.file_path);
                                return (
                                    <ImageWithFallback 
                                        key={mIdx}
                                        src={imageUrl} 
                                        alt="첨부 이미지"
                                        style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
                                    />
                                );
                            })}
                        </div>
                    )}
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
                    }}>
                        <span style={{ fontSize: '20px' }}>{isLiked ? '❤️' : '🤍'}</span>
                        <span style={{ fontWeight: '500', color: '#333' }}>{post.like_cnt || 0}</span>
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
                        <h3 style={{ margin: '0 0 15px 0' }}>댓글</h3>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                            {comments.length > 0 ? comments.map(c => (
                                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <b>{c.user?.nickname || '익명'}</b>: {c.content || c.body}
                                </div>
                            )) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                                    첫 번째 댓글을 남겨보세요!
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={commentText} 
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                                placeholder="댓글 입력..."
                                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                            <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>등록</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return renderLayout(content);
}
