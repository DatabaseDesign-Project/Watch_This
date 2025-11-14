export default function QuestionModal({ isOpen, onClose, onSelectQuestion, availableQuestions, isLoading = false, error = null }) {
    if (!isOpen) return null;

    const handleQuestionSelect = (question) => {
        onSelectQuestion(question);
        onClose();
    };

    return (
        <>
            <div className="question-modal-overlay" onClick={onClose} />
            <div className="question-modal">
                <div className="question-modal-content">
                    {isLoading ? (
                        <div className="question-modal-loading">불러오는 중...</div>
                    ) : error ? (
                        <div className="question-modal-error">
                            <div>질문을 불러오지 못했습니다: {error}</div>
                            <button className="question-modal-retry" onClick={() => onRetry && onRetry()}>
                                다시 시도
                            </button>
                        </div>
                    ) : availableQuestions && availableQuestions.length ? (
                        availableQuestions.map((question, index) => {
                            const text = (question && typeof question === 'object') ? question.content : question;
                            return (
                                <div
                                    key={index}
                                    className="question-modal-item"
                                    onClick={() => handleQuestionSelect(question)}
                                >
                                    {text}
                                </div>
                            );
                        })
                    ) : (
                        <div className="question-modal-empty">선택 가능한 질문이 없습니다.</div>
                    )}
                </div>
            </div>
        </>
    );
}
