import {describe,expect,it} from "vitest";
import {parseReminderSchedule} from "./schedule";

describe("reminder schedules",()=>{
 it("accepts supported one-off and recurring schedules",()=>{expect(parseReminderSchedule({kind:"once",at:"2026-08-14T08:00:00Z"})).toEqual({kind:"once",at:"2026-08-14T08:00:00Z"});expect(parseReminderSchedule({kind:"recurring",intervalDays:7,days:[5,1,5]})).toEqual({kind:"recurring",intervalDays:7,days:[1,5]})});
 it.each([null,{}, {kind:"daily"},{kind:"once",at:"not-a-date"},{kind:"recurring",intervalDays:0},{kind:"recurring",intervalDays:366},{kind:"recurring",intervalDays:1,days:[0,8]}])("rejects unsupported schedule %j",schedule=>expect(parseReminderSchedule(schedule)).toBeNull());
});
