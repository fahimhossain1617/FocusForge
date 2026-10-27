import { FeedbackDetailSection } from "../../../../components/admin/sections/FeedbackDetailSection";

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <FeedbackDetailSection ticketId={resolvedParams.id} />;
}
