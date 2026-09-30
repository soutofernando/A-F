/** Same categories shown on /presentes filter tabs (GiftsBand). */
export const GIFT_CATEGORIES = [
  { id: 'Casa', icon: 'home' },
  { id: 'Cozinha', icon: 'pan' },
  { id: 'Pix', icon: 'seal' },
] as const;

export type GiftCategoryId = (typeof GIFT_CATEGORIES)[number]['id'];

export const GIFT_CATEGORY_IDS: readonly GiftCategoryId[] = GIFT_CATEGORIES.map((c) => c.id);

export const GIFT_CATEGORIES_PUBLIC_LABEL = GIFT_CATEGORY_IDS.join(' · ');
