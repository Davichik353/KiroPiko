export interface SavedTask {id:string;query:string;answer:string;provider:string;model:string;at:number;duration:number;context:boolean;failed:boolean}
const KEY="kiropiko.chat-tasks.v1";
export function readTasks():SavedTask[]{
  try {const rows=JSON.parse(localStorage.getItem(KEY) || "[]");return Array.isArray(rows)?rows.filter(r=>r && [r.id,r.query,r.answer,r.provider,r.model].every(v=>typeof v==="string") && Number.isFinite(r.at) && Number.isFinite(r.duration) && r.duration>=0).slice(0,50):[];}catch{return [];}
}
export function saveTask(task:SavedTask):boolean{try{localStorage.setItem(KEY,JSON.stringify([{...task,query:task.query.slice(0,16000),answer:task.answer.slice(0,32000)},...readTasks()].slice(0,50)));return true;}catch{return false;}}
export function clearTasks(){localStorage.removeItem(KEY);}
