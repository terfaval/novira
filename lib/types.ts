export type BookStatus =
  | "uj"
  | "feldolgozas"
  | "szerkesztes"
  | "kesz"
  | "hiba"
  | "processing"
  | "ready"
  | "failed";

export type BookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  status: BookStatus;
  progress: number; // 0..100
  updated_at: string;
  created_at: string;
};
