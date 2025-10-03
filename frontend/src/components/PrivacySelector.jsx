export default function PrivacySelector({ isOpen, onClose, onSelect }) {
    if (!isOpen) return null;

    const handleSelect = (privacy) => {
        onSelect(privacy);
        onClose();
    };

    return (
        <>
            <div className="privacy-overlay" onClick={onClose} />
            <div className="privacy-modal">
                <div className="privacy-option" onClick={() => handleSelect('전체공개')}>
                    전체공개
                </div>
                <div className="privacy-option" onClick={() => handleSelect('친구공개')}>
                    친구공개
                </div>
                <div className="privacy-option" onClick={() => handleSelect('나만보기')}>
                    나만보기
                </div>
            </div>
        </>
    );
}
