export type FestaChallenge = {
  id: string;
  title: string;
  hint: string | null;
  sort_order: number;
  active: boolean;
};

export type FestaFeedItem = {
  id: string;
  player_id: string;
  display_name: string;
  kind: 'challenge' | 'gallery';
  media_type: 'image' | 'video';
  drive_file_id: string;
  points: number;
  challenge_id: string | null;
  challenge_title: string | null;
  created_at: string;
};

export type FestaDraw = {
  id: string;
  title: string;
  hint: string | null;
};

export type FestaPlayer = {
  id: string;
  token: string;
  displayName: string;
  challengeId: string;
  challengeTitle: string;
  challengeHint: string | null;
};
