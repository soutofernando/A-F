'use client';

import { RsvpForm } from '@/components/home/RsvpForm';

export default function RsvpPage() {
  return (
    <div data-theme="light" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--texto)', padding: '120px 22px 80px' }}>
      <RsvpForm />
    </div>
  );
}
