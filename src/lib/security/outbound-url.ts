import {lookup} from "node:dns/promises";
import {isIP} from "node:net";

function publicIpv4(address:string){
 const parts=address.split(".").map(Number);if(parts.length!==4||parts.some(part=>!Number.isInteger(part)||part<0||part>255))return false;
 const [a,b,c]=parts;
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0&&c===0)||(a===192&&b===0&&c===2)||(a===192&&b===88&&c===99)||(a===192&&b===168)||(a===198&&b>=18&&b<=19)||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113));
}

export function isPublicAddress(address:string){
 const normalized=address.toLowerCase().replace(/^\[|\]$/g,"");
 if(isIP(normalized)===4)return publicIpv4(normalized);
 if(isIP(normalized)!==6)return false;
 if(normalized.startsWith("::ffff:"))return publicIpv4(normalized.slice(7));
 return normalized!=="::"&&normalized!=="::1"&&!normalized.startsWith("fc")&&!normalized.startsWith("fd")&&!/^fe[89ab]/.test(normalized)&&!normalized.startsWith("2001:db8:");
}

export async function assertPublicHttpsUrl(input:string|URL){
 const target=input instanceof URL?input:new URL(input);
 if(target.protocol!=="https:"||target.username||target.password)throw new Error("Webhook URL must use public HTTPS without embedded credentials");
 const hostname=target.hostname.replace(/^\[|\]$/g,"");
 if(hostname==="localhost"||hostname.endsWith(".localhost")||hostname.endsWith(".local"))throw new Error("Webhook URL must use a public host");
 const literalVersion=isIP(hostname);
 const addresses=literalVersion?[{address:hostname}]:await lookup(hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(({address})=>!isPublicAddress(address)))throw new Error("Webhook URL resolves to a non-public address");
 return target;
}
