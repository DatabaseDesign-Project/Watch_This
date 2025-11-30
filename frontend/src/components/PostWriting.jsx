import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuestionAnswer from './QuestionAnswer';
import PrivacySelector from './PrivacySelector';
import QuestionModal from './QuestionModal';
import { getQuestions, createPost, uploadMedia } from '../api';

// MUI Rating & Icons
import Rating from '@mui/material/Rating';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';

// local fallback in case server emojis fail
const FALLBACK_EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

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
    const [questions, setQuestions] = useState([
        {
            id: 1,
            question: '자유롭게 이야기를 들려주세요!',
            placeholder: '자유롭게 이야기를 들려주세요!',
            answer: '',
            uploadedImage: null,
            showEmojiPicker: false
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
            placeholder: isObj ? selectedQuestion.content : selectedQuestion,
            answer: '',
            uploadedImage: null,
            showEmojiPicker: false,
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
                    const serverMain = data.find(s => s.content === '자유롭게 이야기를 들려주세요!');
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

    const handleImageUpload = async (questionId, file) => {
        try {
            // 이미지를 먼저 서버에 업로드
            const result = await uploadMedia(file);
            
            // 업로드된 이미지 URL을 질문에 저장
            setQuestions(questions.map(q => 
                q.id === questionId ? { ...q, uploadedImage: result.file_path } : q
            ));
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다.');
        }
    };

    const handleDeleteImage = (questionId) => {
        setQuestions(questions.map(q => 
            q.id === questionId ? { ...q, uploadedImage: null } : q
        ));
    };

    const mapPrivacy = (p) => {
        if (!p) return 'public';
        if (p.includes('전체')) return 'public';
        if (p.includes('친구')) return 'friends';
        if (p.includes('비공개')) return 'private';
        return 'public';
    };

    const handleSubmit = async () => {
        const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        const mainAnswer = mainQ?.answer?.trim() || '';
        if (!mainAnswer) {
            alert('자유롭게 이야기를 들려주세요! 항목에 내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);

        try {
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
                medias: questions
                    .filter(q => q.uploadedImage && q.question_id)
                    .map(q => ({
                        question_id: q.question_id,
                        media_type: 'image',
                        file_path: q.uploadedImage
                    })),
            };

            const data = await createPost(payload);
            onSubmit(data);
        } catch (e) {
            console.error(e);
            alert('포스트 작성 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEmojiSelect = (emoji, emojiId=null) => {
        const mainQuestion = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        if (mainQuestion) {
            const currentAnswer = mainQuestion.answer || '';
            handleQuestionAnswerChange(mainQuestion.id, currentAnswer + emoji);
        }
        setSelectedEmojiId(emojiId);
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

    const mainQ = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
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
                            <div className="selected-movie-detail">상영시간 | 133분</div>
                            <div className="selected-movie-detail">장르 | {movie.genre}</div>
                            <div className="selected-movie-detail">감독 | {movie.director}</div>
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
                                😊
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
                        placeholder={question.placeholder}
                        answerValue={question.answer}
                        onAnswerChange={(answer) => handleQuestionAnswerChange(question.id, answer)}
                        onImageUpload={(file) => handleImageUpload(question.id, file)}
                        uploadedImageUrl={question.uploadedImage}
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
