import { useState, useEffect } from 'react';
import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail } from '../api';
import { ImageWithFallback } from './figma/ImageWithFallback';
import StarRating from './StarRating';
import emptyImg from '../assets/empty-img.png'; 

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

export default function PostDetail({ postId, onBack }) {
    const [post, setPost] = useState(null);
    const [movieInfo, setMovieInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        loadPostData();
    }, [postId]);

    const loadPostData = async () => {
        try {
            setLoading(true);
            
            const postData = await getPostDetail(postId);
            console.log("📝 포스트 데이터 원본:", postData);
            
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
        if (!post) return;
        try {
            const nextState = !isLiked;
            await toggleLike(postId, isLiked);
            setIsLiked(nextState);
            setPost(prev => ({
                ...prev,
                like_cnt: nextState ? ((prev.like_cnt || 0) + 1) : Math.max(0, (prev.like_cnt || 0) - 1)
            }));
        } catch (e) {
            console.error('Like failed', e);
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

    if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
    if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

    const emojiData = post.emoji || post.emojis;

    return (
        <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
            {/* 헤더 */}
            <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
                    {'<'}
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
                    {post.title || '무제'}
                </h2>
                <button style={{ background: 'none', border: 'none', fontSize:'18px' }}>•••</button>
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
                        <span style={{ color: '#666' }}>작성일</span>
                        <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date || post.created_at)}</span>
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
                                            console.log('🖼️ 이미지 URL:', imageUrl);
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
}

// import { useState, useEffect } from 'react';
// import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, getMoviePosts } from '../api';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import StarRating from './StarRating';
// import emptyImg from '../assets/empty-img.png'; 

// // 이미지 URL 처리 함수 - 백엔드 static 파일 경로 변환
// function getImageUrl(path) {
//     if (!path) return null;
//     if (path.startsWith('http://') || path.startsWith('https://')) {
//         return path;
//     }
//     if (path.startsWith('/static/')) {
//         const backendUrl = 'http://localhost:8000';
//         return `${backendUrl}${path}`;
//     }
//     return path;
// }

// export default function PostDetail({ postId, onBack }) {
//     const [post, setPost] = useState(null);
//     const [movieInfo, setMovieInfo] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [comments, setComments] = useState([]);
//     const [commentText, setCommentText] = useState('');
//     const [isLiked, setIsLiked] = useState(false);
//     const [showComments, setShowComments] = useState(false);

//     useEffect(() => {
//         loadPostData();
//     }, [postId]);

//     const loadPostData = async () => {
//         try {
//             setLoading(true);
            
//             const postData = await getPostDetail(postId);
//             console.log("📝 포스트 데이터 원본:", postData);
            
//             const commentList = await getComments(postId);

//             setPost(postData);
//             setIsLiked(postData.is_liked || postData.liked || false);
//             setComments(Array.isArray(commentList) ? commentList : []);

//             // 영화 정보 처리
//             let movieData = postData.movie;
//             const tmdbId = postData.tmdb_id;

//             if (!movieData || !movieData.title) {
//                 if (tmdbId) {
//                     try {
//                         const fetchedMovie = await getMovieDetail(tmdbId);
//                         if (fetchedMovie) movieData = fetchedMovie;
//                     } catch (err) {
//                         console.error("TMDB 조회 실패:", err);
//                     }
//                 }
//             }

//             if (movieData) {
//                 const mappedInfo = {
//                     title: movieData.title || movieData.korean_title || '제목 없음',
//                     poster: movieData.poster_path 
//                         ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
//                         : (movieData.poster_image || movieData.poster || emptyImg),
//                     releaseDate: movieData.release_date 
//                         ? new Date(movieData.release_date).toISOString().split('T')[0] 
//                         : '',
//                     genre: Array.isArray(movieData.genres) 
//                         ? movieData.genres.map(g => g.name).join(', ') 
//                         : (movieData.genre || ''),
//                     runtime: movieData.runtime_minutes || movieData.runtime || null,
//                     director: movieData.director || '',
//                 };
//                 setMovieInfo(mappedInfo);
//             }

//         } catch (e) {
//             console.error("데이터 로드 실패:", e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleLike = async () => {
//         if (!post) return;
//         try {
//             const nextState = !isLiked;
//             await toggleLike(postId, isLiked);
//             setIsLiked(nextState);
//             setPost(prev => ({
//                 ...prev,
//                 like_cnt: nextState ? ((prev.like_cnt || 0) + 1) : Math.max(0, (prev.like_cnt || 0) - 1)
//             }));
//         } catch (e) {
//             console.error('Like failed', e);
//         }
//     };

//     const handleSendComment = async () => {
//         if (!commentText.trim()) return;
//         try {
//             await addComment(postId, commentText);
//             setCommentText('');
//             const newComments = await getComments(postId);
//             setComments(newComments);
//         } catch (e) {
//             console.error(e);
//         }
//     };

//     const formatDate = (d) => {
//         if (!d) return '';
//         return new Date(d).toISOString().split('T')[0].replace(/-/g, '. ');
//     };

//     // 답변에 미디어 매핑하기 (questionMedias는 포스트 레벨에 있음)
//     const getMediasForAnswer = (answerId, questionId) => {
//         if (!post?.questionMedias) return [];
//         // question_id로 매칭
//         return post.questionMedias.filter(m => m.question_id === questionId);
//     };

//     if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
//     if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

//     // ★★★ 필드명 수정: emojis → emoji ★★★
//     const emojiData = post.emoji || post.emojis;

//     return (
//         <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
//             {/* 헤더 */}
//             <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0' }}>
//                 <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
//                     {'<'}
//                 </button>
//                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
//                     {post.title || '무제'}
//                 </h2>
//                 <button style={{ background: 'none', border: 'none', fontSize:'18px' }}>•••</button>
//             </div>

//             <div className="scroll-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', paddingBottom: '20px' }}>
//                 {/* 작성자 정보 & 무드 이모지 */}
//                 <div className="author-section" style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 10px' }}>
//                     <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', overflow: 'hidden' }}>
//                         {post.user?.profile_image ? (
//                             <img src={post.user.profile_image} alt="profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />
//                         ) : (
//                             <span style={{ fontWeight: 'bold', color: '#555' }}>{post.user?.nickname?.[0] || 'U'}</span>
//                         )}
//                     </div>
//                     <div>
//                         <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.user?.nickname || '익명'}</div>
//                         <div style={{ fontSize: '12px', color: '#888' }}>
//                              {formatDate(post.created_at)}
//                         </div>
//                     </div>
//                     {/* ★★★ emoji (s 없음) ★★★ */}
//                     {emojiData && (
//                         <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
//                             {emojiData.emoji_image}
//                         </div>
//                     )}
//                 </div>

//                 {/* 영화 카드 정보 */}
//                 <div className="movie-card-compact" style={{ display: 'flex', padding: '10px 20px 20px' }}>
//                     <ImageWithFallback 
//                         src={movieInfo?.poster || emptyImg} 
//                         alt="poster" 
//                         style={{ width: '80px', height: '120px', borderRadius: '6px', marginRight: '12px', objectFit:'cover', backgroundColor:'#f0f0f0', flexShrink: 0 }} 
//                     />
//                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//                         <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
//                             {movieInfo?.title || post.movie?.title || '영화 정보 없음'}
//                         </h3>
//                         <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
//                             {movieInfo?.releaseDate && <>개봉일 | {movieInfo.releaseDate}<br/></>}
//                             {movieInfo?.runtime && <>상영시간 | {movieInfo.runtime}분<br/></>}
//                             {movieInfo?.genre && <>장르 | {movieInfo.genre}</>}
//                             {movieInfo?.director && <><br/>감독 | {movieInfo.director}</>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* 시청 날짜 및 평점 - 데이터가 있을 때만 표시 */}
//                 <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
//                     {/* 작성일 표시 (watch_date가 없으면 created_at 사용) */}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                         <span style={{ color: '#666' }}>작성일</span>
//                         <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date || post.created_at)}</span>
//                     </div>
                    
//                     {/* 평점 - rating 필드가 있을 때만 표시 */}
//                     {(post.rating !== undefined && post.rating !== null && post.rating > 0) && (
//                         <>
//                             <span style={{ color: '#ddd' }}>|</span>
//                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                                 <span style={{ color: '#666' }}>평점</span>
//                                 <StarRating value={post.rating || 0} readOnly size="small" />
//                             </div>
//                         </>
//                     )}
//                 </div>

//                 <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

//                 {/* Q&A 리스트 */}
//                 <div className="answers-container" style={{ padding: '0 20px 40px' }}>
//                     {post.answers && post.answers.map((ans, idx) => {
//                         // 해당 답변의 미디어 가져오기
//                         const answerMedias = getMediasForAnswer(ans.id, ans.question_id);
                        
//                         return (
//                             <div key={idx} style={{ marginBottom: '30px' }}>
//                                 <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>
//                                     Q. {ans.question?.content || '질문'}
//                                 </h4>
//                                 <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
//                                     {ans.answer}
//                                 </p>
                                
//                                 {/* ★★★ 미디어 이미지 - questionMedias에서 가져옴 ★★★ */}
//                                 {answerMedias.length > 0 && (
//                                     <div style={{ marginTop: '10px' }}>
//                                         {answerMedias.map((media, mIdx) => {
//                                             const imageUrl = getImageUrl(media.file_path);
//                                             console.log('🖼️ 이미지 URL:', imageUrl);
//                                             return (
//                                                 <ImageWithFallback 
//                                                     key={mIdx}
//                                                     src={imageUrl} 
//                                                     alt="첨부 이미지"
//                                                     style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
//                                                 />
//                                             );
//                                         })}
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}
                    
