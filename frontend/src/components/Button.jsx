// Button.jsx
export function Button({ children, onClick, type = "button", className = "" }) {
    return (
        <button
        type={type}
        onClick={(e) => {
            e.stopPropagation(); // 이벤트 버블링 차단
            if (onClick) onClick();
        }}
        className={`btn ${className}`}
        >
        {children}
        </button>
    );
}
