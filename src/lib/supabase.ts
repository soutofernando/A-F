import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon);

// Tipagem do schema vai aqui depois (gerada com `supabase gen types typescript`).
// Tabelas planejadas:
//   guests        — convidados (nome, slug, family_id, max_companions)
//   rsvps         — confirmações (guest_id, status, companions, message)
//   gifts         — lista de presentes (title, price, category, image_url, claimed_by)
//   gift_claims   — registros de "vou dar" (gift_id, guest_name, payment_method, paid)
//   messages      — recados do livro de visitas (guest_name, body, approved)
