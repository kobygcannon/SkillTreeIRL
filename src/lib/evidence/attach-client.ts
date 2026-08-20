import {createClient as createBrowserSupabase} from "@/lib/supabase/client";
import {cancelEvidenceUpload} from "@/lib/evidence/upload";

export async function attachActivityEvidence(activityId:string,form:FormData){
  const file=form.get("evidenceFile"),url=String(form.get("evidenceUrl")||"").trim(),textNote=String(form.get("evidenceText")||"").trim();
  const attachments:Array<Record<string,unknown>>=[];
  let pendingFilePath="";
  if(file instanceof File&&file.size>0){
    if(!navigator.onLine)throw new Error("File evidence needs a connection. The activity was saved without the file.");
    const reservation=await globalThis.fetch("/api/v1/evidence/upload",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mimeType:file.type,size:file.size})});
    const reserved=await reservation.json().catch(()=>({}));
    if(!reservation.ok)throw new Error(reserved.error?.message||"The activity was saved, but the evidence upload could not start.");
    pendingFilePath=reserved.data.path;
    const storage=createBrowserSupabase();
    if(!storage){await cancelEvidenceUpload(pendingFilePath);throw new Error("The activity was saved, but evidence storage is not configured.")}
    const {error}=await storage.storage.from("evidence").uploadToSignedUrl(reserved.data.path,reserved.data.token,file,{contentType:file.type});
    if(error){await cancelEvidenceUpload(pendingFilePath);throw new Error("The activity was saved, but the evidence file could not be uploaded.")}
    attachments.push({type:file.type==="application/pdf"?"document":file.type==="text/plain"?"text":"image",storagePath:reserved.data.path});
  }
  if(url)attachments.push({type:"url",externalUrl:url});
  if(textNote)attachments.push({type:"text",textNote});
  for(const attachment of attachments){
    let response:Response;
    try{response=await globalThis.fetch(`/api/v1/activities/${activityId}/evidence`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(attachment)})}
    catch(error){if(attachment.storagePath)await cancelEvidenceUpload(pendingFilePath);throw error}
    if(!response.ok){if(attachment.storagePath)await cancelEvidenceUpload(pendingFilePath);throw new Error("The activity was saved, but some evidence could not be attached. Open the activity from History to try again.")}
    if(attachment.storagePath)pendingFilePath="";
  }
}
