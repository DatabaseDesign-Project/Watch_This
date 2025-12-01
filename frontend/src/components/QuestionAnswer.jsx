import { ImageWithFallback } from './figma/ImageWithFallback';

const EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

export default function QuestionAnswer({ 
    question, 
    placeholder, 
    answerValue = '',       // controlled: 부모가 관리하는 답변 값
    onAnswerChange,
    onImageUpload,          // (file: File) => void - File 객체 전달
    uploadedImageUrl,       // 미리보기용 URL (부모가 관리)
    onDeleteImage,          // 이미지 삭제 핸들러
    showEmojiPicker = false,
    onEmojiSelect
}) {
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(file);  // File 객체를 부모에게 전달
        }
        // input 초기화 (같은 파일 재선택 가능하도록)
        event.target.value = '';
    };

    const handleEmojiClick = (emoji) => {
        if (onEmojiSelect) {
            onEmojiSelect(emoji);
        }
    };

    return (
        <div className="question-section" style={{ 
            marginBottom: '24px', 
            border: '1px solid #f5f5f5', 
            padding: '16px', 
            borderRadius: '12px', 
            backgroundColor: '#fff' 
        }}>
            <div className="question-header" style={{ 
                marginBottom: '12px', 
                display: 'flex', 
                alignItems: 'flex-start' 
            }}>
                <span style={{ 
                    color: '#E35A5A', 
                    marginRight: '8px', 
                    fontWeight: 'bold', 
                    fontSize: '16px' 
                }}>Q.</span>
                <span className="question-title" style={{ 
                    fontWeight: 'bold', 
                    fontSize: '15px', 
                    lineHeight: '1.4' 
                }}>{question}</span>
            </div>
            
            <div style={{ position: 'relative' }}>
                <textarea
                    className="question-textarea"
                    placeholder={placeholder || "내용을 입력해주세요."}
                    value={answerValue}
                    onChange={(e) => onAnswerChange && onAnswerChange(e.target.value)}
                    rows={4}
                    style={{ 
                        width: '100%', 
                        border: 'none', 
                        resize: 'none', 
                        outline: 'none', 
                        fontSize: '14px', 
                        background: 'transparent', 
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }}
                />
                
                {/* 이미지 미리보기 */}
                {uploadedImageUrl && (
                    <div style={{ 
                        position: 'relative', 
                        marginTop: '10px', 
                        width: '100px', 
                        height: '100px',
                        display: 'inline-block'
                    }}>
                        <ImageWithFallback 
                            src={uploadedImageUrl} 
                            alt="첨부 이미지" 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover', 
                                borderRadius: '8px' 
                            }}
                        />
                        {onDeleteImage && (
                            <button 
                                onClick={onDeleteImage}
                                style={{ 
                                    position: 'absolute', 
                                    top: -8, 
                                    right: -8, 
                                    background: '#333', 
                                    color: '#fff', 
                                    borderRadius: '50%', 
                                    width: '24px', 
                                    height: '24px', 
                                    border: 'none', 
                                    fontSize: '12px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginTop: '8px',
                    borderTop: '1px solid #f9f9f9',
                    paddingTop: '8px',
                    gap: '8px'
                }}>
                    {showEmojiPicker && (
                        <button 
                            type="button"
                            className="emoji-trigger"
                            onClick={() => {/* 이모지 피커 토글 로직 */}}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            😊
                        </button>
                    )}
                    
                    <label style={{ 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '4px' 
                    }}>
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


// import { ImageWithFallback } from './figma/ImageWithFallback';

// const EMOJIS = ['😊', '😢', '😍', '😮', '😱', '😂', '😡', '😴', '🤔', '😎'];

// export default function QuestionAnswer({ 
//     question, 
//     placeholder, 
//     answerValue = '',       // controlled: 부모가 관리하는 답변 값
//     onAnswerChange,
//     onImageUpload,          // (file: File) => void - File 객체 전달
//     uploadedImageUrl,       // 미리보기용 URL (부모가 관리)
//     onDeleteImage,          // 이미지 삭제 핸들러
//     showEmojiPicker = false,
//     onEmojiSelect
// }) {
//     const handleFileChange = (event) => {
//         const file = event.target.files?.[0];
//         if (file && onImageUpload) {
//             onImageUpload(file);  // File 객체를 부모에게 전달
//         }
//         // input 초기화 (같은 파일 재선택 가능하도록)
//         event.target.value = '';
//     };

//     const handleEmojiClick = (emoji) => {
//         if (onEmojiSelect) {
//             onEmojiSelect(emoji);
//         }
//     };

//     return (
//         <div className="question-section" style={{ 
//             marginBottom: '24px', 
//             border: '1px solid #f5f5f5', 
//             padding: '16px', 
//             borderRadius: '12px', 
//             backgroundColor: '#fff' 
//         }}>
//             <div className="question-header" style={{ 
//                 marginBottom: '12px', 
//                 display: 'flex', 
//                 alignItems: 'flex-start' 
//             }}>
//                 <span style={{ 
//                     color: '#E35A5A', 
//                     marginRight: '8px', 
//                     fontWeight: 'bold', 
//                     fontSize: '16px' 
//                 }}>Q.</span>
//                 <span className="question-title" style={{ 
//                     fontWeight: 'bold', 
//                     fontSize: '15px', 
//                     lineHeight: '1.4' 
//                 }}>{question}</span>
//             </div>
            
//             <div style={{ position: 'relative' }}>
//                 <textarea
//                     className="question-textarea"
//                     placeholder={placeholder || "내용을 입력해주세요."}
//                     value={answerValue}
//                     onChange={(e) => onAnswerChange && onAnswerChange(e.target.value)}
//                     rows={4}
//                     style={{ 
//                         width: '100%', 
//                         border: 'none', 
//                         resize: 'none', 
//                         outline: 'none', 
//                         fontSize: '14px', 
//                         background: 'transparent', 
//                         fontFamily: 'inherit',
//                         boxSizing: 'border-box'
//                     }}
//                 />
                
//                 {/* 이미지 미리보기 */}
//                 {uploadedImageUrl && (
//                     <div style={{ 
//                         position: 'relative', 
//                         marginTop: '10px', 
//                         width: '100px', 
//                         height: '100px',
//                         display: 'inline-block'
//                     }}>
//                         <ImageWithFallback 
//                             src={uploadedImageUrl} 
//                             alt="첨부 이미지" 
//                             style={{ 
//                                 width: '100%', 
//                                 height: '100%', 
//                                 objectFit: 'cover', 
//                                 borderRadius: '8px' 
//                             }}
//                         />
//                         {onDeleteImage && (
//                             <button 
//                                 onClick={onDeleteImage}
//                                 style={{ 
//                                     position: 'absolute', 
//                                     top: -8, 
//                                     right: -8, 
//                                     background: '#333', 
//                                     color: '#fff', 
//                                     borderRadius: '50%', 
//                                     width: '24px', 
//                                     height: '24px', 
//                                     border: 'none', 
//                                     fontSize: '12px', 
//                                     cursor: 'pointer', 
//                                     display: 'flex', 
//                                     alignItems: 'center', 
//                                     justifyContent: 'center' 
//                                 }}
//                             >
//                                 ✕
//                             </button>
//                         )}
//                     </div>
//                 )}

//                 <div style={{ 
//                     display: 'flex', 
//                     justifyContent: 'flex-end', 
//                     marginTop: '8px',
//                     borderTop: '1px solid #f9f9f9',
//                     paddingTop: '8px',
//                     gap: '8px'
//                 }}>
//                     {showEmojiPicker && (
//                         <button 
//                             type="button"
//                             className="emoji-trigger"
//                             onClick={() => {/* 이모지 피커 토글 로직 */}}
//                             style={{
//                                 background: 'none',
//                                 border: 'none',
//                                 fontSize: '20px',
//                                 cursor: 'pointer',
//                                 padding: '4px'
//                             }}
//                         >
//                             😊
//                         </button>
//                     )}
                    
//                     <label style={{ 
//                         cursor: 'pointer', 
//                         display: 'flex', 
//                         alignItems: 'center', 
//                         padding: '4px' 
//                     }}>
//                         <input
//                             type="file"
//                             accept="image/*"
//                             onChange={handleFileChange}
//                             style={{ display: 'none' }}
//                         />
//                         <span style={{ fontSize: '20px' }}>📷</span>
//                     </label>
//                 </div>
//             </div>
//         </div>
//     );
// }

// import { ImageWithFallback } from './figma/ImageWithFallback';

// export default function QuestionAnswer({ 
//     question, 
//     placeholder, 
//     answerValue, 
//     onAnswerChange,
//     onImageUpload, 
//     uploadedImageUrl, 
//     onDeleteImage 
// }) {
//     const handleFileChange = (e) => {
//         const file = e.target.files?.[0];
//         if (file && onImageUpload) {
//             onImageUpload(file);
//         }
//     };

//     return (
//         <div className="question-section" style={{ marginBottom: '24px', border: '1px solid #f5f5f5', padding: '16px', borderRadius: '12px', backgroundColor:'#fff' }}>
//             <div className="question-header" style={{ marginBottom: '12px', display:'flex', alignItems:'flex-start' }}>
//                 <span style={{ color: '#E35A5A', marginRight: '8px', fontWeight: 'bold', fontSize:'16px' }}>Q.</span>
//                 <span className="question-title" style={{ fontWeight: 'bold', fontSize: '15px', lineHeight:'1.4' }}>{question}</span>
//             </div>
            
//             <div style={{ position: 'relative' }}>
//                 <textarea
//                     className="question-textarea"
//                     placeholder=""
//                     value={answerValue}
//                     onChange={(e) => onAnswerChange(e.target.value)}
//                     rows={4}
//                     style={{ width: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '14px', background: 'transparent', fontFamily:'inherit' }}
//                 />
                
//                 {/* 이미지 미리보기 */}
//                 {uploadedImageUrl && (
//                     <div style={{ position: 'relative', marginTop: '10px', width: '100px', height: '100px' }}>
//                         <ImageWithFallback 
//                             src={uploadedImageUrl} 
//                             alt="첨부" 
//                             style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
//                         />
//                         <button 
//                             onClick={onDeleteImage}
//                             style={{ position: 'absolute', top: -8, right: -8, background: '#333', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', border: 'none', fontSize: '12px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
//                         >
//                             ×
//                         </button>
//                     </div>
//                 )}

//                 <div style={{ 
//                     display: 'flex', 
//                     justifyContent: 'flex-end', 
//                     marginTop: '8px',
//                     borderTop: '1px solid #f9f9f9',
//                     paddingTop: '8px'
//                 }}>
//                     <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding:'4px' }}>
//                         <input
//                             type="file"
//                             accept="image/*"
//                             onChange={handleFileChange}
//                             style={{ display: 'none' }}
//                         />
//                         {/* SVG 이미지 아이콘 */}
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                             <rect x="3" y="5" width="18" height="14" rx="2" stroke="#6C757D" strokeWidth="1.5" fill="none"/>
//                             <circle cx="8.5" cy="9.5" r="1.5" fill="#6C757D"/>
//                             <path d="M3 15L7 11L10 14L14 10L21 17V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V15Z" fill="#6C757D" opacity="0.3"/>
//                         </svg>
//                     </label>
//                 </div>
//             </div>
//         </div>
//     );
// }