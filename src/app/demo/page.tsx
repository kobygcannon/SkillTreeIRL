import type {Metadata} from "next";import {SkillTreeApp} from "../page";
export const metadata:Metadata={title:"Interactive demo",description:"Explore a read-only synthetic SkillTree IRL account.",robots:{index:false,follow:true}};
export default function Demo(){return <SkillTreeApp/>}