//                     {/* questionMedias가 있지만 answers에 매칭이 안 된 경우 별도 표시 */}
//                     {post.questionMedias && post.questionMedias.length > 0 && (!post.answers || post.answers.length === 0) && (
//                         <div style={{ marginTop: '20px' }}>
//                             <h4 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>첨부 이미지</h4>
//                             {post.questionMedias.map((media, mIdx) => {
//                                 const imageUrl = getImageUrl(media.file_path);
//                                 return (
//                                     <ImageWithFallback 
//                                         key={mIdx}
//                                         src={imageUrl} 
//                                         alt="첨부 이미지"
//                                         style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
//                                     />
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </div>

//                 {/* 좋아요 & 댓글 버튼 */}
//                 <div style={{ 
//                     padding: '20px', 
//                     borderTop: '1px solid #eee',
//                     display: 'flex', 
//                     gap: '24px',
//                     alignItems: 'center'
//                 }}>
//                     <button onClick={handleLike} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                     }}>
//                         <span style={{ fontSize: '20px' }}>{isLiked ? '❤️' : '🤍'}</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{post.like_cnt || 0}</span>
//                     </button>
//                     <button onClick={() => setShowComments(!showComments)} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                     }}>
//                         <span style={{ fontSize: '20px' }}>💬</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{comments.length}</span>
//                     </button>
//                 </div>
//             </div>

//             {/* 댓글 Drawer */}
//             {showComments && (
//                 <div style={{
//                     position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//                     backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display:'flex', flexDirection:'column', justifyContent:'flex-end'
//                 }} onClick={() => setShowComments(false)}>
//                     <div style={{ backgroundColor: '#fff', height: '60%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
//                         <h3 style={{ margin: '0 0 15px 0' }}>댓글</h3>
//                         <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
//                             {comments.length > 0 ? comments.map(c => (
//                                 <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
//                                     <b>{c.user?.nickname || '익명'}</b>: {c.content || c.body}
//                                 </div>
//                             )) : (
//                                 <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
//                                     첫 번째 댓글을 남겨보세요!
//                                 </div>
//                             )}
//                         </div>
//                         <div style={{ display: 'flex', gap: '10px' }}>
//                             <input 
//                                 type="text" 
//                                 value={commentText} 
//                                 onChange={e => setCommentText(e.target.value)}
//                                 onKeyDown={e => e.key === 'Enter' && handleSendComment()}
//                                 placeholder="댓글 입력..."
//                                 style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
//                             />
//                             <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>등록</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// import { useState, useEffect } from 'react';
// import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, getMoviePosts } from '../api';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import StarRating from './StarRating';
// import emptyImg from '../assets/empty-img.png'; 

