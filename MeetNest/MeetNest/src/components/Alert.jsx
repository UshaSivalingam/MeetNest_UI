// src/components/Alert.jsx

import "../styles/Alert.css";

export default function Alert({ message, type }) {
  if (!message) return null;

  const icons = {
    error:   "✕",
    success: "✓",
    info:    "ℹ",
  };

  return (
    <div className={`alert alert--${type}`} role="alert">
      <span className="alert__icon">{icons[type] || icons.info}</span>
      <span className="alert__message">{message}</span>
    </div>
  );
}