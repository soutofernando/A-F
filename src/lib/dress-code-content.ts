export type DressSwatch = { color: string; label: string };

/** All shades of red plus white — not for guest attire */
export const FORBIDDEN_SWATCHES: DressSwatch[] = [
  { color: '#FFFFFF', label: 'branco' },
  { color: '#F4EFE6', label: 'off-white' },
  { color: '#FF3B30', label: 'vermelho' },
  { color: '#C41E3A', label: 'carmim' },
  { color: '#8B0000', label: 'vermelho escuro' },
  { color: '#722F37', label: 'vinho' },
  { color: '#5C1A1B', label: 'bordô' },
];

/** Tropical / daytime-friendly palette */
export const SUGGESTED_SWATCHES: DressSwatch[] = [
  { color: '#87CEEB', label: 'azul claro' },
  { color: '#2E8B57', label: 'verde' },
  { color: '#98D8C8', label: 'menta' },
  { color: '#F0E68C', label: 'amarelo suave' },
  { color: '#D4A574', label: 'areia' },
  { color: '#6B8E6B', label: 'oliva' },
  { color: '#4A6FA5', label: 'azul' },
];

export const DRESS_REFERENCE_COPY =
  'Tropicais, tecidos leves e peças que não fiquem muito fechadas é uma celebração de dia. Vista algo em que você se sinta bonito(a) e confortável.';

export const FORBIDDEN_REMINDER =
  'Lembrete: evite todos os tons de vermelho e vinho, além de branco, off-white e marfim.';