// // 이미지 URL 처리 함수 - 백엔드 static 파일 경로 변환
// function getImageUrl(path) {
//     if (!path) return null;
//     // 이미 절대 URL이면 그대로 반환
//     if (path.startsWith('http://') || path.startsWith('https://')) {
//         return path;
//     }
//     // /static/uploads/... 경로를 백엔드 URL로 변환
//     if (path.startsWith('/static/')) {
//         // 개발 환경: 백엔드가 8000 포트
//         const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
//         return `${backendUrl}${path}`;
//     }
//     return path;
// }

// export default function PostDetail({ postId, onBack }) {
//     const [post, setPost] = useState(null);
//     const [movieInfo, setMovieInfo] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [comments, setComments] = useState([]);
//     const [commentText, setCommentText] = useState('');
//     const [isLiked, setIsLiked] = useState(false);
//     const [showComments, setShowComments] = useState(false);

//     useEffect(() => {
//         loadPostData();
//     }, [postId]);

//     const loadPostData = async () => {
//         try {
//             setLoading(true);
            
//             // 1. 포스트 상세 데이터 가져오기
//             const postData = await getPostDetail(postId);
//             console.log("📝 포스트 데이터 원본:", postData);
            
//             const commentList = await getComments(postId);

//             setPost(postData);
//             setIsLiked(postData.is_liked || false);
//             setComments(Array.isArray(commentList) ? commentList : []);

//             // 2. 영화 정보 확인 및 추가 로드
//             let movieData = postData.movie;
//             const movieId = postData.movie_id;
//             const tmdbId = postData.tmdb_id;

//             console.log("🎬 영화 정보(DB):", movieData);
//             console.log("🆔 Movie ID:", movieId, "TMDB ID:", tmdbId);

//             // 영화 정보가 없을 때 추가 로드 시도
//             if (!movieData || !movieData.title) {
//                 if (tmdbId) {
//                     console.log("🚀 TMDB ID로 영화 정보 조회:", tmdbId);
//                     try {
//                         const fetchedMovie = await getMovieDetail(tmdbId);
//                         console.log("📦 TMDB API 응답:", fetchedMovie);
//                         if (fetchedMovie) {
//                             movieData = fetchedMovie;
//                         }
//                     } catch (err) {
//                         console.error("❌ TMDB 조회 실패:", err);
//                     }
//                 } else if (movieId) {
//                     console.log("🔍 Movie ID로 영화 정보 조회:", movieId);
//                     try {
//                         const postsData = await getMoviePosts(movieId, { limit: 1 });
//                         if (postsData && postsData[0] && postsData[0].movie) {
//                             movieData = postsData[0].movie;
//                             console.log("📦 Movie ID로 찾은 영화:", movieData);
//                         }
//                     } catch (err) {
//                         console.error("❌ Movie ID 조회 실패:", err);
//                     }
//                 }
//             }

//             // 3. 화면 표시용 데이터로 변환
//             if (movieData) {
//                 const mappedInfo = {
//                     title: movieData.title || movieData.korean_title || movieData.original_title || '제목 없음',
//                     poster: movieData.poster_path 
//                         ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
//                         : (movieData.poster_image || movieData.poster || emptyImg),
//                     releaseDate: movieData.release_date 
//                         ? new Date(movieData.release_date).toISOString().split('T')[0] 
//                         : (movieData.releaseDate || ''),
//                     genre: Array.isArray(movieData.genres) 
//                         ? movieData.genres.map(g => g.name).join(', ') 
//                         : (movieData.genre || ''),
//                     runtime: movieData.runtime_minutes || movieData.runtime || null,
//                     director: movieData.director || '',
//                 };
//                 setMovieInfo(mappedInfo);
//                 console.log("✅ 최종 영화 정보:", mappedInfo);
//             } else {
//                 console.log("⚠️ 표시할 영화 정보가 없습니다.");
//             }

//         } catch (e) {
//             console.error("❌ 초기 데이터 로드 실패:", e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleLike = async () => {
//         if (!post) return;
//         try {
//             const nextState = !isLiked;
//             await toggleLike(postId, isLiked);
//             setIsLiked(nextState);
//             setPost(prev => ({
//                 ...prev,
//                 like_cnt: nextState ? (prev.like_cnt + 1) : (prev.like_cnt - 1)
//             }));
//         } catch (e) {
//             console.error('Like failed', e);
//         }
//     };

//     const handleSendComment = async () => {
//         if (!commentText.trim()) return;
//         try {
//             await addComment(postId, commentText);
//             setCommentText('');
//             const newComments = await getComments(postId);
//             setComments(newComments);
//         } catch (e) {
//             console.error(e);
//         }
//     };

//     const formatDate = (d) => {
//         if (!d) return '';
//         return new Date(d).toISOString().split('T')[0].replace(/-/g, '. ');
//     };

//     if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
//     if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

//     return (
//         <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
//             {/* 헤더 */}
//             <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0' }}>
//                 <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
//                     {'<'}
//                 </button>
//                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
//                     {post.title || '무제'}
//                 </h2>
//                 <button style={{ background: 'none', border: 'none', fontSize:'18px' }}>•••</button>
//             </div>

//             <div className="scroll-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', paddingBottom: '20px' }}>
//                 {/* 작성자 정보 & 무드 이모지 */}
//                 <div className="author-section" style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 10px' }}>
//                     <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', overflow: 'hidden' }}>
//                         {post.user?.profile_image ? (
//                             <img src={post.user.profile_image} alt="profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />
//                         ) : (
//                             <span style={{ fontWeight: 'bold', color: '#555' }}>{post.user?.nickname?.[0] || 'U'}</span>
//                         )}
//                     </div>
//                     <div>
//                         <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.user?.nickname || '익명'}</div>
//                         <div style={{ fontSize: '12px', color: '#888' }}>
//                              {formatDate(post.created_at)}
//                         </div>
//                     </div>
//                     {post.emojis && (
//                         <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
//                             {post.emojis.emoji_image}
//                         </div>
//                     )}
//                 </div>

