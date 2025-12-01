import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuestionAnswer from './QuestionAnswer';
import PrivacySelector from './PrivacySelector';
import QuestionModal from './QuestionModal';
import { getQuestions, createPost } from '../api';

// MUI Rating & Icons
import Rating from '@mui/material/Rating';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';

// local fallback in case server emojis fail
const FALLBACK_EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// 미디어 업로드 함수 (포스트 생성 후 호출)
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

export default function PostWriting({ movie, onBack, onSubmit }) {
    const [postTitle, setPostTitle] = useState('');
    const [watchDate, setWatchDate] = useState('2025-09-01');
    const [rating, setRating] = useState(0);
    const [privacy, setPrivacy] = useState('전체공개');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [serverEmojis, setServerEmojis] = useState([]);
    const [selectedEmojiId, setSelectedEmojiId] = useState(null);
    const [hasSpoiler, setHasSpoiler] = useState(false);
    
    // 질문 상태 (question_id는 서버에서 받아온 실제 ID)
    const [questions, setQuestions] = useState([
        {
            id: 1,  // 프론트엔드용 로컬 ID
            question_id: null,  // 서버 DB의 실제 question_id (나중에 설정됨)
            question: '자유롭게 이야기를 들려주세요!',
            placeholder: '자유롭게 이야기를 들려주세요!',
            answer: '',
        }
    ]);
    
    // 질문별 이미지 파일 상태: { [localQuestionId]: { file: File, previewUrl: string } }
    const [questionImages, setQuestionImages] = useState({});
    
    const [serverQuestions, setServerQuestions] = useState([]);
    const [serverQuestionsLoading, setServerQuestionsLoading] = useState(false);
    const [serverQuestionsError, setServerQuestionsError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // 질문 목록 로드
    const fetchQuestions = async () => {
        setServerQuestionsLoading(true);
        setServerQuestionsError(null);
        try {
            const data = await getQuestions();
            if (Array.isArray(data)) {
                setServerQuestions(data);
                // 기본 질문의 question_id 설정
                setQuestions((prev) => {
                    const mainIdx = prev.findIndex(q => q.question === '자유롭게 이야기를 들려주세요!');
                    if (mainIdx === -1) return prev;
                    const serverMain = data.find(s => s.content === '자유롭게 이야기를 들려주세요!');
                    if (serverMain) {
                        const updated = [...prev];
                        updated[mainIdx] = { ...prev[mainIdx], question_id: serverMain.id };
                        return updated;
                    }
                    return prev;
                });
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
            id: Date.now(),
            question_id: isObj ? selectedQuestion.id : null,
            question: isObj ? selectedQuestion.content : selectedQuestion,
            placeholder: isObj ? selectedQuestion.content : selectedQuestion,
            answer: '',
        };
        
        // 기본 질문은 항상 마지막에 유지
        const fixedQuestion = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        const otherQuestions = questions.filter(q => q.question !== '자유롭게 이야기를 들려주세요!');
        
        if (fixedQuestion) {
            setQuestions([...otherQuestions, newQuestion, fixedQuestion]);
        } else {
            setQuestions([...questions, newQuestion]);
        }
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

    // 이미지 업로드 핸들러 (File 객체 저장)
    const handleImageUpload = (localQuestionId, file) => {
        const previewUrl = URL.createObjectURL(file);
        setQuestionImages(prev => ({
            ...prev,
            [localQuestionId]: { file, previewUrl }
        }));
    };

    // 이미지 삭제 핸들러
    const handleDeleteImage = (localQuestionId) => {
        setQuestionImages(prev => {
            const newState = { ...prev };
            if (newState[localQuestionId]?.previewUrl) {
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
        // 기본 질문 답변 확인
        const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        const mainAnswer = mainQ?.answer?.trim() || '';
        if (!mainAnswer) {
            alert('자유롭게 이야기를 들려주세요! 항목에 내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. 포스트 생성 (이미지 없이)
            const payload = {
                tmdb_id: movie.id,
                title: postTitle || `${movie.title} 감상`,
                rating: rating || undefined,
                emojis_id: selectedEmojiId || undefined,
                visibility: mapPrivacy(privacy),
                spoiler: !!hasSpoiler,
                answers: questions
                    .filter(q => q.answer && q.answer.trim() !== '' && q.question_id)
                    .map(q => ({ question_id: q.question_id, answer: q.answer })),
                medias: [],  // 이미지는 포스트 생성 후 별도 업로드
            };

            console.log('📝 포스트 생성 payload:', payload);
            const data = await createPost(payload);
            console.log('✅ 포스트 생성 완료:', data);

            const postId = data.post_id;
            if (!postId) {
                throw new Error('포스트 ID를 받지 못했습니다.');
            }

            // 2. 이미지 업로드 (포스트 생성 후)
            const imageEntries = Object.entries(questionImages);
            if (imageEntries.length > 0) {
                console.log(`📸 ${imageEntries.length}개 이미지 업로드 시작...`);
                
                for (const [localIdStr, imageData] of imageEntries) {
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
                        // 이미지 업로드 실패해도 포스트는 이미 생성됨 - 경고만 표시
                        alert(`이미지 업로드 중 일부 오류가 발생했습니다: ${uploadErr.message}`);
                    }
                }
            }

            // 3. 완료 콜백
            onSubmit(data);

        } catch (e) {
            console.error('❌ 포스트 작성 실패:', e);
            alert(`포스트 작성 중 오류가 발생했습니다: ${e.message}`);
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
                if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
            });
        };
    }, []);

    const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
    const canSubmit = mainQ?.answer && mainQ.answer.trim() !== '';

    return (
        <div className="post-writing-container">
            <div className="search-header">
                <button className="back-button" onClick={onBack}>
                    취소
                </button>
                <h2 className="search-title">포스트 작성</h2>
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
                <div className="selected-movie">
                    <div className="selected-movie-card">
                        <ImageWithFallback 
                            src={movie.poster || movie.poster_path} 
                            alt={movie.title}
                            className="selected-movie-poster"
                        />
                        <div className="selected-movie-info">
                            <h3 className="selected-movie-title">{movie.title}</h3>
                            <div className="selected-movie-detail">개봉일 | {movie.releaseDate || movie.release_date || '-'}</div>
                            <div className="selected-movie-detail">상영시간 | {movie.runtime || 133}분</div>
                            <div className="selected-movie-detail">장르 | {movie.genre || '-'}</div>
                            <div className="selected-movie-detail">감독 | {movie.director || '-'}</div>
                        </div>
                    </div>
                </div>

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
                        {submitting ? '작성 중…' : '작성 완료'}
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
    );
}
