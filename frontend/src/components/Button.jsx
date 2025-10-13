// Button.jsx
import React from "react";

export const Button = React.forwardRef(function Button(
    {
        children,
        onClick,
        type = "button",
        className = "",
        style,
        ...props
    },
    ref
) {
    // 내부 기본 스타일이 필요하면 여기에 추가하되,
    // 부모가 준 style이 마지막에 오도록 합치지 말고 아래처럼 그대로 전달.
    const handleClick = (e) => {
        e.stopPropagation(); // 이벤트 버블링 차단
        if (onClick) onClick(e);
    };

    return (
        <button
            ref={ref}
            type={type}
            onClick={handleClick}
            className={["btn", className].filter(Boolean).join(" ")}
            style={style}                // ✅ 부모에서 준 backgroundColor 등이 그대로 적용됨
            {...props}                   // ✅ aria-label, disabled 등 추가 속성 전달
        >
            {children}
        </button>
    );
});
