// Header.jsx

export default function Header({ 
    title, 
    showBackButton = false, 
    onBackClick, 
    showLogo = false,
    variant = 'default', // 'default', 'home', 'search'
    rightAction = null
}) {
    const getHeaderClass = () => {
        switch (variant) {
            case 'home':
                return 'app-header app-header-search';
            case 'search':
                return 'app-header app-header-search';
            default:
                return 'app-header';
        }
    };

    const getTitleClass = () => {
        switch (variant) {
            case 'home':
                return 'app-title app-title-search';
            case 'search':
                return 'app-title app-title-search';
            default:
                return 'app-title';
        }
    };

    return (
        <header className={getHeaderClass()}>
            {showBackButton && (
                <button className="back-button" onClick={onBackClick}>
                    <svg className="back-icon" viewBox="0 0 29 29" fill="none">
                        <path 
                            d="M18.125 21.75L10.875 14.5L18.125 7.25" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}
            <h1 className={getTitleClass()}>
                {title}
            </h1>
            {rightAction && (
                <div className="header-right-action">
                    {rightAction}
                </div>
            )}
        </header>
    );
}
