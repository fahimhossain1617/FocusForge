import { UserDetailSection } from "../../../../components/admin/sections/UserDetailSection";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <UserDetailSection userId={resolvedParams.id} />;
}
