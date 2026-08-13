import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
export function hashToken(value:string){return createHash("sha256").update(value,"utf8").digest("hex")}
export function randomToken(prefix:string,bytes=32){return`${prefix}${randomBytes(bytes).toString("base64url")}`}
function key(){const raw=process.env.WEBHOOK_ENCRYPTION_KEY;if(!raw)throw new Error("WEBHOOK_ENCRYPTION_KEY is not configured");return createHash("sha256").update(raw,"utf8").digest()}
export function encryptSecret(value:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url")}
export function decryptSecret(value:string){const packed=Buffer.from(value,"base64url"),iv=packed.subarray(0,12),tag=packed.subarray(12,28),encrypted=packed.subarray(28),decipher=createDecipheriv("aes-256-gcm",key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8")}
