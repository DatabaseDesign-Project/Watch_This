import { useState, useEffect } from "react";
import { Wifi, Signal, Battery } from "lucide-react";

export function MobileStatusBar() {
    const [currentTime, setCurrentTime] = useState("");

    const getCurrentTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    useEffect(() => {
        setCurrentTime(getCurrentTime());
        const interval = setInterval(() => {
        setCurrentTime(getCurrentTime());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="status-bar">
        <div className="status-bar-left">{currentTime}</div>
        <div className="status-bar-right">
            <Signal size={16} />
            <Wifi size={16} />
            <div className="battery">
            <Battery size={16} />
            <span style={{ marginLeft: "0.25rem" }}>85%</span>
            </div>
        </div>
        </div>
    );
}
