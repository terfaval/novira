import { BookDashboard } from "@/components/BookDashboard/BookDashboard";

/**
 * Book dashboard route.
 *
 * Renders the Workbench/Reader dashboard for a single book id.
 * The client component boots anonymous identity, loads book+block state,
 * and owns the view-state store:
 * - completion: accepted/total counters and ratio
 * - viewState: "workbench" | "reader"
 * - panelMode: "single" | "stacked" (mobile interaction model)
 *
 * View-state rule:
 * - 100% completion: default is Reader.
 * - below 100%: default/fallback is Workbench.
 * - Reader activation is guarded when no acceptable translated variant state exists.
 */
export default function BookPage({ params }: { params: { id: string } }) {
  return <BookDashboard bookId={params.id} />;
}
