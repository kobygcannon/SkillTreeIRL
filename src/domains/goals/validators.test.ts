import {describe,expect,it} from "vitest";
import {measurementModels} from "./types";
import {parseCreateGoal,ValidationError} from "./validators";

describe("goal measurement validation",()=>{
  it.each(measurementModels)("accepts a valid %s goal",measurement=>{
    const needsTarget=["numeric","currency","frequency","duration","recurring"].includes(measurement);
    const value=parseCreateGoal({title:"A real goal",category:"Personal",measurement,targetValue:needsTarget?10:undefined,unit:needsTarget&&measurement!=="currency"?"sessions":undefined,currency:measurement==="currency"?"GBP":undefined});
    expect(value.measurement).toBe(measurement);
  });
  it("defaults percentage and binary targets authoritatively",()=>{expect(parseCreateGoal({title:"Percent",measurement:"percentage"}).targetValue).toBe(100);expect(parseCreateGoal({title:"Done",measurement:"binary"}).targetValue).toBe(1)});
  it("rejects incomplete target-based goals",()=>{expect(()=>parseCreateGoal({title:"Run",measurement:"numeric",unit:"km"})).toThrow(ValidationError);expect(()=>parseCreateGoal({title:"Save",measurement:"currency",targetValue:1000})).toThrow(ValidationError)});
});
