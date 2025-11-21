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



// import { useState, useEffect } from 'react';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import QuestionAnswer from './QuestionAnswer';
// import PrivacySelector from './PrivacySelector';
// import QuestionModal from './QuestionModal';
// import { getQuestions, createPost } from '../api';

// // MUI Rating & Icons
// import Rating from '@mui/material/Rating';
// import Star from '@mui/icons-material/Star';
// import StarBorder from '@mui/icons-material/StarBorder';

// // local fallback in case server emojis fail
// const FALLBACK_EMOJIS = ['ðŸ˜Š', 'ðŸ˜¢', 'ðŸ˜', 'ðŸ˜®', 'ðŸ˜±', 'ðŸ˜‚', 'ðŸ˜¡', 'ðŸ˜´', 'ðŸ¤”', 'ðŸ˜Ž'];

// export default function PostWriting({ movie, onBack, onSubmit }) {
//     const [postTitle, setPostTitle] = useState('');
//     const [watchDate, setWatchDate] = useState('2025-09-01');
//     const [rating, setRating] = useState(0);
//     const [privacy, setPrivacy] = useState('ì „ì²´ê³µê°œ');
//     const [showPrivacyModal, setShowPrivacyModal] = useState(false);
//     const [showQuestionModal, setShowQuestionModal] = useState(false);
//     const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//     const [serverEmojis, setServerEmojis] = useState([]);
//     const [selectedEmojiId, setSelectedEmojiId] = useState(null);
//     const [hasSpoiler, setHasSpoiler] = useState(false);
//     const [questions, setQuestions] = useState([
//         {
//             id: 1,
//             question: 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!',
//             placeholder: 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!',
//             answer: '',
//             showEmojiPicker: false
//         }
//     ]);
//     const [serverQuestions, setServerQuestions] = useState([]);
//     const [serverQuestionsLoading, setServerQuestionsLoading] = useState(false);
//     const [serverQuestionsError, setServerQuestionsError] = useState(null);
//     const [submitting, setSubmitting] = useState(false);

//     // Questions are seeded on the backend (see prisma seeds). Use server-provided
//     // questions only; do not fall back to a local list so the modal reflects the
//     // canonical questions defined in `prisma/seeds/questions.sql`.

//     const handleAddQuestion = () => {
//         setShowQuestionModal(true);
//     };

//     const handleSelectQuestion = (selectedQuestion) => {
//         // `selectedQuestion` may be a string (legacy) or an object from server
//         // `{ id, content }`. Preserve server question id when available so the
//         // frontend can send `question_id` in the post payload and the backend
//         // will store answers properly in the answers table.
//         const isObj = selectedQuestion && typeof selectedQuestion === 'object';
//         const newQuestion = {
//             id: Date.now(),
//             question: isObj ? selectedQuestion.content : selectedQuestion,
//             placeholder: isObj ? selectedQuestion.content : selectedQuestion,
//             answer: '',
//             showEmojiPicker: false,
//             // only include question_id when we have one from the server
//             ...(isObj ? { question_id: selectedQuestion.id } : {}),
//         };
//         const fixedQuestion = questions.find(q => q.question === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//         const otherQuestions = questions.filter(q => q.question !== 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
        
//         if (fixedQuestion) {
//             setQuestions([...otherQuestions, newQuestion, fixedQuestion]);
//         } else {
//             setQuestions([...questions, newQuestion]);
//         }
//     };

//     const getAvailableQuestions = () => {
//         // Always use server-seeded questions. The backend endpoint returns
//         // objects: { id, content } and we preserve the id so answers can be
//         // stored against the questions table.
//         if (serverQuestions && serverQuestions.length) {
//             return serverQuestions.filter(s => !questions.some(q => q.question === s.content));
//         }
//         // If no server questions are available (shouldn't happen in a seeded DB),
//         // return an empty array so the UI indicates there are no available items.
//         return [];
//     };

