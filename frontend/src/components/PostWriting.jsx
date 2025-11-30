import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuestionAnswer from './QuestionAnswer';
import PrivacySelector from './PrivacySelector';
import QuestionModal from './QuestionModal';
import { getQuestions, createPost } from '../api'; // api.js에서 가져옴

// MUI Rating & Icons
import Rating from '@mui/material/Rating';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';

// local fallback in case server emojis fail
const FALLBACK_EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// 백엔드 URL (Vite 환경변수 또는 하드코딩)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function PostWriting({ movie, onBack, onSubmit }) {
    const [postTitle, setPostTitle] = useState('');
    
    // 시청날짜 디폴트값을 오늘 날짜로 설정
    const [watchDate, setWatchDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    
    const [rating, setRating] = useState(0);
    const [privacy, setPrivacy] = useState('전체공개');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [serverEmojis, setServerEmojis] = useState([]);
    const [selectedEmojiId, setSelectedEmojiId] = useState(null);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [hasSpoiler, setHasSpoiler] = useState(false);
    
    const [questions, setQuestions] = useState([
        {
            id: 1,
            question: '자유롭게 이야기를 들려주세요!',
            placeholder: '',
            answer: '',
            uploadedImageUrl: null,
            uploadedImageFile: null
        }
    ]);
    
    const [serverQuestions, setServerQuestions] = useState([]);
    const [serverQuestionsLoading, setServerQuestionsLoading] = useState(false);
    const [serverQuestionsError, setServerQuestionsError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleAddQuestion = () => {
        setShowQuestionModal(true);
    };

    const handleSelectQuestion = (selectedQuestion) => {
        const isObj = selectedQuestion && typeof selectedQuestion === 'object';
        const newQuestion = {
            id: Date.now(),
            question: isObj ? selectedQuestion.content : selectedQuestion,
            placeholder: '',
            answer: '',
            uploadedImageUrl: null,
            uploadedImageFile: null,
            ...(isObj ? { question_id: selectedQuestion.id } : {}),
        };
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

    const fetchQuestions = async () => {
        setServerQuestionsLoading(true);
        setServerQuestionsError(null);
        try {
            const data = await getQuestions();
            if (Array.isArray(data)) {
                setServerQuestions(data);
                setQuestions((prev) => {
                    const mainIdx = prev.findIndex(q => q.question === '자유롭게 이야기를 들려주세요!');
                    if (mainIdx === -1) return prev;
                    
                    const main = prev[mainIdx];
                    // [수정] 텍스트가 조금 달라도 찾을 수 있게 includes 사용
                    const serverMain = data.find(s => s.content.includes('자유롭게'));
                    
                    if (serverMain) {
                        const updated = [...prev];
                        updated[mainIdx] = { ...main, question_id: serverMain.id };
                        return updated;
                    }
                    return prev;
                });
            } else setServerQuestions([]);
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

    const handleQuestionAnswerChange = (questionId, answer) => {
        setQuestions(questions.map(q => 
            q.id === questionId ? { ...q, answer } : q
        ));
    };

    // 이미지 업로드 핸들러
    const handleImageUpload = (questionId, file) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setQuestions(questions.map(q => 
                    q.id === questionId 
                        ? { ...q, uploadedImageUrl: e.target.result, uploadedImageFile: file }
                        : q
                ));
            };
            reader.readAsDataURL(file);
        }
    };

    // 이미지 삭제 핸들러
    const handleDeleteImage = (questionId) => {
        setQuestions(questions.map(q => 
            q.id === questionId 
                ? { ...q, uploadedImageUrl: null, uploadedImageFile: null }
                : q
        ));
    };

    const mapPrivacy = (p) => {
        if (!p) return 'public';
        if (p.includes('전체')) return 'public';
        if (p.includes('친구')) return 'friends';
        if (p.includes('비공개') || p.includes('나만')) return 'private';
        return 'public';
    };

    // 이미지를 포스트 생성 후에 업로드하는 함수
// 이미지를 포스트 생성 후에 업로드하는 함수
    const uploadMediaAfterPost = async (postId, questionId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('post_id', postId.toString());
        formData.append('question_id', questionId.toString());
        formData.append('media_type', 'image');

        const userId = localStorage.getItem('user_id') || '1';
        
        // [CORS 해결] BACKEND_URL 제거하고 상대 경로 사용
        const res = await fetch(`/api/v1/medias/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-User-Id': userId,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error('이미지 업로드 실패: ' + errorText);
        }
        
        const result = await res.json();
        return result;
    };

    // [중요 수정] 핸들 서밋: 데이터 타입 변환 및 에러 핸들링 강화
const handleSubmit = async () => {
        const mainQ = questions.find(q => q.question.includes('자유롭게'));
        const mainAnswer = mainQ?.answer?.trim() || '';

        if (!mainAnswer) {
            alert('자유롭게 이야기를 들려주세요! 항목에 내용을 입력해주세요.');
            return;
        }

        const validAnswers = questions
            .filter(q => q.answer && q.answer.trim() !== '' && q.question_id)
            .map(q => ({ 
                question_id: Number(q.question_id),
                answer: q.answer 
            }));

        if (validAnswers.length === 0) {
            alert("질문 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                tmdb_id: Number(movie.id),
                title: postTitle || `${movie.title} 감상`,
                // [평점 수정] rating이 존재하고 0보다 클 때만 숫자로 변환해서 전송
                rating: (rating && rating > 0) ? Number(rating) : undefined,
                emojis_id: selectedEmojiId ? Number(selectedEmojiId) : undefined,
                visibility: mapPrivacy(privacy),
                spoiler: !!hasSpoiler,
                watch_date: watchDate,
                answers: validAnswers,
                medias: [],
            };

            console.log('📤 포스트 생성 데이터:', payload); // 콘솔에서 rating 값이 제대로 들어있는지 확인해보세요!

            const postResponse = await createPost(payload);
            const postId = postResponse.post_id;

            // 이미지 업로드 로직
            const questionsWithImages = questions.filter(q => q.uploadedImageFile && q.question_id);
            if (questionsWithImages.length > 0) {
                await Promise.all(questionsWithImages.map(async (q) => {
                    try {
                        await uploadMediaAfterPost(postId, Number(q.question_id), q.uploadedImageFile);
                    } catch (err) {
                        console.error(`❌ 이미지 업로드 실패 (QID: ${q.question_id}):`, err);
                    }
                }));
            }

            onSubmit(postResponse);

        } catch (e) {
            console.error('❌ 작성 실패:', e);
            alert(`포스트 작성 실패: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // 이모지 선택 핸들러 - 평점 옆의 이모지만 선택
    const handleEmojiSelect = (emoji, emojiId=null) => {
        setSelectedEmojiId(emojiId);
        setSelectedEmoji(emoji);
        setShowEmojiPicker(false);
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/v1/emojis/');
                if (!res.ok) return;
                const data = await res.json();
                setServerEmojis(Array.isArray(data) ? data : []);
            } catch {
                // ignore, will use fallback
            }
        })();
    }, []);

    const mainQ = questions.find(q => q.question.includes('자유롭게'));
    const canSubmit = (mainQ?.answer && mainQ.answer.trim() !== '');

    return (
        <div className="post-writing-container">
            <div className="search-header">
                <button className="back-button" onClick={onBack}>
                    취소
                </button>
                <h2 className="search-title">포스트 작성</h2>
            </div>

            <div className="post-form">
                <div className="form-group">
                    <input
                        type="text"
                        className="title-input"
                        placeholder="게시글 제목을 입력해주세요"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                    />
                </div>

                <div className="selected-movie">
                    <div className="selected-movie-card">
                        <ImageWithFallback 
                            src={movie.poster} 
                            alt={movie.title}
                            className="selected-movie-poster"
                        />
                        <div className="selected-movie-info">
                            <h3 className="selected-movie-title">{movie.title}</h3>
                            <div className="selected-movie-detail">개봉일 | {movie.releaseDate}</div>
                            {movie.runtime && <div className="selected-movie-detail">상영시간 | {movie.runtime}분</div>}
                            {movie.genre && <div className="selected-movie-detail">장르 | {movie.genre}</div>}
                            {movie.director && <div className="selected-movie-detail">감독 | {movie.director}</div>}
                        </div>
                    </div>
                </div>

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
                                className="emoji-trigger"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                {selectedEmoji || '😊'}
                            </button>
                        </div>
                    </div>
                </div>

                <button className="add-question-btn" onClick={handleAddQuestion}>
                    ⊕ 질문 추가
                </button>

                {questions.map((question) => (
                    <QuestionAnswer
                        key={question.id}
                        question={question.question}
                        placeholder=""
                        answerValue={question.answer}
                        onAnswerChange={(answer) => handleQuestionAnswerChange(question.id, answer)}
                        onImageUpload={(file) => handleImageUpload(question.id, file)}
                        uploadedImageUrl={question.uploadedImageUrl}
                        onDeleteImage={() => handleDeleteImage(question.id)}
                    />
                ))}
            </div>

            {showEmojiPicker && (
                <>
                    <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)} />
                    <div className="emoji-picker">
                        <div className="emoji-picker-title">이모지 선택</div>
                        <div className="emoji-grid">
                            {(serverEmojis.length ? serverEmojis : FALLBACK_EMOJIS).map((e, index) => {
                                if (typeof e === 'object') {
                                    return (
                                        <div key={e.id} className="emoji-item" onClick={() => handleEmojiSelect(e.emoji_image, e.id)}>
                                            {e.emoji_image}
                                        </div>
                                    );
                                }
                                return (
                                    <div key={index} className="emoji-item" onClick={() => handleEmojiSelect(e, null)}>
                                        {e}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

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
                        className="privacy-btn"
                        onClick={() => setShowPrivacyModal(true)}
                    >
                        {privacy}
                    </button>

                    <button 
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                    >
                        {submitting ? '작성 중…' : '작성 완료'}
                    </button>
                </div>
            </div>

            <PrivacySelector
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                onSelect={setPrivacy}
            />

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