//                 {/* 영화 카드 정보 */}
//                 <div className="movie-card-compact" style={{ display: 'flex', padding: '10px 20px 20px' }}>
//                     <ImageWithFallback 
//                         src={movieInfo?.poster || emptyImg} 
//                         alt="poster" 
//                         style={{ width: '80px', height: '120px', borderRadius: '6px', marginRight: '12px', objectFit:'cover', backgroundColor:'#f0f0f0', flexShrink: 0 }} 
//                     />
//                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//                         <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
//                             {movieInfo?.title || '영화 정보 없음'}
//                         </h3>
//                         <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
//                             {movieInfo?.releaseDate && <>개봉일 | {movieInfo.releaseDate}<br/></>}
//                             {movieInfo?.runtime && <>상영시간 | {movieInfo.runtime}분<br/></>}
//                             {movieInfo?.genre && <>장르 | {movieInfo.genre}</>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* 시청 날짜 및 평점 */}
//                 <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                         <span style={{ color: '#666' }}>시청일시</span>
//                         <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date)}</span>
//                     </div>
//                     <span style={{ color: '#ddd' }}>|</span>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                         <span style={{ color: '#666' }}>평점</span>
//                         <StarRating value={post.rating || 0} readOnly size="small" />
//                     </div>
//                 </div>

//                 <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

//                 {/* Q&A 리스트 */}
//                 <div className="answers-container" style={{ padding: '0 20px 40px' }}>
//                     {post.answers && post.answers.map((ans, idx) => (
//                         <div key={idx} style={{ marginBottom: '30px' }}>
//                             <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>
//                                 Q. {ans.question?.content || '질문 내용'}
//                             </h4>
//                             <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
//                                 {ans.answer}
//                             </p>
//                             {/* 미디어 이미지 - 경로 변환 적용 */}
//                             {ans.medias && ans.medias.length > 0 && (
//                                 <div style={{ marginTop: '10px' }}>
//                                     {ans.medias.map((media, mIdx) => {
//                                         const imageUrl = getImageUrl(media.file_path);
//                                         console.log('🖼️ 이미지 렌더링 경로:', imageUrl);
//                                         return (
//                                             <ImageWithFallback 
//                                                 key={mIdx}
//                                                 src={imageUrl} 
//                                                 alt="첨부 이미지"
//                                                 style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }}
//                                             />
//                                         );
//                                     })}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>

//                 {/* 좋아요 & 댓글 버튼 */}
//                 <div style={{ 
//                     padding: '20px', 
//                     borderTop: '1px solid #eee',
//                     display: 'flex', 
//                     gap: '24px',
//                     alignItems: 'center'
//                 }}>
//                     <button onClick={handleLike} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                         transition: 'background 0.2s'
//                     }}>
//                         <span style={{ fontSize: '20px' }}>{isLiked ? '❤️' : '🤍'}</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{post.like_cnt}</span>
//                     </button>
//                     <button onClick={() => setShowComments(!showComments)} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                         transition: 'background 0.2s'
//                     }}>
//                         <span style={{ fontSize: '20px' }}>💬</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{comments.length}</span>
//                     </button>
//                 </div>
//             </div>

//             {/* 댓글 Drawer */}
//             {showComments && (
//                 <div style={{
//                     position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//                     backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display:'flex', flexDirection:'column', justifyContent:'flex-end'
//                 }} onClick={() => setShowComments(false)}>
//                     <div style={{ backgroundColor: '#fff', height: '60%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
//                         <h3>댓글</h3>
//                         <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
//                             {comments.map(c => (
//                                 <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
//                                     <b>{c.user?.nickname || '익명'}</b>: {c.content}
//                                 </div>
//                             ))}
//                         </div>
//                         <div style={{ display: 'flex', gap: '10px' }}>
//                             <input 
//                                 type="text" 
//                                 value={commentText} 
//                                 onChange={e => setCommentText(e.target.value)}
//                                 placeholder="댓글 입력..."
//                                 style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
//                             />
//                             <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px' }}>등록</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// import { useState, useEffect } from 'react';
// import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, getMoviePosts } from '../api';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import StarRating from './StarRating';
// import emptyImg from '../assets/empty-img.png'; 

// // [중요] 백엔드 주소 (Vite 환경변수 or 하드코딩)
// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// export default function PostDetail({ postId, onBack, onEdit, onDelete }) {
//     const [post, setPost] = useState(null);
//     const [movieInfo, setMovieInfo] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [comments, setComments] = useState([]);
//     const [commentText, setCommentText] = useState('');
//     const [isLiked, setIsLiked] = useState(false);
//     const [likeCount, setLikeCount] = useState(0);
//     const [showComments, setShowComments] = useState(false);
//     const [showMenu, setShowMenu] = useState(false);
//     const [currentUserId, setCurrentUserId] = useState(null);
//     const [myRating, setMyRating] = useState(0);

//     useEffect(() => {
//         try {
//             const userId = localStorage.getItem('user_id');
//             if (userId) setCurrentUserId(parseInt(userId));
//         } catch (e) { console.error(e); }
//         loadPostData();
//     }, [postId]);

//     const loadPostData = async () => {
//         try {
//             setLoading(true);
//             const postData = await getPostDetail(postId);
//             const commentList = await getComments(postId);

//             setPost(postData);
//             setIsLiked(postData.is_liked || postData.liked || false);
//             setLikeCount(postData.like_cnt || 0);
//             setComments(Array.isArray(commentList) ? commentList : []);

