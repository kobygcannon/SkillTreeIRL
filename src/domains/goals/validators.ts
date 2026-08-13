import {measurementModels,type CreateGoalInput} from "./types";
export class ValidationError extends Error{constructor(public issues:Record<string,string>){super("Validation failed")}}

const targetRequired=new Set(["numeric","currency","frequency","duration","recurring"]);

export function parseCreateGoal(value:unknown):CreateGoalInput{
  const v=(value??{}) as Record<string,unknown>,issues:Record<string,string>={};
  const title=String(v.title??"").trim(),category=String(v.category??"Other").trim(),measurement=String(v.measurement??"");
  if(!title||title.length>180)issues.title="Title must be between 1 and 180 characters";
  if(!measurementModels.includes(measurement as never))issues.measurement="Choose a supported measurement model";
  let targetValue=v.targetValue===undefined||v.targetValue===""?undefined:Number(v.targetValue);
  const currentValue=v.currentValue===undefined||v.currentValue===""?0:Number(v.currentValue);
  if(measurement==="percentage"&&targetValue===undefined)targetValue=100;
  if(measurement==="binary")targetValue=1;
  if(targetValue!==undefined&&(!Number.isFinite(targetValue)||targetValue<=0))issues.targetValue="Target must be greater than zero";
  if(targetRequired.has(measurement)&&targetValue===undefined)issues.targetValue="This measurement needs a target";
  if(!Number.isFinite(currentValue)||currentValue<0)issues.currentValue="Starting value must be zero or greater";
  const currency=v.currency?String(v.currency).toUpperCase():undefined;
  if(currency&&!/^[A-Z]{3}$/.test(currency))issues.currency="Currency must be a three-letter ISO code";
  if(measurement==="currency"&&!currency)issues.currency="Choose a currency";
  if(["numeric","frequency","duration","recurring"].includes(measurement)&&!String(v.unit??"").trim())issues.unit="Describe the unit being measured";
  if(targetValue!==undefined&&currentValue>targetValue&&["percentage","binary"].includes(measurement))issues.currentValue="Starting value cannot exceed the target";
  if(Object.keys(issues).length)throw new ValidationError(issues);
  return{title,category,measurement:measurement as CreateGoalInput["measurement"],description:v.description?String(v.description).trim():undefined,targetValue,currentValue,unit:v.unit?String(v.unit).trim():measurement==="percentage"?"%":undefined,currency,deadline:v.deadline?String(v.deadline):undefined,priority:(v.priority as CreateGoalInput["priority"])||"normal"};
}
