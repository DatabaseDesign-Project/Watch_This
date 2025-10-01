// BottomNavigation.jsx

export default function BottomNavigation({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'home', icon: '🏠', label: '' },
        { id: 'search', icon: '🔍', label: '' },
        { id: 'notifications', icon: '🔔', label: '' },
        { id: 'profile', icon: '👤', label: '' }
    ];

    return (
        <div className="bottom-nav">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="nav-icon">{tab.icon}</span>
                    {tab.label && <span>{tab.label}</span>}
                </div>
            ))}
        </div>
    );
}