//             // 평점 로드 로직
//             if (postData.rating) {
//                 setMyRating(postData.rating);
//             } else if (postData.movie_id) {
//                 try {
//                     const res = await fetch(`/api/v1/ratings/ratings/${postData.movie_id}`, {
//                         headers: { 'X-User-Id': localStorage.getItem('user_id') }
//                     });
//                     if (res.ok) {
//                         const rData = await res.json();
//                         setMyRating(rData.rating);
//                     }
//                 } catch {}
//             }

//             // 영화 정보 처리
//             let movieData = postData.movie;
//             const movieId = postData.movie_id;
//             const tmdbId = postData.tmdb_id;

//             if (!movieData || !movieData.title) {
//                 if (tmdbId) {
//                     try {
//                         const fetched = await getMovieDetail(tmdbId);
//                         if (fetched) movieData = fetched;
//                     } catch {}
//                 } else if (movieId) {
//                     try {
//                         const pData = await getMoviePosts(movieId, { limit: 1 });
//                         if (pData?.[0]?.movie) movieData = pData[0].movie;
//                     } catch {}
//                 }
//             }

//             if (movieData) {
//                 setMovieInfo({
//                     title: movieData.title || movieData.korean_title || '제목 없음',
//                     poster: movieData.poster_path 
//                         ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
//                         : (movieData.poster_image || emptyImg),
//                     releaseDate: movieData.release_date ? new Date(movieData.release_date).toISOString().split('T')[0] : '',
//                     genre: Array.isArray(movieData.genres) ? movieData.genres.map(g => g.name).join(', ') : (movieData.genre || ''),
//                     runtime: movieData.runtime_minutes || movieData.runtime || null,
//                     director: movieData.director || '',
//                 });
//             }
//         } catch (e) {
//             console.error(e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleLike = async () => {
//         if (!post) return;
//         try {
//             const nextState = !isLiked;
//             await toggleLike(postId, isLiked);
//             setIsLiked(nextState);
//             setLikeCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));
//         } catch (e) { console.error(e); }
//     };

//     const handleSendComment = async () => {
//         if (!commentText.trim()) return;
//         try {
//             const newComment = await addComment(postId, commentText);
//             setCommentText('');
//             if (!newComment.user) newComment.user = { nickname: '나', profile_image: null };
//             setComments(prev => [...prev, newComment]);
//         } catch (e) { console.error(e); }
//     };

//     const handleEdit = () => { setShowMenu(false); onEdit ? onEdit(post) : alert('수정 준비 중'); };
//     const handleDelete = async () => {
//         if (!confirm('삭제하시겠습니까?')) return;
//         try {
//             const res = await fetch(`/api/v1/posts/${postId}`, {
//                 method: 'DELETE',
//                 headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUserId.toString() },
//                 body: JSON.stringify({ user_id: Number(currentUserId) }),
//             });
//             if (!res.ok) throw new Error(await res.text());
//             onDelete ? onDelete() : onBack();
//         } catch (e) { alert(e.message); }
//     };

//     // [수정] 이미지 경로 생성기 (가장 중요한 부분!)
//     const getImageUrl = (path) => {
//         if (!path) return '';
//         // 이미 http로 시작하는 절대경로면 그대로 반환
//         if (path.startsWith('http')) return path;
        
//         // 로컬 경로(/static/...)인 경우 백엔드 주소 붙이기
//         // 경로가 /로 시작하지 않으면 붙여줌
//         const cleanPath = path.startsWith('/') ? path : `/${path}`;
//         return `${BACKEND_URL}${cleanPath}`;
//     };

//     const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0].replace(/-/g, '. ') : '';
//     const formatDateTime = (d) => {
//         if (!d) return '';
//         const date = new Date(d);
//         return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
//     };
//     const isMyPost = post && currentUserId && post.user_id === currentUserId;

//     if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
//     if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

//     return (
//         <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
//             {/* 헤더 */}
//             <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0' }}>
//                 <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>{'<'}</button>
//                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>{post.title}</h2>
//                 {isMyPost && (
//                     <div style={{ position: 'relative' }}>
//                         <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', fontSize:'24px', cursor: 'pointer' }}>•••</button>
//                         {showMenu && (
//                             <>
//                                 <div style={{ position: 'fixed', inset:0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
//                                 <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '100px' }}>
//                                     <button onClick={handleEdit} style={{ width: '100%', padding: '12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', borderBottom:'1px solid #eee' }}>수정</button>
//                                     <button onClick={handleDelete} style={{ width: '100%', padding: '12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: '#E35A5A' }}>삭제</button>
//                                 </div>
//                             </>
//                         )}
//                     </div>
//                 )}
//             </div>

//             <div className="scroll-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', paddingBottom: '20px' }}>
//                 {/* 작성자 */}
//                 <div style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
//                     <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee', overflow: 'hidden', marginRight: '10px' }}>
//                         {post.user?.profile_image ? (
//                             <img src={getImageUrl(post.user.profile_image)} alt="pr" style={{width:'100%', height:'100%', objectFit:'cover'}} />
//                         ) : (
//                             <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#555' }}>{post.user?.nickname?.[0]}</div>
//                         )}
//                     </div>
//                     <div>
//                         <div style={{ fontWeight: 'bold' }}>{post.user?.nickname}</div>
//                         <div style={{ fontSize: '12px', color: '#888' }}>{formatDateTime(post.created_at)}</div>
//                     </div>
//                     {(post.emoji || post.emojis) && (
//                         <div style={{ marginLeft: 'auto', fontSize: '32px' }}>{post.emoji?.emoji_image || post.emojis?.emoji_image}</div>
//                     )}
//                 </div>

