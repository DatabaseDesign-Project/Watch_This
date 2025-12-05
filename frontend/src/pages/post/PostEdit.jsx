import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import QuestionAnswer from '../../components/QuestionAnswer';
import PrivacySelector from '../../components/PrivacySelector';
import QuestionModal from '../../components/QuestionModal';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import { getQuestions, updatePost, getPostDetail } from '../../api';

// MUI Rating & Icons
import Rating from '@mui/material/Rating';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';

// local fallback in case server emojis fail
const FALLBACK_EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// 미디어 업로드 함수
async function uploadMediaForPost(postId, questionId, file) {
    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('question_id', questionId);
    formData.append('media_type', 'image');
    formData.append('file', file);

    const userId = localStorage.getItem('user_id') || '1';

    const res = await fetch('/api/v1/medias/upload', {
        method: 'POST',
        headers: {
            'X-User-Id': userId,
        },
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`이미지 업로드 실패: ${text}`);
    }

    return await res.json();
}

// 이미지 URL 처리 함수
function getImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    if (path.startsWith('/static/')) {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        return `${backendUrl}${path}`;
    }
    return path;
}

export default function PostEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const postId = parseInt(id);

    const [loading, setLoading] = useState(true);
    const [postTitle, setPostTitle] = useState('');
    const [watchDate, setWatchDate] = useState('');
    const [rating, setRating] = useState(0);
    const [privacy, setPrivacy] = useState('전체공개');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [serverEmojis, setServerEmojis] = useState([]);
    const [selectedEmojiId, setSelectedEmojiId] = useState(null);
    const [hasSpoiler, setHasSpoiler] = useState(false);
    const [movie, setMovie] = useState(null);

    // 질문 상태
    const [questions, setQuestions] = useState([]);

    // 질문별 이미지 파일 상태: { [localQuestionId]: { file: File, previewUrl: string, isExisting: boolean } }
    const [questionImages, setQuestionImages] = useState({});

    const [serverQuestions, setServerQuestions] = useState([]);
    const [serverQuestionsLoading, setServerQuestionsLoading] = useState(false);
    const [serverQuestionsError, setServerQuestionsError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // 포스트 데이터 로드
    useEffect(() => {
        loadPostData();
    }, [postId]);

    const loadPostData = async () => {
        try {
            setLoading(true);

            // 포스트 상세 정보 가져오기
            const postData = await getPostDetail(postId);

            // 기본 정보 설정
            setPostTitle(postData.title || '');
            setWatchDate(postData.watch_date ? new Date(postData.watch_date).toISOString().split('T')[0] : '');
            setRating(postData.rating || 0);
            setHasSpoiler(postData.has_spoiler || false);
            setSelectedEmojiId(postData.emoji?.id || postData.emojis?.id || null);

            // 공개범위 매핑
            const visibilityMap = {
                'public': '전체공개',
                'friends': '친구공개',
                'private': '나만보기'
            };
            setPrivacy(visibilityMap[postData.visibility] || '전체공개');

            // 영화 정보 설정
            setMovie(postData.movie);

            // 질문-답변 데이터 로드
            if (postData.answers && Array.isArray(postData.answers)) {
                const loadedQuestions = postData.answers.map((ans, idx) => ({
                    id: ans.question_id || idx + 1,
                    question_id: ans.question_id,
                    question: ans.question?.content || '질문',
                    placeholder: ans.question?.content || '질문',
                    answer: ans.answer || '',
                }));
                setQuestions(loadedQuestions);

                // 기존 이미지 로드
                if (postData.questionMedias && Array.isArray(postData.questionMedias)) {
                    const imageMap = {};
                    postData.questionMedias.forEach(media => {
                        const questionId = media.question_id;
                        imageMap[questionId] = {
                            file: null,
                            previewUrl: getImageUrl(media.file_path),
                            isExisting: true
                        };
                    });
                    setQuestionImages(imageMap);
                }
            }

        } catch (e) {
            console.error('포스트 데이터 로드 실패:', e);
            alert('포스트를 불러오는데 실패했습니다.');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    // 질문 목록 로드
    const fetchQuestions = async () => {
        setServerQuestionsLoading(true);
        setServerQuestionsError(null);
        try {
            const data = await getQuestions();
            if (Array.isArray(data)) {
                setServerQuestions(data);
            }
        } catch (err) {
            console.error('Failed to load questions:', err);
            setServerQuestionsError(String(err));
        } finally {
            setServerQuestionsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    // 이모지 로드
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/v1/emojis/');
                if (!res.ok) return;
                const data = await res.json();
                setServerEmojis(Array.isArray(data) ? data : []);
            } catch {
                // ignore
            }
        })();
    }, []);

    const handleAddQuestion = () => {
        setShowQuestionModal(true);
    };

    const handleSelectQuestion = (selectedQuestion) => {
        const isObj = selectedQuestion && typeof selectedQuestion === 'object';
        const newQuestion = {
            id: isObj ? selectedQuestion.id : Date.now(),
            question_id: isObj ? selectedQuestion.id : null,
            question: isObj ? selectedQuestion.content : selectedQuestion,
            placeholder: isObj ? selectedQuestion.content : selectedQuestion,
            answer: '',
        };

        setQuestions([...questions, newQuestion]);
    };

    const getAvailableQuestions = () => {
        if (serverQuestions && serverQuestions.length) {
            return serverQuestions.filter(s => !questions.some(q => q.question === s.content));
        }
        return [];
    };

    const handleQuestionAnswerChange = (localId, answer) => {
        setQuestions(questions.map(q =>
            q.id === localId ? { ...q, answer } : q
        ));
    };

    // 질문 삭제 핸들러
    const handleDeleteQuestion = (localId) => {
        const questionToDelete = questions.find(q => q.id === localId);

        // 기본 질문은 삭제 불가
        if (questionToDelete?.question === '자유롭게 이야기를 들려주세요!') {
            alert('기본 질문은 삭제할 수 없습니다.');
            return;
        }

        // 해당 질문에 첨부된 이미지도 삭제
        if (questionImages[localId]?.previewUrl && !questionImages[localId]?.isExisting) {
            URL.revokeObjectURL(questionImages[localId].previewUrl);
        }

        setQuestions(questions.filter(q => q.id !== localId));
        setQuestionImages(prev => {
            const newState = { ...prev };
            delete newState[localId];
            return newState;
        });
    };

    // 이미지 업로드 핸들러
    const handleImageUpload = (localQuestionId, file) => {
        const previewUrl = URL.createObjectURL(file);
        setQuestionImages(prev => ({
            ...prev,
            [localQuestionId]: { file, previewUrl, isExisting: false }
        }));
    };

    // 이미지 삭제 핸들러
    const handleDeleteImage = (localQuestionId) => {
        setQuestionImages(prev => {
            const newState = { ...prev };
            if (newState[localQuestionId]?.previewUrl && !newState[localQuestionId]?.isExisting) {
                URL.revokeObjectURL(newState[localQuestionId].previewUrl);
            }
            delete newState[localQuestionId];
            return newState;
        });
    };

    const mapPrivacy = (p) => {
        if (!p) return 'public';
        if (p.includes('전체')) return 'public';
        if (p.includes('친구')) return 'friends';
        if (p.includes('나만') || p.includes('비공개')) return 'private';
        return 'public';
    };

    const handleSubmit = async () => {
        // 제목 확인
        if (!postTitle || !postTitle.trim()) {
            alert('게시글 제목을 입력해주세요.');
            return;
        }

        // 평점 확인
        if (!rating || rating === 0) {
            alert('평점을 선택해주세요.');
            return;
        }

        // 이모지 확인
        if (!selectedEmojiId) {
            alert('이모지를 선택해주세요.');
            return;
        }

        // 기본 질문 답변 확인
        const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        const mainAnswer = mainQ?.answer?.trim() || '';
        if (!mainAnswer) {
            alert('자유롭게 이야기를 들려주세요! 항목에 내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. 포스트 업데이트
            const userId = localStorage.getItem('user_id') || '1';
            const payload = {
                user_id: parseInt(userId),
                title: postTitle,
                watch_date: watchDate || undefined,
                rating: rating || undefined,
                emojis_id: selectedEmojiId || undefined,
                visibility: mapPrivacy(privacy),
                spoiler: !!hasSpoiler,
                answers: questions
                    .filter(q => q.answer && q.answer.trim() !== '' && q.question_id)
                    .map(q => ({ question_id: q.question_id, answer: q.answer })),
            };

            console.log('📝 포스트 업데이트 payload:', payload);
            await updatePost(postId, payload);
            console.log('✅ 포스트 업데이트 완료');

            // 2. 새로 추가된 이미지 업로드
            const newImageEntries = Object.entries(questionImages).filter(([_, data]) => !data.isExisting && data.file);
            if (newImageEntries.length > 0) {
                console.log(`📸 ${newImageEntries.length}개 새 이미지 업로드 시작...`);

                for (const [localIdStr, imageData] of newImageEntries) {
                    const localId = parseInt(localIdStr, 10);
                    const question = questions.find(q => q.id === localId);

                    if (!question?.question_id) {
                        console.warn(`⚠️ 질문 ID를 찾을 수 없음 (localId: ${localId})`);
                        continue;
                    }

                    try {
                        console.log(`📤 업로드 중: postId=${postId}, questionId=${question.question_id}`);
                        const uploadResult = await uploadMediaForPost(
                            postId,
                            question.question_id,
                            imageData.file
                        );
                        console.log('✅ 이미지 업로드 완료:', uploadResult);
                    } catch (uploadErr) {
                        console.error(`❌ 이미지 업로드 실패 (QID: ${question.question_id}):`, uploadErr);
                        alert(`이미지 업로드 중 일부 오류가 발생했습니다: ${uploadErr.message}`);
                    }
                }
            }

            // 3. 완료 후 포스트 상세로 이동
            alert('포스트가 수정되었습니다.');
            navigate(`/post/${postId}`);

        } catch (e) {
            console.error('❌ 포스트 수정 실패:', e);
            alert(`포스트 수정 중 오류가 발생했습니다: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEmojiSelect = (emoji, emojiId = null) => {
        setSelectedEmojiId(emojiId);
        setShowEmojiPicker(false);
    };

    // cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            Object.values(questionImages).forEach(img => {
                if (img.previewUrl && !img.isExisting) {
                    URL.revokeObjectURL(img.previewUrl);
                }
            });
        };
    }, []);

    if (loading) {
        return (
            <div className="fullscreen">
                <div className="mobile-container">
                    <MobileStatusBar />
                    <div className="page-container" style={{ background: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f0f0f0', borderTopColor: '#E35A5A', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>포스트를 불러오는 중입니다...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
    const canSubmit = mainQ?.answer && mainQ.answer.trim() !== '';

    return (
        <div className="fullscreen">
            <div className="mobile-container">
                <MobileStatusBar />
                <div className="post-writing-container">
                    <div className="search-header">
                        <button className="back-button" onClick={() => navigate(-1)}>
                            취소
                        </button>
                        <h2 className="search-title">포스트 수정</h2>
                    </div>

                    <div className="post-form">
                        {/* 게시글 제목 */}
                        <div className="form-group">
                            <input
                                type="text"
                                className="title-input"
                                placeholder="게시글 제목을 입력해주세요"
                                value={postTitle}
                                onChange={(e) => setPostTitle(e.target.value)}
                            />
                        </div>

                        {/* 선택된 영화 정보 */}
                        {movie && (
                            <div className="selected-movie">
                                <div className="selected-movie-card">
                                    <ImageWithFallback
                                        src={movie.poster_image || movie.poster || movie.poster_path}
                                        alt={movie.title}
                                        className="selected-movie-poster"
                                    />
                                    <div className="selected-movie-info">
                                        <h3 className="selected-movie-title">{movie.title}</h3>
                                        <div className="selected-movie-detail">개봉일 | {movie.release_date ? new Date(movie.release_date).toISOString().split('T')[0] : '-'}</div>
                                        <div className="selected-movie-detail">상영시간 | {movie.runtime_minutes || movie.runtime || '-'}분</div>
                                        <div className="selected-movie-detail">장르 | {movie.genre || '-'}</div>
                                        <div className="selected-movie-detail">감독 | {movie.director || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 시청 날짜 */}
                        <div className="form-group">
                            <div className="date-header">
                                <label className="form-label">시청 날짜</label>
                                <div className="date-input-container">
                                    <input
                                        type="date"
                                        className="date-input"
                                        value={watchDate}
                                        onChange={(e) => setWatchDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 평점 */}
                        <div className="form-group">
                            <div className="rating-header">
                                <label className="form-label">평점</label>
                                <div className="rating-container">
                                    <Rating
                                        name="post-rating"
                                        value={rating}
                                        onChange={(_, v) => setRating(v ?? 0)}
                                        precision={0.5}
                                        icon={
                                            <Star
                                                sx={{
                                                    color: 'var(--color-accent)',
                                                    stroke: 'var(--color-accent)',
                                                    strokeWidth: 1.5,
                                                }}
                                                fontSize="inherit"
                                            />
                                        }
                                        emptyIcon={
                                            <StarBorder
                                                sx={{
                                                    color: 'var(--color-accent)',
                                                    stroke: 'var(--color-accent)',
                                                    strokeWidth: 0.3,
                                                }}
                                                fontSize="inherit"
                                            />
                                        }
                                    />
                                </div>
                                <div className="rating-right">
                                    <span className="rating-text">이 영화에 대한 감상은...</span>
                                    <button
                                        type="button"
                                        className="emoji-trigger"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        {selectedEmojiId
                                            ? (serverEmojis.find(e => e.id === selectedEmojiId)?.emoji_image || '😊')
                                            : '😊'
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 질문 추가 버튼 */}
                        <button type="button" className="add-question-btn" onClick={handleAddQuestion}>
                            ⊕ 질문 추가
                        </button>

                        {/* 질문-답변 목록 */}
                        {questions.map((question) => (
                            <QuestionAnswer
                                key={question.id}
                                question={question.question}
                                placeholder={question.placeholder}
                                answerValue={question.answer}
                                onAnswerChange={(answer) => handleQuestionAnswerChange(question.id, answer)}
                                onImageUpload={(file) => handleImageUpload(question.id, file)}
                                uploadedImageUrl={questionImages[question.id]?.previewUrl}
                                onDeleteImage={() => handleDeleteImage(question.id)}
                                onDeleteQuestion={question.question !== '자유롭게 이야기를 들려주세요!' ? () => handleDeleteQuestion(question.id) : null}
                                showEmojiPicker={false}
                            />
                        ))}
                    </div>

                    {/* 이모지 피커 */}
                    {showEmojiPicker && (
                        <>
                            <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)} />
                            <div className="emoji-picker">
                                <div className="emoji-picker-title">이모지 선택</div>
                                <div className="emoji-grid">
                                    {(serverEmojis.length ? serverEmojis : FALLBACK_EMOJIS).map((e, index) => {
                                        if (typeof e === 'object') {
                                            return (
                                                <div
                                                    key={e.id}
                                                    className="emoji-item"
                                                    onClick={() => handleEmojiSelect(e.emoji_image, e.id)}
                                                >
                                                    {e.emoji_image}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div
                                                key={index}
                                                className="emoji-item"
                                                onClick={() => handleEmojiSelect(e, null)}
                                            >
                                                {e}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 하단 액션 버튼 */}
                    <div className="form-actions">
                        <div className="spoiler-checkbox-container">
                            <input
                                type="checkbox"
                                id="spoiler-check"
                                className="spoiler-checkbox"
                                checked={hasSpoiler}
                                onChange={(e) => setHasSpoiler(e.target.checked)}
                            />
                            <label htmlFor="spoiler-check" className="spoiler-label">
                                포스트가 스포일러를 포함하고 있어요.
                            </label>
                        </div>
                        <div className="action-button-row">
                            <button
                                type="button"
                                className="privacy-btn"
                                onClick={() => setShowPrivacyModal(true)}
                            >
                                {privacy}
                            </button>

                            <button
                                type="button"
                                className="submit-btn"
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                            >
                                {submitting ? '수정 중…' : '수정 완료'}
                            </button>
                        </div>
                    </div>

                    {/* 공개범위 선택 모달 */}
                    <PrivacySelector
                        isOpen={showPrivacyModal}
                        onClose={() => setShowPrivacyModal(false)}
                        onSelect={setPrivacy}
                    />

                    {/* 질문 선택 모달 */}
                    <QuestionModal
                        isOpen={showQuestionModal}
                        onClose={() => setShowQuestionModal(false)}
                        onSelectQuestion={handleSelectQuestion}
                        availableQuestions={getAvailableQuestions()}
                        isLoading={serverQuestionsLoading}
                        error={serverQuestionsError}
                        onRetry={fetchQuestions}
                    />
                </div>
            </div>
        </div>
    );
}
