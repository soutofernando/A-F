import type { CSSProperties, ReactNode } from 'react';

const cream = 'var(--cream)';
const gold = 'var(--gold-soft)';
const border = 'rgba(239,231,219,.18)';
const borderStrong = 'rgba(239,231,219,.35)';
const muted = 'rgba(239,231,219,.55)';

export const adminInputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  background: '#0E0B09',
  border: `1px solid ${border}`,
  color: cream,
  fontFamily: 'var(--font-inter), Inter, sans-serif',
  fontSize: 14,
  outline: 'none',
};

export const adminTextareaStyle: CSSProperties = {
  ...adminInputStyle,
  minHeight: 84,
  resize: 'vertical',
  lineHeight: 1.5,
};

export const adminLabelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-inter), Inter, sans-serif',
  fontSize: 10,
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  color: muted,
  marginBottom: 7,
};

export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  placeholder,
  step,
  min,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string | number;
  min?: number;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={adminLabelStyle}>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        className="admin-input"
        style={adminInputStyle}
      />
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(239,231,219,.4)', marginTop: 5, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </label>
  );
}

export function TextField({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={adminLabelStyle}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ''}
        rows={rows}
        placeholder={placeholder}
        className="admin-input"
        style={adminTextareaStyle}
      />
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(239,231,219,.4)', marginTop: 5, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
  hint,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<string | { value: string; label: string }>;
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={adminLabelStyle}>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="admin-input"
        style={adminInputStyle}
      >
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(239,231,219,.4)', marginTop: 5, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </label>
  );
}

/**
 * Date+time human-friendly field. Stores ISO with -03:00 timezone (BRT).
 *   defaultValue: ISO string from DB (e.g. "2026-11-28T09:00:00-03:00")
 *   The form input uses datetime-local; the server action concatenates ":00-03:00".
 */
export function DateField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
}) {
  const localValue = defaultValue ? defaultValue.slice(0, 16) : '';
  return (
    <label style={{ display: 'block' }}>
      <span style={adminLabelStyle}>{label}</span>
      <input
        name={name}
        type="datetime-local"
        defaultValue={localValue}
        className="admin-input"
        style={adminInputStyle}
      />
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(239,231,219,.4)', marginTop: 5, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </label>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontSize: 13,
        color: cream,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        style={{ accentColor: '#D4AF7A', width: 16, height: 16 }}
      />
      {label}
    </label>
  );
}

export function SubmitButton({
  children,
  variant = 'outline',
  small = false,
}: {
  children: ReactNode;
  variant?: 'outline' | 'gold' | 'danger';
  small?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    outline: {
      background: 'transparent',
      border: `1px solid ${borderStrong}`,
      color: cream,
    },
    gold: {
      background: 'transparent',
      border: `1px solid ${gold}`,
      color: gold,
    },
    danger: {
      background: 'transparent',
      border: '1px solid rgba(224,142,142,.5)',
      color: '#e08e8e',
    },
  };

  const cls = ['admin-btn'];
  if (variant === 'gold') cls.push('admin-btn-gold');
  if (variant === 'danger') cls.push('admin-btn-danger');

  return (
    <button
      type="submit"
      className={cls.join(' ')}
      style={{
        ...styles[variant],
        padding: small ? '6px 14px' : '11px 24px',
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontSize: small ? 10 : 11,
        letterSpacing: '.22em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function PageHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 32 }} className="admin-fade-up">
      <div className="micro" style={{ color: gold }}>
        {kicker}
      </div>
      <h1
        className="serif italic"
        style={{ fontSize: 40, fontWeight: 300, marginTop: 6, letterSpacing: '.01em', lineHeight: 1.1 }}
      >
        {title}
      </h1>
      {subtitle && (
        <div
          className="italic"
          style={{ fontSize: 14, color: muted, marginTop: 10, lineHeight: 1.5 }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function Card({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  return (
    <section
      className="admin-card admin-fade-up"
      style={{
        background: '#141110',
        border: `1px solid ${border}`,
        padding: 24,
        marginBottom: 20,
      }}
    >
      {title && (
        <div style={{ marginBottom: 18 }}>
          <div className="admin-section-title">{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{subtitle}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Section({ kicker, title, children }: { kicker?: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }} className="admin-fade-up">
      <div style={{ marginBottom: 14 }}>
        {kicker && <div className="admin-section-sub">{kicker}</div>}
        <div className="admin-section-title" style={{ marginTop: kicker ? 4 : 0 }}>
          {title}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>{children}</div>
    </div>
  );
}

export function Pill({
  variant = 'muted',
  children,
}: {
  variant?: 'success' | 'danger' | 'muted' | 'gold';
  children: ReactNode;
}) {
  return <span className={`admin-pill admin-pill-${variant}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      {meta && <div className="admin-stat-meta">{meta}</div>}
    </div>
  );
}

export const adminTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-inter), Inter, sans-serif',
  fontSize: 13,
};

export const adminThStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 10,
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  color: muted,
  borderBottom: `1px solid ${border}`,
  fontWeight: 500,
};

export const adminTdStyle: CSSProperties = {
  padding: '14px 12px',
  borderBottom: `1px solid ${border}`,
  color: cream,
  verticalAlign: 'top',
};
