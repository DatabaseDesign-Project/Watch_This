// BottomNavigation.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { RiHome2Line, RiHome2Fill } from "react-icons/ri";
import { RiSearchLine, RiSearchFill } from "react-icons/ri";
import { FaRegBell, FaBell } from "react-icons/fa";
import { FaRegUser, FaUser } from "react-icons/fa";

export default function BottomNavigation({ activeTab: controlledActive, onTabChange }) {
    // uncontrolled 기본값: 'home'
    const [activeTab, setActiveTab] = useState(controlledActive ?? "home");
    const navigate = useNavigate();

    // controlled 모드 동기화
    useEffect(() => {
        if (controlledActive !== undefined) setActiveTab(controlledActive);
    }, [controlledActive]);

    const tabs = [
        { id: "home", inactive: RiHome2Line, active: RiHome2Fill, to: "/home", label: "Home" },
        { id: "search", inactive: RiSearchLine, active: RiSearchFill, to: "/search", label: "Search" },
        { id: "notifications", inactive: FaRegBell, active: FaBell, to: "/notifications", label: "Alerts" },
        { id: "profile", inactive: FaRegUser, active: FaUser, to: "/profile", label: "Profile" },
    ];

    const handleChange = (id, to) => {
        if (controlledActive === undefined) setActiveTab(id); // uncontrolled일 때만 내부 상태 갱신
        onTabChange?.(id);
        navigate(to);
    };

    return (
        <nav className="bottom-nav" role="tablist" aria-label="Bottom navigation">
            {tabs.map(({ id, inactive, active, to, label }) => {
                const Icon = activeTab === id ? active : inactive;
                return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === id}
                        className={`nav-item ${activeTab === id ? "active" : ""}`}
                        onClick={() => handleChange(id, to)}
                        title={label}
                    >
                        <Icon className="nav-icon" aria-hidden="true" />
                    </button>
                );
            })}
        </nav>
    );
}
