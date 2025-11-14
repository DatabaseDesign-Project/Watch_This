// Button.jsx
import React from "react";

export const Button = React.forwardRef(function Button(
    {
        children,
        onClick,
        type = "button",
        className = "",
        variant = "primary",
        size = "md",
        style,
        ...props
    },
    ref
) {
    const handleClick = (e) => {
        e.stopPropagation(); // 이벤트 버블링 차단
        if (onClick) onClick(e);
    };

    const variantClasses = {
        primary: 'btn-primary',
        outline: 'btn-outline',
        ghost: 'btn-ghost',
        text: 'btn-text'
    };
    
    const sizeClasses = {
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg'
    };

    const buttonClasses = [
        "btn",
        variantClasses[variant],
        sizeClasses[size],
        className
    ].filter(Boolean).join(" ");

    return (
        <button
            ref={ref}
            type={type}
            onClick={handleClick}
            className={buttonClasses}
            style={style}
            {...props}
        >
            {children}
        </button>
    );
});
