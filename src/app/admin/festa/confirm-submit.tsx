'use client';

export function ConfirmSubmit({ label, message }: { label: string; message: string }) {
  return (
    <button
      type="submit"
      className="admin-btn admin-btn-danger"
      style={{
        background: 'transparent',
        border: '1px solid rgba(224,142,142,.5)',
        color: '#e08e8e',
        padding: '6px 14px',
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontSize: 10,
        letterSpacing: '.22em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
