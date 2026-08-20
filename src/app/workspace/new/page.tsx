import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceCreate from "./workspace-create";
import "../workspace.css";
export default async function Page() {
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in?next=/workspace/new");
  return <WorkspaceCreate />;
}
