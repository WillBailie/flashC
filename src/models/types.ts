export interface Deck {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  created_at: string;
}

export interface TemplateField {
  id: number;
  template_id: number;
  name: string;
  side: 'front' | 'back';
  position: number;
}

export interface Card {
  id: number;
  deck_id: number;
  template_id: number | null;
  front_text: string;
  back_text: string;
  field_values: string | null;
  created_at: string;
  modified_at: string;
}

export interface Review {
  id: number;
  card_id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string | null;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewResult {
  cardId: number;
  quality: Quality;
}
