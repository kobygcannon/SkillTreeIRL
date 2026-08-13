export type ReminderSchedule={kind:"once";at?:string}|{kind:"recurring";intervalDays:number;days?:number[]};

export function parseReminderSchedule(value:unknown):ReminderSchedule|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const schedule=value as Record<string,unknown>;
 if(schedule.kind==="once"){
  if(schedule.at!==undefined&&(typeof schedule.at!=="string"||!Number.isFinite(Date.parse(schedule.at))))return null;
  return{kind:"once",...(schedule.at?{at:schedule.at}:{})};
 }
 if(schedule.kind==="recurring"){
  const intervalDays=Number(schedule.intervalDays),days=schedule.days;
  if(!Number.isInteger(intervalDays)||intervalDays<1||intervalDays>365)return null;
  if(days!==undefined&&(!Array.isArray(days)||!days.length||days.some(day=>!Number.isInteger(day)||Number(day)<1||Number(day)>7)))return null;
  return{kind:"recurring",intervalDays,...(Array.isArray(days)?{days:[...new Set(days.map(Number))].sort()}:{})};
 }
 return null;
}
