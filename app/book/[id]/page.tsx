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
 */
export default function BookPage({ params }: { params: { id: string } }) {
  return <BookDashboard bookId={params.id} />;
}
