export function Input({ id, type = "text", placeholder, className = "", value, onChange }) {
    return (
        <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input ${className}`}
        />
    );
}