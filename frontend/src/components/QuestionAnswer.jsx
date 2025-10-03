import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

export default function QuestionAnswer({ 
    question, 
    placeholder, 
    onAnswerChange,
    onImageUpload,
    showEmojiPicker = false,
    onEmojiSelect
}) {
    const [answer, setAnswer] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [uploadedImage, setUploadedImage] = useState(null);

    const handleAnswerChange = (value) => {
        setAnswer(value);
        onAnswerChange(value);
    };

    const handleEmojiClick = (emoji) => {
        if (onEmojiSelect) {
            onEmojiSelect(emoji);
        }
        setShowEmojis(false);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target?.result;
                setUploadedImage(imageUrl);
                if (onImageUpload) {
                    onImageUpload(imageUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="question-section">
            <div className="question-header">
                <span className="question-icon">⊕</span>
                <span className="question-title">{question}</span>
            </div>
            
            <div style={{ position: 'relative' }}>
                <textarea
                    className="question-textarea"
                    placeholder={placeholder}
                    value={answer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    rows={3}
                />
                
                <div style={{ 
                    position: 'absolute', 
                    bottom: '12px', 
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {showEmojiPicker && (
                        <button 
                            className="emoji-trigger"
                            onClick={() => setShowEmojis(!showEmojis)}
                        >
                            😊
                        </button>
                    )}
                    
                    <label style={{ cursor: 'pointer' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                        <span style={{ 
                            fontSize: '18px', 
                            color: '#6C757D',
                            padding: '4px'
                        }}>
                            📷
                        </span>
                    </label>
                </div>
            </div>

            {uploadedImage && (
                <div className="image-upload">
                    <ImageWithFallback 
                        src={uploadedImage} 
                        alt="업로드된 이미지" 
                        className="upload-preview"
                    />
                </div>
            )}

            {showEmojis && (
                <>
                    <div className="emoji-picker-overlay" onClick={() => setShowEmojis(false)} />
                    <div className="emoji-picker">
                        <div className="emoji-picker-title">이모지 선택</div>
                        <div className="emoji-grid">
                            {EMOJIS.map((emoji, index) => (
                                <div
                                    key={index}
                                    className="emoji-item"
                                    onClick={() => handleEmojiClick(emoji)}
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
