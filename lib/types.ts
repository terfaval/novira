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
  is_public?: boolean;
  source_book_id?: string | null;
  title: string;
  author: string | null;
  cover_slug?: string | null;
  background_slug?: string | null;
  publication_year?: number | string | null;
  year?: number | string | null;
  description: string | null;
  source_format: "html" | "rtf" | "docx";
  source_filename: string;
  source_mime: string;
  source_size_bytes: number;
  source_storage_path: string;
  source_name?: string | null;
  source_url?: string | null;
  source_retrieved_at?: string | null;
  source_license_url?: string | null;
  source_original_sha256?: string | null;
  source_work_id?: string | null;
  status: BookStatus;
  error_message: string | null;
  progress?: number;
  updated_at: string;
  created_at: string;
};
