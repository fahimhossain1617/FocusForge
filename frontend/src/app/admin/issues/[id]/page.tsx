import { IssueDetailSection } from "../../../../components/admin/sections/IssueDetailSection";

export default async function AdminIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <IssueDetailSection issueId={resolvedParams.id} />;
}
