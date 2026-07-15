import {createHash,randomBytes} from "node:crypto";
export const randomToken=()=>randomBytes(32).toString("base64url");
export const sha256=(v:string)=>createHash("sha256").update(v).digest("hex");
