export const messages={
  "en-GB":{
    "nav.today":"Today","nav.goals":"Goals","nav.skills":"Skills","nav.quests":"Quests","nav.habits":"Habits","nav.calendar":"Calendar","nav.achievements":"Achievements","nav.history":"History","nav.insights":"Insights","nav.season":"Current season","nav.profile":"Profile","nav.settings":"Settings","nav.notifications":"Notifications","nav.support":"Support","nav.community":"Community","nav.tools":"Tools & records","nav.templates":"Templates","nav.referrals":"Referrals",
    "page.skills":"Your SkillTree","page.season":"Season","page.profile":"Character profile","page.calendar":"Calendar & reminders"
  }
} as const;

export type MessageKey=keyof typeof messages["en-GB"];
export function normalizeLocale(value:string|undefined|null){try{return Intl.getCanonicalLocales(value||"en-GB")[0]||"en-GB"}catch{return"en-GB"}}
export function translate(locale:string,key:MessageKey){const normalized=normalizeLocale(locale);return messages[normalized as keyof typeof messages]?.[key]??messages["en-GB"][key]}
export function formatNumber(locale:string,value:number,options?:Intl.NumberFormatOptions){return new Intl.NumberFormat(normalizeLocale(locale),options).format(value)}
export function formatCurrency(locale:string,value:number,currency:string){return formatNumber(locale,value,{style:"currency",currency:currency.toUpperCase(),currencyDisplay:"narrowSymbol"})}
export function firstDayOfWeek(locale:string){const region=new Intl.Locale(normalizeLocale(locale)).region||"GB";if(["US","CA","PH","JP","TW","HK","BR","MX","CO","VE"].includes(region))return 0;if(["AE","AF","BH","DJ","DZ","EG","IQ","IR","JO","KW","LY","OM","QA","SD","SY"].includes(region))return 6;return 1}
export function startOfLocaleWeek(date:Date,locale:string){const result=new Date(date);result.setUTCHours(0,0,0,0);const offset=(result.getUTCDay()-firstDayOfWeek(locale)+7)%7;result.setUTCDate(result.getUTCDate()-offset);return result}
export function isValidTimeZone(value:string){try{new Intl.DateTimeFormat("en",{timeZone:value}).format();return value.length<=80}catch{return false}}
