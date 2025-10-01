// Header.jsx

export default function Header({ title, showBackButton = false, onBackClick }) {
    return (
        <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {showBackButton && (
                    <button className="back-button" onClick={onBackClick}>
                        ←
                    </button>
                )}
                <h1 className="header-title">
                    {!showBackButton && (
                        <div className="header-logo"></div>
                    )}
                    {title}
                </h1>
            </div>
        </div>
    );
}
