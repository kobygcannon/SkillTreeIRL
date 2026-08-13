import type {Metadata,Viewport} from "next";
import OfflineManager from "@/components/offline-manager";
import UnsavedChangesGuard from "@/components/unsaved-changes-guard";
import "./globals.css";
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000"),title:{default:"SkillTree IRL — Level up your real life",template:"%s | SkillTree IRL"},description:"Track goals, build skills, complete quests and watch your real-world SkillTree grow over time.",keywords:["goal tracking","skill development","real-life RPG","personal skill tree","habit progression","life goals","progress tracking"],alternates:{canonical:"/"},openGraph:{type:"website",siteName:"SkillTree IRL",title:"Level up your real life",description:"Track goals, build skills, complete quests and watch your real-world SkillTree grow over time."},twitter:{card:"summary",title:"SkillTree IRL — Level up your real life",description:"Real progress, permanently yours."},manifest:"/manifest.webmanifest"};
export const viewport:Viewport={themeColor:"#7465e8",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-release={process.env.APP_RELEASE||"local"}><body>{children}<OfflineManager/><UnsavedChangesGuard/></body></html>}