//     // fetchQuestions is used on mount and also passed to the modal for retry
//     const fetchQuestions = async () => {
//         setServerQuestionsLoading(true);
//         setServerQuestionsError(null);
//         try {
//             const data = await getQuestions();
//             if (Array.isArray(data)) {
//                 setServerQuestions(data);
//                 // if server has the canonical main question, attach its id to the main local question
//                 setQuestions((prev) => {
//                     const mainIdx = prev.findIndex(q => q.question === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//                     if (mainIdx === -1) return prev;
//                     const main = prev[mainIdx];
//                     const serverMain = data.find(s => s.content === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//                     if (serverMain) {
//                         const updated = [...prev];
//                         updated[mainIdx] = { ...main, question_id: serverMain.id };
//                         return updated;
//                     }
//                     return prev;
//                 });
//             } else setServerQuestions([]);
//         } catch (err) {
//             console.error('Failed to load questions:', err);
//             setServerQuestionsError(String(err));
//         } finally {
//             setServerQuestionsLoading(false);
//         }
//     };

//     useEffect(() => {
//         // call fetchQuestions (it updates state via setServerQuestions...)
//         fetchQuestions();
//     }, []);

//     const handleQuestionAnswerChange = (questionId, answer) => {
//         setQuestions(questions.map(q => 
//             q.id === questionId ? { ...q, answer } : q
//         ));
//     };

//     const mapPrivacy = (p) => {
//         if (!p) return 'public';
//         if (p.includes('ì „ì²´')) return 'public';
//         if (p.includes('ì¹œêµ¬')) return 'friends';
//         if (p.includes('ë¹„ê³µê°œ')) return 'private';
//         return 'public';
//     };

//     const handleSubmit = async () => {
//         // ensure main question exists and has answer
//         const mainQ = questions.find(q => q.question === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//         const mainAnswer = mainQ?.answer?.trim() || '';
//         if (!mainAnswer) {
//             alert('ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”! í•­ëª©ì— ë‚´ìš©ì„ ìž…ë ¥í•´ì£¼ì„¸ìš”.');
//             return;
//         }

//         setSubmitting(true);

//         try {
//             const payload = {
//                 tmdb_id: movie.id,
//                 title: postTitle || `${movie.title} ê°ìƒ`,
//                 rating: rating || undefined,
//                 emojis_id: selectedEmojiId || undefined,
//                 visibility: mapPrivacy(privacy),
//                 spoiler: !!hasSpoiler,
//                 answers: questions
//                     .filter(q => q.answer && q.answer.trim() !== '' && q.question_id)
//                     .map(q => ({ question_id: q.question_id, answer: q.answer })),
//                 medias: [],
//             };

