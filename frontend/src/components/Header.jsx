// Header.jsx

export default function Header({ title, showBackButton = false, onBackClick }) {
    return (
        <header className="search-page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {showBackButton && (
                    <button className="back-button" onClick={onBackClick}>
                        ←
                    </button>
                )}
                <h1 className="search-app-title">
                    {title}
                </h1>
            </div>
        </header>
    );
}
