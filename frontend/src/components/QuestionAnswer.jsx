import { ImageWithFallback } from './figma/ImageWithFallback';

export default function QuestionAnswer({ 
    question, 
    placeholder, 
    answerValue, 
    onAnswerChange,
    onImageUpload, 
    uploadedImageUrl, 
    onDeleteImage 
}) {
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(file);
        }
    };

    return (
        <div className="question-section" style={{ marginBottom: '24px', border: '1px solid #f5f5f5', padding: '16px', borderRadius: '12px', backgroundColor:'#fff' }}>
            <div className="question-header" style={{ marginBottom: '12px', display:'flex', alignItems:'flex-start' }}>
                <span style={{ color: '#E35A5A', marginRight: '8px', fontWeight: 'bold', fontSize:'16px' }}>Q.</span>
                <span className="question-title" style={{ fontWeight: 'bold', fontSize: '15px', lineHeight:'1.4' }}>{question}</span>
            </div>
            
            <div style={{ position: 'relative' }}>
                <textarea
                    className="question-textarea"
                    placeholder={placeholder || "내용을 입력해주세요."}
                    value={answerValue}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    rows={4}
                    style={{ width: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '14px', background: 'transparent', fontFamily:'inherit' }}
                />
                
                {/* 이미지 미리보기 */}
                {uploadedImageUrl && (
                    <div style={{ position: 'relative', marginTop: '10px', width: '100px', height: '100px' }}>
                        <ImageWithFallback 
                            src={uploadedImageUrl} 
                            alt="첨부" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <button 
                            onClick={onDeleteImage}
                            style={{ position: 'absolute', top: -8, right: -8, background: '#333', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', border: 'none', fontSize: '12px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                        >
                            X
                        </button>
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginTop: '8px',
                    borderTop: '1px solid #f9f9f9',
                    paddingTop: '8px'
                }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding:'4px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '20px' }}>📷</span>
                    </label>
                </div>
            </div>
        </div>
    );
}

// import { useState } from 'react';
// import { ImageWithFallback } from './figma/ImageWithFallback';

// const EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// export default function QuestionAnswer({ 
//     question, 
//     placeholder, 
//     onAnswerChange,
//     onImageUpload,
//     showEmojiPicker = false,
//     onEmojiSelect
// }) {
//     const [answer, setAnswer] = useState('');
//     const [showEmojis, setShowEmojis] = useState(false);
//     const [uploadedImage, setUploadedImage] = useState(null);

//     const handleAnswerChange = (value) => {
//         setAnswer(value);
//         onAnswerChange(value);
//     };

//     const handleEmojiClick = (emoji) => {
//         if (onEmojiSelect) {
//             onEmojiSelect(emoji);
//         }
//         setShowEmojis(false);
//     };

//     const handleImageUpload = (event) => {
//         const file = event.target.files?.[0];
//         if (file) {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 const imageUrl = e.target?.result;
//                 setUploadedImage(imageUrl);
//                 if (onImageUpload) {
//                     onImageUpload(imageUrl);
//                 }
//             };
//             reader.readAsDataURL(file);
//         }
//     };

//     return (
//         <div className="question-section">
//             <div className="question-header">
//                 <span className="question-icon">⊕</span>
//                 <span className="question-title">{question}</span>
//             </div>
            
//             <div style={{ position: 'relative' }}>
//                 <textarea
//                     className="question-textarea"
//                     placeholder={placeholder}
//                     value={answer}
//                     onChange={(e) => handleAnswerChange(e.target.value)}
//                     rows={3}
//                 />
                
//                 <div style={{ 
//                     position: 'absolute', 
//                     bottom: '12px', 
//                     right: '12px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '8px'
//                 }}>
//                     {showEmojiPicker && (
//                         <button 
//                             className="emoji-trigger"
//                             onClick={() => setShowEmojis(!showEmojis)}
//                         >
//                             😊
//                         </button>
//                     )}
                    
//                     <label style={{ cursor: 'pointer' }}>
//                         <input
//                             type="file"
//                             accept="image/*"
//                             onChange={handleImageUpload}
//                             style={{ display: 'none' }}
//                         />
//                         <span style={{ 
//                             fontSize: '18px', 
//                             color: '#6C757D',
//                             padding: '4px'
//                         }}>
//                             📷
//                         </span>
//                     </label>
//                 </div>
//             </div>

//             {uploadedImage && (
//                 <div className="image-upload">
//                     <ImageWithFallback 
//                         src={uploadedImage} 
//                         alt="업로드된 이미지" 
//                         className="upload-preview"
//                     />
//                 </div>
//             )}

//             {showEmojis && (
//                 <>
//                     <div className="emoji-picker-overlay" onClick={() => setShowEmojis(false)} />
//                     <div className="emoji-picker">
//                         <div className="emoji-picker-title">이모지 선택</div>
//                         <div className="emoji-grid">
//                             {EMOJIS.map((emoji, index) => (
//                                 <div
//                                     key={index}
//                                     className="emoji-item"
//                                     onClick={() => handleEmojiClick(emoji)}
//                                 >
//                                     {emoji}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </>
//             )}
//         </div>
//     );
// }