//             const data = await createPost(payload);
//             // call parent onSubmit with created post id or message
//             onSubmit(data);
//         } catch (e) {
//             console.error(e);
//             alert('í¬ìŠ¤íŠ¸ ìž‘ì„± ì¤‘ ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.');
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     const handleEmojiSelect = (emoji, emojiId=null) => {
//         const mainQuestion = questions.find(q => q.question === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//         if (mainQuestion) {
//             const currentAnswer = mainQuestion.answer || '';
//             handleQuestionAnswerChange(mainQuestion.id, currentAnswer + emoji);
//         }
//         setSelectedEmojiId(emojiId);
//         setShowEmojiPicker(false);
//     };

//     useEffect(() => {
//         // load emojis from server
//         (async () => {
//             try {
//                 const res = await fetch('/api/v1/emojis/');
//                 if (!res.ok) return;
//                 const data = await res.json();
//                 setServerEmojis(Array.isArray(data) ? data : []);
//             } catch {
//                 // ignore, will use fallback
//             }
//         })();
//     }, []);

//     const mainQ = questions.find(q => q.question === 'ìžìœ ë¡­ê²Œ ì´ì•¼ê¸°ë¥¼ ë“¤ë ¤ì£¼ì„¸ìš”!');
//     const canSubmit = (mainQ?.answer && mainQ.answer.trim() !== '');

//     return (
//         <div className="post-writing-container">
//             <div className="search-header">
//                 <button className="back-button" onClick={onBack}>
//                     ì·¨ì†Œ
//                 </button>
//                 <h2 className="search-title">í¬ìŠ¤íŠ¸ ìž‘ì„±</h2>
//             </div>

//             <div className="post-form">
//                 <div className="form-group">
//                     <input
//                         type="text"
//                         className="title-input"
//                         placeholder="ê²Œì‹œê¸€ ì œëª©ì„ ìž…ë ¥í•´ì£¼ì„¸ìš”"
//                         value={postTitle}
//                         onChange={(e) => setPostTitle(e.target.value)}
//                     />
//                 </div>

//                 <div className="selected-movie">
//                     <div className="selected-movie-card">
//                         <ImageWithFallback 
//                             src={movie.poster} 
//                             alt={movie.title}
//                             className="selected-movie-poster"
//                         />
//                         <div className="selected-movie-info">
//                             <h3 className="selected-movie-title">{movie.title}</h3>
//                             <div className="selected-movie-detail">ê°œë´‰ì¼ | {movie.releaseDate}</div>
//                             <div className="selected-movie-detail">ìƒì˜ì‹œê°„ | 133ë¶„</div>
//                             <div className="selected-movie-detail">ìž¥ë¥´ | {movie.genre}</div>
//                             <div className="selected-movie-detail">ê°ë… | {movie.director}</div>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="form-group">
//                     <div className="date-header">
//                         <label className="form-label">ì‹œì²­ ë‚ ì§œ</label>
//                         <div className="date-input-container">
//                             <input
//                                 type="date"
//                                 className="date-input"
//                                 value={watchDate}
//                                 onChange={(e) => setWatchDate(e.target.value)}
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 <div className="form-group">
//                     <div className="rating-header">
//                         <label className="form-label">í‰ì </label>

//                         {/* â˜…â˜…â˜… ì—¬ê¸°ë¶€í„° MUI Rating ì ìš© â˜…â˜…â˜… */}
//                         <div className="rating-container">
//                             <Rating
//                                 name="post-rating"
//                                 value={rating}
//                                 onChange={(_, v) => setRating(v ?? 0)}
//                                 precision={0.5}  // 0.5 ë‹¨ìœ„ ì„ íƒ
//                                 // ì±„ì›Œì§„ ë³„
//                                 icon={
//                                     <Star
//                                         sx={{
//                                             color: 'var(--color-accent)',            // ë‚´ë¶€ ì±„ì›€ìƒ‰ì€ ë¶€ëª¨ color ì‚¬ìš©(ê¸°ë³¸ ìƒì†)
//                                             stroke: 'var(--color-accent)',     // í…Œë‘ë¦¬ ìƒ‰ìƒ
//                                             strokeWidth: 1.5,
//                                         }}
//                                         fontSize="inherit"
//                                     />
//                                 }
//                                 // ë¹ˆ ë³„
//                                 emptyIcon={
//                                     <StarBorder
//                                         sx={{
//                                             color: 'var(--color-accent)',             // ë‚´ë¶€ ë¹„ì›€
//                                             stroke: 'var(--color-accent)',     // í…Œë‘ë¦¬ë§Œ
//                                             strokeWidth: 0.3,
//                                         }}
//                                         fontSize="inherit"
//                                     />
//                                 }
//                             />
//                         </div>
//                         {/* â˜…â˜…â˜… ì—¬ê¸°ê¹Œì§€ â˜…â˜…â˜… */}

//                         <div className="rating-right">
//                             <span className="rating-text">ì´ ì˜í™”ì— ëŒ€í•œ ê°ìƒì€...</span>
//                             <button 
//                                 className="emoji-trigger"
//                                 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//                             >
//                                 ðŸ˜Š
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 <button className="add-question-btn" onClick={handleAddQuestion}>
//                     âŠ• ì§ˆë¬¸ ì¶”ê°€
//                 </button>

//                 {/* ì²¨ë¶€íŒŒì¼ UI ì œê±° â€” ë¯¸ë””ì–´ëŠ” ì§ˆë¬¸ë³„ë¡œ ë³„ë„ ì²˜ë¦¬í•˜ë„ë¡ ì„¤ê³„ë˜ì–´ ìžˆìŠµë‹ˆë‹¤ */}

//                 {questions.map((question) => (
//                     <QuestionAnswer
//                         key={question.id}
//                         question={question.question}
//                         placeholder={question.placeholder}
//                         onAnswerChange={(answer) => handleQuestionAnswerChange(question.id, answer)}
//                         showEmojiPicker={false}
//                         onEmojiSelect={(emoji) => {
//                             const currentAnswer = questions.find(q => q.id === question.id)?.answer || '';
//                             handleQuestionAnswerChange(question.id, currentAnswer + emoji);
//                         }}
//                     />
//                 ))}
//             </div>

//             {showEmojiPicker && (
//                 <>
//                     <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)} />
//                     <div className="emoji-picker">
//                         <div className="emoji-picker-title">ì´ëª¨ì§€ ì„ íƒ</div>
//                         <div className="emoji-grid">
//                                     {(serverEmojis.length ? serverEmojis : FALLBACK_EMOJIS).map((e, index) => {
//                                         // serverEmojis entries are objects {id,name,emoji_image}
//                                         if (typeof e === 'object') {
//                                             return (
//                                                 <div key={e.id} className="emoji-item" onClick={() => handleEmojiSelect(e.emoji_image, e.id)}>
//                                                     {e.emoji_image}
//                                                 </div>
//                                             );
//                                         }
//                                         return (
//                                             <div key={index} className="emoji-item" onClick={() => handleEmojiSelect(e, null)}>
//                                                 {e}
//                                             </div>
//                                         );
//                                     })}
//                         </div>
//                     </div>
//                 </>
//             )}

//             <div className="form-actions">
//                 <div className="spoiler-checkbox-container">
//                     <input 
//                         type="checkbox" 
//                         id="spoiler-check"
//                         className="spoiler-checkbox"
//                         checked={hasSpoiler}
//                         onChange={(e) => setHasSpoiler(e.target.checked)}
//                     />
//                     <label htmlFor="spoiler-check" className="spoiler-label">
//                         í¬ìŠ¤íŠ¸ê°€ ìŠ¤í¬ì¼ëŸ¬ë¥¼ í¬í•¨í•˜ê³  ìžˆì–´ìš”.
//                     </label>
//                 </div>
//                     <div className="action-button-row">
//                         <button 
//                             className="privacy-btn"
//                             onClick={() => setShowPrivacyModal(true)}
//                         >
//                             {privacy}
//                         </button>

//                         <button 
//                             className="submit-btn"
//                             onClick={handleSubmit}
//                             disabled={!canSubmit || submitting}
//                         >
//                             {submitting ? 'ìž‘ì„± ì¤‘â€¦' : 'ìž‘ì„± ì™„ë£Œ'}
//                         </button>
//                     </div>
//                 </div>

//             <PrivacySelector
//                 isOpen={showPrivacyModal}
//                 onClose={() => setShowPrivacyModal(false)}
//                 onSelect={setPrivacy}
//             />

//             <QuestionModal
//                 isOpen={showQuestionModal}
//                 onClose={() => setShowQuestionModal(false)}
//                 onSelectQuestion={handleSelectQuestion}
//                 availableQuestions={getAvailableQuestions()}
//                 isLoading={serverQuestionsLoading}
//                 error={serverQuestionsError}
//                 onRetry={fetchQuestions}
//             />
//         </div>
//     );
// }



// import { useState, useEffect } from 'react';
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import QuestionAnswer from './QuestionAnswer';
// import PrivacySelector from './PrivacySelector';
// import QuestionModal from './QuestionModal';
// import { getQuestions, createPost, uploadMedia } from '../api'; 

// // MUI Rating
// import Rating from '@mui/material/Rating';
// import Star from '@mui/icons-material/Star';
// import StarBorder from '@mui/icons-material/StarBorder';

// const FALLBACK_EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// export default function PostWriting({ movie, onBack, onSubmit }) {
//     const [postTitle, setPostTitle] = useState('');
//     const [watchDate, setWatchDate] = useState(new Date().toISOString().split('T')[0]);
//     const [rating, setRating] = useState(0);
//     const [privacy, setPrivacy] = useState('전체공개');
//     const [showPrivacyModal, setShowPrivacyModal] = useState(false);
//     const [showQuestionModal, setShowQuestionModal] = useState(false);
//     const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//     const [selectedEmoji, setSelectedEmoji] = useState(null);
//     const [hasSpoiler, setHasSpoiler] = useState(false);
//     const [submitting, setSubmitting] = useState(false);
//     const [serverQuestions, setServerQuestions] = useState([]);

//     // 질문 목록 State
//     const [questions, setQuestions] = useState([
//         {
//             id: 'main_q', // 로컬 식별자
//             question: '자유롭게 이야기를 들려주세요!',
//             placeholder: '영화의 감상평을 자유롭게 적어주세요.',
//             answer: '',
//             mediaId: null,
//             mediaUrl: null,
//             question_id: null // 나중에 서버 질문 리스트와 매핑
//         }
//     ]);

//     // 서버 질문 로드 및 기본 질문 매핑
//     useEffect(() => {
//         const initQuestions = async () => {
//              const data = await getQuestions();
//              setServerQuestions(data || []);
             
//              // '자유롭게...' 질문의 ID 찾아서 매핑
//              if (data) {
//                  const serverMain = data.find(q => q.content.includes('자유롭게'));
//                  if (serverMain) {
//                      setQuestions(prev => prev.map(q => 
//                          q.id === 'main_q' ? { ...q, question_id: serverMain.id } : q
//                      ));
//                  }
//              }
//         };
//         initQuestions();
//     }, []);

//     // 질문 추가 핸들러
//     const handleSelectQuestion = (selectedQ) => {
//         const content = typeof selectedQ === 'object' ? selectedQ.content : selectedQ;
//         const qId = typeof selectedQ === 'object' ? selectedQ.id : null;

//         if (questions.some(q => q.question === content)) return;

//         const newQ = {
//             id: Date.now(),
//             question: content,
//             placeholder: '답변을 입력해주세요.',
//             answer: '',
//             mediaId: null,
//             mediaUrl: null,
//             question_id: qId
//         };
//         setQuestions(prev => [newQ, ...prev]); // 새 질문은 위쪽에 추가
//     };

//     const handleAnswerChange = (id, text) => {
//         setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer: text } : q));
//     };

//     // 이미지 업로드 핸들러
//     const handleImageUpload = async (qId, file) => {
//         try {
//             const uploaded = await uploadMedia(file); 
//             setQuestions(prev => prev.map(q => 
//                 q.id === qId ? { 
//                     ...q, 
//                     mediaId: uploaded.media_id || uploaded.id, 
//                     mediaUrl: uploaded.file_path 
//                 } : q
//             ));
//         } catch (e) {
//             console.error('이미지 업로드 실패', e);
//             alert('이미지 업로드 중 오류가 발생했습니다.');
//         }
//     };

//     const handleImageDelete = (qId) => {
//         setQuestions(prev => prev.map(q => 
//             q.id === qId ? { ...q, mediaId: null, mediaUrl: null } : q
//         ));
//     };

//     const handleSubmit = async () => {
//         if (!postTitle.trim()) {
//             alert('제목을 입력해주세요.');
//             return;
//         }
        
//         setSubmitting(true);
//         try {
//             const payload = {
//                 tmdb_id: movie.id,
//                 title: postTitle,
//                 rating: rating,
//                 emojis_id: selectedEmoji?.id, 
//                 visibility: privacy === '전체공개' ? 'public' : privacy === '친구공개' ? 'friends' : 'private',
//                 spoiler: hasSpoiler,
//                 watch_date: watchDate,
//                 answers: questions
//                     .filter(q => q.answer.trim() !== '' || q.mediaId)
//                     .map(q => ({
//                         question_id: q.question_id || 1, 
//                         answer: q.answer,
//                     })),
//                  medias: questions
//                     .filter(q => q.mediaId)
//                     .map(q => ({
//                         media_id: q.mediaId,
//                         question_id: q.question_id || 1
//                     }))
//             };

//             await createPost(payload);
//             onSubmit(); 
//         } catch (e) {
//             console.error(e);
//             alert('포스트 작성 실패');
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="post-writing-page" style={{ paddingBottom: '80px', background:'#fff', height:'100vh' }}>
//             <div className="search-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom:'1px solid #f0f0f0' }}>
//                 <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '16px', cursor:'pointer' }}>취소</button>
//                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin:0 }}>포스트 작성</h2>
//                 <div style={{ width: '30px' }}></div> 
//             </div>

//             <div className="content-scroll" style={{ padding: '20px', height: 'calc(100vh - 140px)', overflowY:'auto' }}>
//                 <input 
//                     type="text" 
//                     placeholder="제목을 입력해주세요"
//                     value={postTitle}
//                     onChange={e => setPostTitle(e.target.value)}
//                     style={{ width: '100%', fontSize: '20px', fontWeight: 'bold', border: 'none', outline: 'none', marginBottom: '20px', borderBottom:'1px solid #eee', paddingBottom:'10px' }}
//                 />

//                 <div style={{ display: 'flex', marginBottom: '20px', background: '#f9f9f9', padding: '12px', borderRadius: '8px' }}>
//                     <ImageWithFallback src={movie.poster} style={{ width: '60px', borderRadius: '4px', marginRight: '12px', objectFit:'cover' }} />
//                     <div>
//                         <div style={{ fontWeight: 'bold', marginBottom:'4px' }}>{movie.title}</div>
//                         <div style={{ fontSize: '12px', color: '#666' }}>
//                             {movie.releaseDate} · {movie.genre}
//                         </div>
//                     </div>
//                 </div>

//                 <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
//                     <span style={{ fontSize: '14px', color: '#666' }}>시청 날짜</span>
//                     <input 
//                         type="date" 
//                         value={watchDate} 
//                         onChange={e => setWatchDate(e.target.value)}
//                         style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '6px' }}
//                     />
//                 </div>

//                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                         <Rating 
//                             value={rating} 
//                             onChange={(event, newValue) => setRating(newValue)} 
//                             precision={0.5}
//                             icon={<Star sx={{ color: '#E35A5A' }} fontSize="inherit" />}
//                             emptyIcon={<StarBorder sx={{ color: '#E35A5A' }} fontSize="inherit" />}
//                         />
//                     </div>
//                     <button 
//                         onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//                         style={{ fontSize: '24px', background: 'none', border: '1px solid #eee', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor:'pointer' }}
//                     >
//                         {selectedEmoji ? (selectedEmoji.emoji_image || selectedEmoji) : '😊'}
//                     </button>
//                 </div>

//                 {showEmojiPicker && (
//                      <div className="emoji-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px', background: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
//                         {FALLBACK_EMOJIS.map((emo, idx) => (
//                             <div key={idx} onClick={() => { setSelectedEmoji(emo); setShowEmojiPicker(false); }} style={{ fontSize: '24px', cursor: 'pointer', textAlign: 'center' }}>
//                                 {emo}
//                             </div>
//                         ))}
//                      </div>
//                 )}

//                 <div style={{ marginBottom: '16px' }}>
//                     <button 
//                         onClick={() => setShowQuestionModal(true)}
//                         style={{ color: '#E35A5A', background: 'none', border: '1px solid #E35A5A', borderRadius: '20px', padding: '8px 16px', fontSize: '14px', fontWeight: 'bold', cursor:'pointer' }}
//                     >
//                         ⊕ 질문 선택
//                     </button>
//                 </div>

//                 {questions.map((q) => (
//                     <QuestionAnswer
//                         key={q.id}
//                         question={q.question}
//                         placeholder={q.placeholder}
//                         answerValue={q.answer}
//                         onAnswerChange={(val) => handleAnswerChange(q.id, val)}
//                         uploadedImageUrl={q.mediaUrl}
//                         onImageUpload={(file) => handleImageUpload(q.id, file)}
//                         onDeleteImage={() => handleImageDelete(q.id)}
//                     />
//                 ))}
//             </div>

//             <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
//                 <button 
//                     onClick={() => setShowPrivacyModal(true)}
//                     style={{ flex: 1, border: '1px solid #ddd', background: '#fff', borderRadius: '8px', padding: '14px', cursor:'pointer' }}
//                 >
//                     {privacy}
//                 </button>
//                 <button 
//                     onClick={handleSubmit}
//                     disabled={submitting}
//                     style={{ flex: 2, background: '#E35A5A', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: 'bold', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}
//                 >
//                     {submitting ? '저장 중...' : '작성 완료'}
//                 </button>
//             </div>

//             <PrivacySelector isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} onSelect={setPrivacy} />
//             <QuestionModal 
//                 isOpen={showQuestionModal} 
//                 onClose={() => setShowQuestionModal(false)} 
//                 onSelectQuestion={handleSelectQuestion} 
//                 availableQuestions={serverQuestions} 
//             />
//         </div>
//     );
// }

