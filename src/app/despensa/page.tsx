import { createClient } from '@/lib/supabase/server';
import { ShoppingList, type ShoppingItem } from './ShoppingList';
import './despensa.css';

export const dynamic = 'force-dynamic';

export default async function DespensaPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .order('display_order', { ascending: true });

  return <ShoppingList initialItems={(items ?? []) as ShoppingItem[]} />;
}
