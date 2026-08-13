"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Overview = {
  users: number;
  openTickets: number;
  openFlags: number;
  failedJobs: number;
  degradedIntegrations: number;
  role: string;
};
type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category?: string;
  diagnostic_context?: Record<string,string>;
  created_at: string;
};
type ModerationFlag={id:string;object_type:string;object_id:string;reason:string;status:string;created_at:string};
type FeatureFlag={key:string;description:string|null;enabled:boolean;rules:{percentage?:number;environments?:string[];accounts?:string[]};updated_at:string};
export default function AdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null),
    [tickets, setTickets] = useState<Ticket[]>([]),[flags,setFlags]=useState<ModerationFlag[]>([]),[features,setFeatures]=useState<FeatureFlag[]>([]),
    [error, setError] = useState("");
  const load = () =>
    Promise.all([fetch("/api/admin/overview"), fetch("/api/admin/support"),fetch("/api/admin/moderation"),fetch("/api/admin/features")])
      .then(async ([a, b,c,d]) => {
        if (!a.ok)
          throw new Error(
            a.status === 403
              ? "You do not have admin access."
              : "Admin service is unavailable.",
          );
        setOverview((await a.json()).data);
        if (b.ok) setTickets((await b.json()).data || []);
        if(c.ok)setFlags((await c.json()).data||[]);
        if(d.ok)setFeatures((await d.json()).data||[]);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const resolve = async (id: string) => {
    await fetch(`/api/admin/support/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    load();
  };
  const moderate=async(id:string,action:"review"|"dismiss"|"hide")=>{await fetch("/api/admin/moderation",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,action,resolution:action==="hide"?"Hidden after moderator review":"Reviewed by moderator"})});load()};
  const updateFeature=async(feature:FeatureFlag,enabled:boolean,percentage:number)=>{await fetch("/api/admin/features",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({key:feature.key,enabled,rules:{...feature.rules,percentage}})});load()};
  return (
    <main className="onboard">
      <header>
        <Link href="/app" className="onboard-logo">
          SkillTree IRL
        </Link>
        <b>Admin</b>
      </header>
      <section>
        {error ? (
          <div className="onboard-card">
            <h1>Access unavailable</h1>
            <p>{error}</p>
            <Link href="/app">Return to SkillTree</Link>
          </div>
        ) : !overview ? (
          <div className="onboard-card">
            <p>Loading operations…</p>
          </div>
        ) : (
          <div className="onboard-card">
            <p className="kicker">ROLE · {overview.role.toUpperCase()}</p>
            <h1>Operations overview</h1>
            <div className="profile-stats">
              <div>
                <b>{overview.users}</b>
                <span>Users</span>
              </div>
              <div>
                <b>{overview.openTickets}</b>
                <span>Open tickets</span>
              </div>
              <div>
                <b>{overview.openFlags}</b>
                <span>Moderation flags</span>
              </div>
              <div>
                <b>{overview.failedJobs}</b>
                <span>Failed jobs</span>
              </div>
            </div>
            <h2>Support queue</h2>
            {tickets.length === 0 ? (
              <p>No support tickets need attention.</p>
            ) : (
              tickets.map((ticket) => (
                <article className="card side-card" key={ticket.id}>
                  <small>
                    {ticket.priority} · {ticket.status} ·{" "}
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </small>
                  <h3>{ticket.subject}</h3>
                  {ticket.category&&<small>{ticket.category.replaceAll("_"," ")}</small>}
                  <p>{ticket.message}</p>
                  {ticket.diagnostic_context&&Object.keys(ticket.diagnostic_context).length>0&&<details><summary>Optional diagnostics</summary><pre>{JSON.stringify(ticket.diagnostic_context,null,2)}</pre></details>}
                  {ticket.status !== "resolved" && (
                    <button
                      className="primary"
                      onClick={() => resolve(ticket.id)}
                    >
                      Mark resolved
                    </button>
                  )}
                </article>
              ))
            )}
            {["moderator","admin","superadmin"].includes(overview.role)&&<><h2>Moderation queue</h2>{flags.length===0?<p>No reported content needs review.</p>:flags.map(flag=><article className="card side-card" key={flag.id}><small>{flag.object_type} · {flag.status} · {new Date(flag.created_at).toLocaleDateString()}</small><h3>Reported {flag.object_type}</h3><p>{flag.reason}</p><div className="form-actions"><button className="outline" onClick={()=>moderate(flag.id,"review")}>Assign to me</button><button className="outline" onClick={()=>moderate(flag.id,"dismiss")}>Dismiss report</button>{flag.object_type==="template"&&<button className="danger" onClick={()=>moderate(flag.id,"hide")}>Hide template</button>}</div></article>)}</>}
            {["admin","superadmin"].includes(overview.role)&&<><h2>Feature rollouts</h2>{features.map(feature=><form className="card side-card real-form" key={feature.key} action={form=>updateFeature(feature,form.get("enabled")==="on",Number(form.get("percentage")||0))}><label><input name="enabled" type="checkbox" defaultChecked={feature.enabled}/> <b>{feature.key.replaceAll("_"," ")}</b></label><p>{feature.description||"Controlled product capability"}</p><label>Deterministic rollout percentage<input name="percentage" type="number" min="0" max="100" defaultValue={feature.rules.percentage??100}/></label><button className="outline">Save rollout</button></form>)}</>}
          </div>
        )}
      </section>
    </main>
  );
}
