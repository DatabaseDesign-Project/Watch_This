export default function QuestionModal({ isOpen, onClose, onSelectQuestion, availableQuestions }) {
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
                    {availableQuestions.map((question, index) => (
                        <div
                            key={index}
                            className="question-modal-item"
                            onClick={() => handleQuestionSelect(question)}
                        >
                            {question}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
