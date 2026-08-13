import Link from "next/link";

function Inline({text}:{text:string}){
 const parts=text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).filter(Boolean);
 return <>{parts.map((part,index)=>{if(part.startsWith("**")&&part.endsWith("**"))return <strong key={index}>{part.slice(2,-2)}</strong>;if(part.startsWith("*")&&part.endsWith("*"))return <em key={index}>{part.slice(1,-1)}</em>;const link=part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);return link?<a key={index} href={link[2]} rel="noreferrer">{link[1]}</a>:<span key={index}>{part}</span>})}</>;
}

export default function JournalBody({body}:{body:string}){
 const content:React.ReactNode[]=[];
 body.split(/\r?\n/).forEach((raw,index)=>{const line=raw.trim();if(!line)return;if(line.startsWith("## "))content.push(<h3 key={index}><Inline text={line.slice(3)}/></h3>);else if(line.startsWith("# "))content.push(<h2 key={index}><Inline text={line.slice(2)}/></h2>);else if(line.startsWith("- "))content.push(<ul key={index}><li><Inline text={line.slice(2)}/></li></ul>);else content.push(<p key={index}><Inline text={line}/></p>)});
 return <div className="journal-body">{content}</div>;
}

export function JournalRelation({type,id,label}:{type:"goals"|"activities"|"skills";id:string;label:string}){return <Link className="pill" href={`/${type}/${id}`}>{label}</Link>}
