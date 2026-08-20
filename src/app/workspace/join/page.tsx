import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceJoin from "./workspace-join";
import "../workspace.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token;
  if (!token) redirect("/app");
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    redirect(
      `/sign-in?next=${encodeURIComponent(`/workspace/join?token=${token}`)}`,
    );
  return <WorkspaceJoin token={token} />;
}
