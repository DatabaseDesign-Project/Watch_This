import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuestionAnswer from './QuestionAnswer';
import PrivacySelector from './PrivacySelector';
import QuestionModal from './QuestionModal';
import { getQuestions } from '../api';

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
            showEmojiPicker: false
        }
    ]);
    const [serverQuestions, setServerQuestions] = useState([]);
    const [serverQuestionsLoading, setServerQuestionsLoading] = useState(false);
    const [serverQuestionsError, setServerQuestionsError] = useState(null);

    // Questions are seeded on the backend (see prisma seeds). Use server-provided
    // questions only; do not fall back to a local list so the modal reflects the
    // canonical questions defined in `prisma/seeds/questions.sql`.

    const handleAddQuestion = () => {
        setShowQuestionModal(true);
    };

    const handleSelectQuestion = (selectedQuestion) => {
        // `selectedQuestion` may be a string (legacy) or an object from server
        // `{ id, content }`. Preserve server question id when available so the
        // frontend can send `question_id` in the post payload and the backend
        // will store answers properly in the answers table.
        const isObj = selectedQuestion && typeof selectedQuestion === 'object';
        const newQuestion = {
            id: Date.now(),
            question: isObj ? selectedQuestion.content : selectedQuestion,
            placeholder: isObj ? selectedQuestion.content : selectedQuestion,
            answer: '',
            showEmojiPicker: false,
            // only include question_id when we have one from the server
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
        // Always use server-seeded questions. The backend endpoint returns
        // objects: { id, content } and we preserve the id so answers can be
        // stored against the questions table.
        if (serverQuestions && serverQuestions.length) {
            return serverQuestions.filter(s => !questions.some(q => q.question === s.content));
        }
        // If no server questions are available (shouldn't happen in a seeded DB),
        // return an empty array so the UI indicates there are no available items.
        return [];
    };

    // fetchQuestions is used on mount and also passed to the modal for retry
    const fetchQuestions = async () => {
        let mounted = true; // local guard for this invocation
        setServerQuestionsLoading(true);
        setServerQuestionsError(null);
        try {
            const data = await getQuestions();
            if (!mounted) return;
            if (Array.isArray(data)) setServerQuestions(data);
            else setServerQuestions([]);
        } catch (e) {
            console.error('Failed to load questions:', e);
            setServerQuestionsError(String(e));
        } finally {
            setServerQuestionsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        // call fetchQuestions (it updates state via setServerQuestions...)
        fetchQuestions();
        return () => { mounted = false };
    }, []);

    const handleQuestionAnswerChange = (questionId, answer) => {
        setQuestions(questions.map(q => 
            q.id === questionId ? { ...q, answer } : q
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
        // Build payload compatible with backend: either movie_id or tmdb_id
        const payload = {
            // do not hardcode user_id; backend will read X-User-Id header (dev mode)
            tmdb_id: movie.id,
            title: postTitle || `${movie.title} 감상`,
            emojis_id: selectedEmojiId,
            visibility: mapPrivacy(privacy),
            spoiler: !!hasSpoiler,
            // include only answers that map to real question ids (seeded questions)
            answers: questions
                .filter(q => q.answer && q.answer.trim() !== '' && q.question_id)
                .map(q => ({ question_id: q.question_id, answer: q.answer })),
            medias: [],
        };

        try {
            const uid = localStorage.getItem('user_id') || '1';
            const res = await fetch('/api/v1/posts/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // dev helper header so backend knows current user
                    'X-User-Id': uid,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const txt = await res.text();
                console.error('post create failed', res.status, txt);
                alert('포스트 작성 실패: ' + (txt || res.status));
                return;
            }

            const data = await res.json();
            // notify parent to refresh feed
            onSubmit(data);
        } catch (e) {
            console.error(e);
            alert('서버 통신 중 오류가 발생했습니다.');
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
        // load emojis from server
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/v1/emojis/');
                if (!res.ok) return;
                const data = await res.json();
                if (!mounted) return;
                setServerEmojis(Array.isArray(data) ? data : []);
            } catch (e) {
                // ignore, will use fallback
            }
        })();
        return () => { mounted = false };
    }, []);

    const canSubmit = rating > 0 && questions.some(q => q.answer.trim() !== '');

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

                        {/* ★★★ 여기부터 MUI Rating 적용 ★★★ */}
                        <div className="rating-container">
                            <Rating
                                name="post-rating"
                                value={rating}
                                onChange={(_, v) => setRating(v ?? 0)}
                                precision={0.5}  // 0.5 단위 선택
                                // 채워진 별
                                icon={
                                    <Star
                                        sx={{
                                            color: 'var(--color-accent)',            // 내부 채움색은 부모 color 사용(기본 상속)
                                            stroke: 'var(--color-accent)',     // 테두리 색상
                                            strokeWidth: 1.5,
                                        }}
                                        fontSize="inherit"
                                    />
                                }
                                // 빈 별
                                emptyIcon={
                                    <StarBorder
                                        sx={{
                                            color: 'var(--color-accent)',             // 내부 비움
                                            stroke: 'var(--color-accent)',     // 테두리만
                                            strokeWidth: 0.3,
                                        }}
                                        fontSize="inherit"
                                    />
                                }
                            />
                        </div>
                        {/* ★★★ 여기까지 ★★★ */}

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
                        onAnswerChange={(answer) => handleQuestionAnswerChange(question.id, answer)}
                        showEmojiPicker={false}
                        onEmojiSelect={(emoji) => {
                            const currentAnswer = questions.find(q => q.id === question.id)?.answer || '';
                            handleQuestionAnswerChange(question.id, currentAnswer + emoji);
                        }}
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
                                        // serverEmojis entries are objects {id,name,emoji_image}
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
                            disabled={!canSubmit}
                        >
                            작성 완료
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
