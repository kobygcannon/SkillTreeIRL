import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceDashboard from "./workspace-dashboard";
import "../workspace.css";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/sign-in?next=/workspace/${id}`);
  return <WorkspaceDashboard id={id} />;
}