//                 {/* 영화 정보 */}
//                 <div style={{ display: 'flex', padding: '10px 20px 20px' }}>
//                     <ImageWithFallback 
//                         src={movieInfo?.poster || emptyImg} 
//                         style={{ width: '80px', height: '120px', borderRadius: '6px', marginRight: '12px', objectFit:'cover', backgroundColor:'#f0f0f0', flexShrink: 0 }} 
//                     />
//                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//                         <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>{movieInfo?.title}</h3>
//                         <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
//                             {movieInfo?.releaseDate && <div>개봉일 | {movieInfo.releaseDate}</div>}
//                             {movieInfo?.runtime && <div>상영시간 | {movieInfo.runtime}분</div>}
//                             {movieInfo?.director && <div>감독 | {movieInfo.director}</div>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* ✅ 디자인 수정 1: 평점 (크고 진하게, 정렬 맞춤) */}
//                 <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
//                     {post.watch_date && (
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                             <span style={{ color: '#666' }}>시청일시</span>
//                             <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date)}</span>
//                             <span style={{ color: '#ddd' }}>|</span>
//                         </div>
//                     )}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
//                         <span style={{ color: '#666', marginRight: '4px' }}>평점</span>
//                         <StarRating value={myRating || 0} readOnly size="small" />
//                         <span style={{ fontSize:'15px', fontWeight:'bold', color:'#333', marginTop:'2px', marginLeft:'4px' }}>
//                             {myRating ? Number(myRating).toFixed(1) : '0.0'}
//                         </span>
//                     </div>
//                 </div>

//                 <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

//                 {/* ✅ 디자인 수정 2: 이미지 경로 연결 */}
//                 <div style={{ padding: '0 20px 40px' }}>
//                     {post.answers && post.answers.map((ans, idx) => {
//                         const matchedMedias = post.questionMedias 
//                             ? post.questionMedias.filter(m => Number(m.question_id) === Number(ans.question_id))
//                             : [];

//                         return (
//                             <div key={idx} style={{ marginBottom: '30px' }}>
//                                 <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>Q. {ans.question?.content}</h4>
//                                 <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{ans.answer}</p>
                                
//                                 {matchedMedias.length > 0 && (
//                                     <div style={{ marginTop: '10px' }}>
//                                         {matchedMedias.map((media, mIdx) => {
//                                             const fullUrl = getImageUrl(media.file_path);
//                                             console.log("🖼️ 이미지 렌더링 경로:", fullUrl); // 디버깅용
//                                             return (
//                                                 <ImageWithFallback 
//                                                     key={mIdx}
//                                                     src={fullUrl}
//                                                     style={{ width: '100%', borderRadius: '8px', marginTop: '8px', maxHeight:'400px', objectFit:'contain', backgroundColor:'#f9f9f9' }}
//                                                 />
//                                             );
//                                         })}
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}
//                 </div>

//                 {/* 하단 좋아요/댓글 */}
//                 <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '24px' }}>
//                     <button onClick={handleLike} style={{ background:'none', border:'none', display:'flex', gap:'8px', cursor:'pointer', fontSize:'16px' }}>
//                         <span>{isLiked ? '❤️' : '🤍'}</span> <span>{likeCount}</span>
//                     </button>
//                     <button onClick={() => setShowComments(!showComments)} style={{ background:'none', border:'none', display:'flex', gap:'8px', cursor:'pointer', fontSize:'16px' }}>
//                         <span>💬</span> <span>{comments.length}</span>
//                     </button>
//                 </div>
//             </div>

//             {/* 댓글창 (생략 없이 유지) */}
//             {showComments && (
//                 <div style={{ position: 'fixed', inset:0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setShowComments(false)}>
//                     <div style={{ position:'absolute', bottom:0, width:'100%', background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px', height: '60%', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
//                         <h3>댓글</h3>
//                         <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
//                             {comments.map(c => (
//                                 <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
//                                     <b>{c.user?.nickname}</b>: {c.body || c.content}
//                                 </div>
//                             ))}
//                         </div>
//                         <div style={{ display: 'flex', gap: '10px' }}>
//                             <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="댓글 입력..." style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
//                             <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px' }}>등록</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }


// import { useState, useEffect } from 'react';
// import { getPostDetail, toggleLike, getComments, addComment, getMovieDetail, getMoviePosts } from '../api';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import StarRating from './StarRating';
// import emptyImg from '../assets/empty-img.png'; 

// export default function PostDetail({ postId, onBack, onEdit, onDelete }) {
//     const [post, setPost] = useState(null);
//     const [movieInfo, setMovieInfo] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [comments, setComments] = useState([]);
//     const [commentText, setCommentText] = useState('');
//     const [isLiked, setIsLiked] = useState(false);
//     const [likeCount, setLikeCount] = useState(0);
//     const [showComments, setShowComments] = useState(false);
//     const [showMenu, setShowMenu] = useState(false);
//     const [currentUserId, setCurrentUserId] = useState(null);

//     useEffect(() => {
//         // 현재 사용자 ID 가져오기
//         try {
//             const userId = localStorage.getItem('user_id');
//             if (userId) {
//                 setCurrentUserId(parseInt(userId));
//             }
//         } catch (e) {
//             console.error('Failed to get user ID:', e);
//         }
        
//         loadPostData();
//     }, [postId]);

//     const loadPostData = async () => {
//         try {
//             setLoading(true);
            
//             const postData = await getPostDetail(postId);
//             console.log("📝 포스트 데이터:", postData);
            
//             const commentList = await getComments(postId);

//             setPost(postData);
//             setIsLiked(postData.is_liked || postData.liked || false);
//             setLikeCount(postData.like_cnt || 0);
//             setComments(Array.isArray(commentList) ? commentList : []);

//             let movieData = postData.movie;
//             const movieId = postData.movie_id;
//             const tmdbId = postData.tmdb_id;

//             console.log("🎬 영화 정보(DB):", movieData);
//             console.log("🆔 Movie ID:", movieId, "TMDB ID:", tmdbId);

//             if (!movieData || !movieData.title) {
//                 if (tmdbId) {
//                     console.log("🚀 TMDB ID로 영화 정보 조회:", tmdbId);
//                     try {
//                         const fetchedMovie = await getMovieDetail(tmdbId);
//                         console.log("📦 TMDB API 응답:", fetchedMovie);
//                         if (fetchedMovie) {
//                             movieData = fetchedMovie;
//                         }
//                     } catch (err) {
//                         console.error("❌ TMDB 조회 실패:", err);
//                     }
//                 } else if (movieId) {
//                     console.log("🔍 Movie ID로 영화 정보 조회:", movieId);
//                     try {
//                         const postsData = await getMoviePosts(movieId, { limit: 1 });
//                         if (postsData && postsData[0] && postsData[0].movie) {
//                             movieData = postsData[0].movie;
//                             console.log("📦 Movie ID로 찾은 영화:", movieData);
//                         } else {
//                             console.warn("⚠️ 해당 영화의 포스트를 찾을 수 없습니다.");
//                         }
//                     } catch (err) {
//                         console.error("❌ Movie ID 조회 실패:", err);
//                     }
//                 }
//             }

