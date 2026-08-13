/* eslint-disable react-hooks/set-state-in-effect */
"use client";import Link from "next/link";import {useEffect,useState} from "react";
type ReferralData={code:{code:string;enabled:boolean};referrals:Array<{id:string;status:string;created_at:string;converted_at:string|null}>};
export default function Referrals(){
 const [data,setData]=useState<ReferralData|null>(null),[message,setMessage]=useState(""),[origin,setOrigin]=useState("");
 useEffect(()=>{setOrigin(window.location.origin);fetch("/api/v1/referrals").then(r=>r.json()).then(body=>setData(body.data||null))},[]);
 const link=data?`${origin}/r/${data.code.code}`:"",copy=async()=>{await navigator.clipboard.writeText(link);setMessage("Referral link copied.")};
 return <main className="onboard"><header><Link href="/app" className="onboard-logo">SkillTree IRL</Link><Link href="/app">Back to app</Link></header><section><div className="onboard-card"><p className="kicker">OPTIONAL REFERRALS</p><h1>Invite someone you care about</h1><p>Share SkillTree without turning progress into a popularity contest. Referrals can unlock cosmetics or Pro time, but never XP, levels, or achievements.</p>{message&&<p className="modal-tip" role="status">{message}</p>}{data?<div className="card side-card real-form"><label>Your referral link<input readOnly value={link}/></label><button className="primary" onClick={copy}>Copy link</button><h2>Referral status</h2>{data.referrals.length?data.referrals.map(item=><p key={item.id}><b>{item.status.replaceAll("_"," ")}</b><br/><small>{new Intl.DateTimeFormat("en-GB").format(new Date(item.created_at))}</small></p>):<p>No signups through this link yet.</p>}</div>:<div className="live-loading"><i/><i/><i/></div>}</div></section></main>;
}
