"use client";
import {useEffect} from "react";

export default function UnsavedChangesGuard(){
 useEffect(()=>{
  let dirty=false;
  const mark=(event:Event)=>{if((event.target as HTMLElement)?.closest("form"))dirty=true};
  const clear=()=>{dirty=false};
  const unload=(event:BeforeUnloadEvent)=>{if(!dirty)return;event.preventDefault();event.returnValue=""};
  const navigate=(event:MouseEvent)=>{if(!dirty)return;const target=event.target as HTMLElement,control=target.closest("a,button");if(!control||control.closest("form")||control.hasAttribute("data-preserve-form"))return;if(confirm("Leave this screen? Your unsaved changes will be lost.")){dirty=false;return}event.preventDefault();event.stopPropagation()};
  document.addEventListener("input",mark,true);document.addEventListener("change",mark,true);document.addEventListener("submit",clear,true);document.addEventListener("click",navigate,true);window.addEventListener("beforeunload",unload);
  return()=>{document.removeEventListener("input",mark,true);document.removeEventListener("change",mark,true);document.removeEventListener("submit",clear,true);document.removeEventListener("click",navigate,true);window.removeEventListener("beforeunload",unload)}
 },[]);
 return null;
}