//             if (movieData) {
//                 const mappedInfo = {
//                     title: movieData.title || movieData.korean_title || movieData.original_title || '제목 없음',
//                     poster: movieData.poster_path 
//                         ? (movieData.poster_path.startsWith('http') ? movieData.poster_path : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
//                         : (movieData.poster_image || movieData.poster || emptyImg),
//                     releaseDate: movieData.release_date 
//                         ? new Date(movieData.release_date).toISOString().split('T')[0] 
//                         : (movieData.releaseDate || ''),
//                     genre: Array.isArray(movieData.genres) 
//                         ? movieData.genres.map(g => g.name).join(', ') 
//                         : (movieData.genre || ''),
//                     runtime: movieData.runtime_minutes || movieData.runtime || null,
//                     director: movieData.director || '',
//                 };
//                 setMovieInfo(mappedInfo);
//                 console.log("✅ 최종 영화 정보:", mappedInfo);
//             } else {
//                 console.log("⚠️ 표시할 영화 정보가 없습니다.");
//             }

//         } catch (e) {
//             console.error("❌ 초기 데이터 로드 실패:", e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleLike = async () => {
//         if (!post) return;
//         try {
//             const nextState = !isLiked;
//             await toggleLike(postId, isLiked);
//             setIsLiked(nextState);
//             setLikeCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));
//         } catch (e) {
//             console.error('좋아요 실패:', e);
//         }
//     };

//     const handleSendComment = async () => {
//         if (!commentText.trim()) return;
//         try {
//             const newComment = await addComment(postId, commentText);
//             setCommentText('');
//             setComments(prev => [...prev, newComment]);
//         } catch (e) {
//             console.error('댓글 작성 실패:', e);
//         }
//     };

//     const handleEdit = () => {
//         setShowMenu(false);
//         if (onEdit) {
//             onEdit(post);
//         } else {
//             alert('수정 기능은 준비 중입니다.');
//         }
//     };

//     const handleDelete = async () => {
//         setShowMenu(false);
//         if (!confirm('정말 이 포스트를 삭제하시겠습니까?')) {
//             return;
//         }
        
//         try {
//             const response = await fetch(`/api/v1/posts/${postId}`, {
//                 method: 'DELETE',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-User-Id': currentUserId.toString(),
//                 },
//                 body: JSON.stringify({ user_id: Number(currentUserId) }), // 명시적으로 Number로 변환
//             });

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 console.error('삭제 오류 응답:', errorText);
//                 throw new Error('포스트 삭제 실패: ' + errorText);
//             }

//             alert('포스트가 삭제되었습니다.');
//             if (onDelete) {
//                 onDelete();
//             } else {
//                 onBack();
//             }
//         } catch (e) {
//             console.error('삭제 실패:', e);
//             alert('포스트 삭제 중 오류가 발생했습니다: ' + e.message);
//         }
//     };

//     const formatDate = (d) => {
//         if (!d) return '';
//         return new Date(d).toISOString().split('T')[0].replace(/-/g, '. ');
//     };

//     const formatDateTime = (d) => {
//         if (!d) return '';
//         const date = new Date(d);
//         const year = date.getFullYear();
//         const month = String(date.getMonth() + 1).padStart(2, '0');
//         const day = String(date.getDate()).padStart(2, '0');
//         const hours = String(date.getHours()).padStart(2, '0');
//         const minutes = String(date.getMinutes()).padStart(2, '0');
//         return `${year}.${month}.${day} ${hours}:${minutes}`;
//     };

//     // 현재 사용자가 포스트 작성자인지 확인
//     const isMyPost = post && currentUserId && post.user_id === currentUserId;

//     if (loading) return <div style={{padding:'20px', textAlign:'center'}}>로딩 중...</div>;
//     if (!post) return <div style={{padding:'20px', textAlign:'center'}}>포스트를 찾을 수 없습니다.</div>;

//     return (
//         <div className="post-detail-page" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '80px', position: 'absolute', top:0, left:0, width:'100%', zIndex:50 }}>
//             {/* 헤더 */}
//             <div className="detail-header" style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0', position: 'relative' }}>
//                 <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '24px', marginRight: '10px', cursor: 'pointer' }}>
//                     {'<'}
//                 </button>
//                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, margin:0 }}>
//                     {post.title || '무제'}
//                 </h2>
//                 {isMyPost && (
//                     <div style={{ position: 'relative' }}>
//                         <button 
//                             onClick={() => setShowMenu(!showMenu)}
//                             style={{ background: 'none', border: 'none', fontSize:'24px', cursor: 'pointer', padding: '4px 8px' }}
//                         >
//                             •••
//                         </button>
//                         {showMenu && (
//                             <>
//                                 <div 
//                                     style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
//                                     onClick={() => setShowMenu(false)}
//                                 />
//                                 <div style={{
//                                     position: 'absolute',
//                                     top: '100%',
//                                     right: 0,
//                                     marginTop: '8px',
//                                     background: 'white',
//                                     border: '1px solid #e0e0e0',
//                                     borderRadius: '8px',
//                                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//                                     zIndex: 100,
//                                     minWidth: '120px',
//                                     overflow: 'hidden'
//                                 }}>
//                                     <button
//                                         onClick={handleEdit}
//                                         style={{
//                                             width: '100%',
//                                             padding: '12px 16px',
//                                             border: 'none',
//                                             background: 'none',
//                                             textAlign: 'left',
//                                             cursor: 'pointer',
//                                             fontSize: '14px',
//                                             color: '#333',
//                                             borderBottom: '1px solid #f0f0f0'
//                                         }}
//                                     >
//                                         수정
//                                     </button>
//                                     <button
//                                         onClick={handleDelete}
//                                         style={{
//                                             width: '100%',
//                                             padding: '12px 16px',
//                                             border: 'none',
//                                             background: 'none',
//                                             textAlign: 'left',
//                                             cursor: 'pointer',
//                                             fontSize: '14px',
//                                             color: '#E35A5A'
//                                         }}
//                                     >
//                                         삭제
//                                     </button>
//                                 </div>
//                             </>
//                         )}
//                     </div>
//                 )}
//             </div>

