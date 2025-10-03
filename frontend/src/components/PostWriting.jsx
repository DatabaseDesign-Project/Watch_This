import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuestionAnswer from './QuestionAnswer';
import PrivacySelector from './PrivacySelector';
import QuestionModal from './QuestionModal';

const EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

export default function PostWriting({ movie, onBack, onSubmit }) {
    const [postTitle, setPostTitle] = useState('');
    const [watchDate, setWatchDate] = useState('2025-09-01');
    const [rating, setRating] = useState(0);
    const [privacy, setPrivacy] = useState('전체공개');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [questions, setQuestions] = useState([
        {
        id: 1,
        question: '자유롭게 이야기를 들려주세요!',
        placeholder: '자유롭게 이야기를 들려주세요!',
        answer: '',
        showEmojiPicker: false
        }
    ]);

    const predefinedQuestions = [
        '가장 기억에 남는 장면은 무엇인가요?',
        '영화의 결말에 대해 어떻게 생각하시나요?',
        '이 영화를 친구에게 추천하시겠어요?',
        '영화를 보고 난 후 기분은 어땠나요?',
        '이 영화의 메시지는 무엇이라고 생각하시나요?'
    ];

    const handleStarClick = (starIndex) => {
        setRating(starIndex + 1);
    };

    const handleAddQuestion = () => {
        setShowQuestionModal(true);
    };

    const handleSelectQuestion = (selectedQuestion) => {
        const newQuestion = {
        id: Date.now(),
        question: selectedQuestion,
        placeholder: selectedQuestion,
        answer: '',
        showEmojiPicker: false
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
        return predefinedQuestions.filter(
        q => !questions.some(existing => existing.question === q)
        );
    };

    const handleQuestionAnswerChange = (questionId, answer) => {
        setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, answer } : q
        ));
    };

    const handleSubmit = () => {
        const postData = {
        title: postTitle,
        movie,
        watchDate,
        rating,
        privacy,
        questions: questions.filter(q => q.answer.trim() !== '')
        };
        
        onSubmit(postData);
    };

    const handleEmojiSelect = (emoji) => {
        const mainQuestion = questions.find(q => q.question === '자유롭게 이야기를 들려주세요!');
        if (mainQuestion) {
        const currentAnswer = mainQuestion.answer || '';
        handleQuestionAnswerChange(mainQuestion.id, currentAnswer + emoji);
        }
        setShowEmojiPicker(false);
    };

    const canSubmit = rating > 0 && questions.some(q => q.answer.trim() !== '');

    return (
        <div className="post-writing-container">
        <div className="search-header">
            <h2 className="search-title">포스트 작성</h2>
            <button className="back-button" onClick={onBack}>
            ←
            </button>
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
                    <div className="stars">
                    {[0, 1, 2, 3, 4].map((index) => (
                        <span
                        key={index}
                        className={`star ${index < rating ? 'filled' : ''}`}
                        onClick={() => handleStarClick(index)}
                        >
                        ★
                        </span>
                    ))}
                    </div>
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
                {EMOJIS.map((emoji, index) => (
                    <div
                    key={index}
                    className="emoji-item"
                    onClick={() => handleEmojiSelect(emoji)}
                    >
                    {emoji}
                    </div>
                ))}
                </div>
            </div>
            </>
        )}

        <div className="form-actions">
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
        />
        </div>
    );
}
