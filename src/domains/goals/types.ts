export const measurementModels=["numeric","currency","percentage","frequency","duration","milestones","binary","recurring","open_ended","composite","custom"] as const;
export type MeasurementModel=(typeof measurementModels)[number];
export type CreateGoalInput={title:string;description?:string;category:string;measurement:MeasurementModel;targetValue?:number;currentValue?:number;unit?:string;currency?:string;deadline?:string;priority?:"focus"|"high"|"normal"|"low"|"later"};
export type GoalRecord={id:string;user_id:string;title:string;description:string|null;category:string;status:string;measurement:MeasurementModel;current_value:number;target_value:number|null;unit:string|null;currency:string|null;deadline:string|null;priority:string;created_at:string;updated_at:string};