//             <div className="scroll-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', paddingBottom: '20px' }}>
//                 {/* 작성자 정보 & 무드 이모지 */}
//                 <div className="author-section" style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 10px' }}>
//                     <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', overflow: 'hidden' }}>
//                         {post.user?.profile_image ? (
//                             <img src={post.user.profile_image} alt="profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />
//                         ) : (
//                             <span style={{ fontWeight: 'bold', color: '#555' }}>{post.user?.nickname?.[0] || 'U'}</span>
//                         )}
//                     </div>
//                     <div>
//                         <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.user?.nickname || '익명'}</div>
//                         <div style={{ fontSize: '12px', color: '#888' }}>
//                              {formatDateTime(post.created_at)}
//                         </div>
//                     </div>
//                     {post.emojis && (
//                         <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
//                             {post.emojis.emoji_image}
//                         </div>
//                     )}
//                     {post.emoji && (
//                         <div style={{ marginLeft: 'auto', fontSize: '32px' }}>
//                             {post.emoji.emoji_image}
//                         </div>
//                     )}
//                 </div>

//                 {/* 영화 카드 정보 */}
//                 <div className="movie-card-compact" style={{ display: 'flex', padding: '10px 20px 20px' }}>
//                     <ImageWithFallback 
//                         src={movieInfo?.poster || emptyImg} 
//                         alt="poster" 
//                         style={{ width: '80px', height: '120px', borderRadius: '6px', marginRight: '12px', objectFit:'cover', backgroundColor:'#f0f0f0', flexShrink: 0 }} 
//                     />
//                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//                         <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
//                             {movieInfo?.title || '영화 정보 없음'}
//                         </h3>
//                         <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
//                             {movieInfo?.releaseDate && <>개봉일 | {movieInfo.releaseDate}<br/></>}
//                             {movieInfo?.runtime && <>상영시간 | {movieInfo.runtime}분<br/></>}
//                             {movieInfo?.genre && <>장르 | {movieInfo.genre}<br/></>}
//                             {movieInfo?.director && <>감독 | {movieInfo.director}</>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* 시청 날짜 및 평점 */}
//                 <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
//                     {post.watch_date && (
//                         <>
//                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                                 <span style={{ color: '#666' }}>시청일시</span>
//                                 <span style={{ color: '#333', fontWeight: '500' }}>{formatDate(post.watch_date)}</span>
//                             </div>
//                             <span style={{ color: '#ddd' }}>|</span>
//                         </>
//                     )}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                         <span style={{ color: '#666' }}>평점</span>
//                         <StarRating value={post.rating || 0} readOnly size="small" />
//                     </div>
//                 </div>

//                 <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 20px 20px' }} />

//                 {/* Q&A 리스트 */}
//                 <div className="answers-container" style={{ padding: '0 20px 40px' }}>
//                     {post.answers && post.answers.map((ans, idx) => (
//                         <div key={idx} style={{ marginBottom: '30px' }}>
//                             <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#E35A5A' }}>
//                                 Q. {ans.question?.content || '질문 내용'}
//                             </h4>
//                             <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
//                                 {ans.answer}
//                             </p>
//                             {ans.medias && ans.medias.length > 0 && (
//                                 <div style={{ marginTop: '10px' }}>
//                                     {ans.medias.map((media, mIdx) => (
//                                         <ImageWithFallback 
//                                             key={mIdx}
//                                             src={media.file_path} 
//                                             style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }}
//                                         />
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>

//                 {/* 좋아요 & 댓글 버튼 */}
//                 <div style={{ 
//                     padding: '20px', 
//                     borderTop: '1px solid #eee',
//                     display: 'flex', 
//                     gap: '24px',
//                     alignItems: 'center'
//                 }}>
//                     <button onClick={handleLike} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                         transition: 'background 0.2s'
//                     }}>
//                         <span style={{ fontSize: '20px' }}>{isLiked ? '❤️' : '🤍'}</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{likeCount}</span>
//                     </button>
//                     <button onClick={() => setShowComments(!showComments)} style={{ 
//                         background: 'none', 
//                         border: 'none', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         gap: '8px', 
//                         fontSize: '16px', 
//                         cursor: 'pointer',
//                         padding: '8px 12px',
//                         borderRadius: '8px',
//                         transition: 'background 0.2s'
//                     }}>
//                         <span style={{ fontSize: '20px' }}>💬</span>
//                         <span style={{ fontWeight: '500', color: '#333' }}>{comments.length}</span>
//                     </button>
//                 </div>
//             </div>

//             {/* 댓글 Drawer */}
//             {showComments && (
//                 <div style={{
//                     position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//                     backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display:'flex', flexDirection:'column', justifyContent:'flex-end'
//                 }} onClick={() => setShowComments(false)}>
//                     <div style={{ backgroundColor: '#fff', height: '60%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
//                         <h3>댓글</h3>
//                         <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
//                             {comments.map(c => (
//                                 <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
//                                     <b>{c.user?.nickname || '익명'}</b>: {c.body || c.content}
//                                 </div>
//                             ))}
//                         </div>
//                         <div style={{ display: 'flex', gap: '10px' }}>
//                             <input 
//                                 type="text" 
//                                 value={commentText} 
//                                 onChange={e => setCommentText(e.target.value)}
//                                 placeholder="댓글 입력..."
//                                 style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
//                             />
//                             <button onClick={handleSendComment} style={{ padding: '0 15px', background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px' }}>등록</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }