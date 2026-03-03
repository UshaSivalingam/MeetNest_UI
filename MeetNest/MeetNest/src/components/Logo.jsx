// src/components/Logo.jsx

import "../styles/Logo.css";

export default function Logo({ size = "md" }) {
  return (
    <div className={`logo logo--${size}`}>
      <div className="logo__text">
        <span className="logo__meet">Meet</span>
        <span className="logo__n">N</span>
        <span className="logo__est">est</span>
      </div>
      <div className="logo__underline" />
    </div>
  );
}