export type Named = {id:string; name:string};
export type Employee = Named & {group_id:string|null};
export type Schedule = {project_id:string;start_date:string;end_date:string};
export type Assignment = {id:string;project_id:string;employee_id:string;day:string};
export type Data = {projects:Named[];customers:Named[];employees:Employee[];groups:Named[];schedules:Schedule[];assignments:Assignment[]};
export async function api<T>(path:string, method='GET', body?:unknown):Promise<T> {
  const response=await fetch(`/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    throw new Error(typeof error.detail==='string'?error.detail:'Die Eingabe konnte nicht gespeichert werden.');
  }
  return response.status===204?undefined as T:response.json();
}
export async function loadData():Promise<Data>{
  const paths=['projects','customers','employees','groups','schedules','assignments'] as const;
  const values=await Promise.all(paths.map(path=>api(path)));
  return Object.fromEntries(paths.map((path,i)=>[path,values[i]])) as Data;
}
