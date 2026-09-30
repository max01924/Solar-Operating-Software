import React, { useEffect, useRef, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {api,loadData,type Data,type Named} from './api';
import './style.css';

type Page='projects'|'team'|'customers';
type Modal={type:'projects'|'customers'|'employees'|'groups'}|{type:'schedule';projectId?:string}|{type:'day';day:string};
const empty:Data={projects:[],customers:[],employees:[],groups:[],schedules:[],assignments:[]};
const colors=['#cfe1d5','#d9dff0','#efdfc8','#e7d6e7','#cce3e7'];
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();}
function Icon({kind}:{kind:Page}){return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{kind==='projects'?<path d="M3 7h7l2 2h9v11H3zM3 7V4h7l2 3"/>:kind==='customers'?<><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></>:<><circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6M19 15a6 6 0 0 1 3 5"/></>}</svg>}

function App(){
  const [page,setPage]=useState<Page>('projects');
  const [view,setView]=useState<'calendar'|'members'>('calendar');
  const [data,setData]=useState<Data>(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [modal,setModal]=useState<Modal|null>(null);
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [busy,setBusy]=useState(false);
  async function refresh(){setData(await loadData());}
  useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  async function mutate(path:string,method:string,body?:unknown){
    setBusy(true);setError('');
    try {await api(path,method,body);await refresh();return true;}
    catch(e){setError(e instanceof Error?e.message:'Speichern fehlgeschlagen.');return false;}
    finally{setBusy(false);}
  }
  const title=page==='projects'?'Projekte':page==='team'?'Team':'Kunden';
  return <div className="app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">s</span><span>Sonnenweg<span className="brand-sub">Solar</span></span></div>
      <nav aria-label="Hauptnavigation">{(['projects','team','customers'] as Page[]).map(item=><button key={item} className={`nav-item ${page===item?'selected':''}`} aria-current={page===item?'page':undefined} onClick={()=>{setPage(item);setError('');}}><Icon kind={item}/>{item==='projects'?'Projekte':item==='team'?'Team':'Kunden'}</button>)}</nav>
      <div className="sidebar-footer">Arbeitsbereich</div>
    </aside>
    <main><header><div><div className="eyebrow">SONNENWEG SOLAR</div><h1>{title}</h1></div><div className="header-actions">
      {page==='team'&&view==='calendar'?<button className="primary" onClick={()=>setModal({type:'schedule'})} disabled={loading||!data.projects.length}>+ Zeitraum</button>:<>
        {page==='team'&&<button className="secondary" onClick={()=>setModal({type:'groups'})} disabled={loading}>+ Gruppe</button>}
        <button className="primary" disabled={loading} onClick={()=>setModal({type:page==='team'?'employees':page})}>+ {page==='projects'?'Projekt':page==='customers'?'Kunde':'Mitarbeiter'}</button>
      </>}
    </div></header>
    {error&&<div className="error" role="alert">{error}<button aria-label="Fehlermeldung schließen" onClick={()=>setError('')}>×</button></div>}
    {page==='team'&&<div className="tabs" aria-label="Teamansicht"><button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Kalender</button><button className={view==='members'?'active':''} onClick={()=>setView('members')}>Mitglieder</button></div>}
    {loading?<div className="panel loading" role="status">Wird geladen …</div>:page==='projects'||page==='customers'?<section className="panel object-list" aria-label={`${title}übersicht`}>
      {(page==='projects'?data.projects:data.customers).map(obj=><div className="object-row" key={obj.id}><span>{obj.name}</span>{page==='projects'&&<button className="text-button" onClick={()=>setModal({type:'schedule',projectId:obj.id})}>Zeitraum planen</button>}</div>)}
    </section>:view==='members'?<section className="panel members">
      {[{id:'',name:'Ohne Gruppe'},...data.groups].map(group=>{const members=data.employees.filter(e=>(e.group_id??'')===group.id);if(!group.id&&!members.length)return null;return <section className="member-group" key={group.id}><h2>{group.name}<span>{members.length}</span></h2>{members.map(employee=><div className="member-row" key={employee.id}><span className="avatar">{initials(employee.name)}</span><span className="member-name">{employee.name}</span><select aria-label={`Gruppe für ${employee.name}`} value={employee.group_id??''} disabled={busy} onChange={e=>void mutate(`employees/${employee.id}/group`,'PATCH',{group_id:e.target.value||null})}><option value="">Ohne Gruppe</option>{data.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>)}</section>})}
    </section>:<Calendar data={data} month={month} setMonth={setMonth} onDay={day=>setModal({type:'day',day})}/>}
    </main>
    {modal&&<Dialog modal={modal} data={data} busy={busy} error={error} mutate={mutate} close={()=>{setModal(null);setError('');}}/>}
  </div>;
}

function Calendar({data,month,setMonth,onDay}:{data:Data;month:Date;setMonth:(date:Date)=>void;onDay:(day:string)=>void}){
  const offset=(month.getDay()+6)%7;
  const total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const weeks=Math.ceil((offset+total)/7);
  const projectMap=new Map(data.projects.map(p=>[p.id,p]));
  const employeeMap=new Map(data.employees.map(e=>[e.id,e]));
  function color(id:string){return colors[Array.from(id).reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0)%colors.length];}
  return <section className="panel calendar" aria-label="Teamkalender"><div className="calendar-toolbar"><h2>{month.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</h2><div className="calendar-controls"><button className="secondary" onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Heute</button><button className="arrow" aria-label="Vorheriger Monat" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><button className="arrow" aria-label="Nächster Monat" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div></div>
    <div className="weekdays">{['Mo','Di','Mi','Do','Fr','Sa','So'].map(day=><div key={day}>{day}</div>)}</div>
    {Array.from({length:weeks},(_,week)=>{
      const dates=Array.from({length:7},(_,i)=>new Date(month.getFullYear(),month.getMonth(),week*7+i-offset+1));
      const first=dateKey(dates[0]),last=dateKey(dates[6]);
      const bars=data.schedules.filter(s=>s.start_date<=last&&s.end_date>=first);
      return <div className="calendar-week" key={week}>
        <div className="day-grid">{dates.map(date=>{const day=dateKey(date);const today=day===dateKey(new Date());const assigned=data.assignments.filter(a=>a.day===day);const employees=[...new Set(assigned.map(a=>a.employee_id))];return <button className={`day-cell ${date.getMonth()!==month.getMonth()?'muted':''}`} style={{paddingBottom:`${Math.max(1,bars.length)*29+14}px`}} key={day} onClick={()=>onDay(day)} aria-label={`${date.toLocaleDateString('de-DE')}, ${employees.length} Mitarbeiter zugeordnet`}><span className={`day-number ${today?'today':''}`}>{date.getDate()}</span><div className="avatars">{employees.map(id=>{const employee=employeeMap.get(id);return <span className="avatar small" key={id} title={`${employee?.name}: ${assigned.filter(a=>a.employee_id===id).map(a=>projectMap.get(a.project_id)?.name).join(', ')}`}>{initials(employee?.name??'?')}</span>})}</div></button>})}</div>
        <div className="project-bars" style={{height:`${bars.length*29}px`}}>{bars.map(s=>{
          const start=dates.findIndex(d=>dateKey(d)>=s.start_date);
          let end=6;for(let i=6;i>=0;i--)if(dateKey(dates[i])<=s.end_date){end=i;break;}
          return <button key={s.project_id} className="project-bar" style={{gridColumn:`${Math.max(0,start)+1} / ${end+2}`,background:color(s.project_id)}} onClick={()=>onDay(dateKey(dates[Math.max(0,start)]))} title={projectMap.get(s.project_id)?.name}>{projectMap.get(s.project_id)?.name}</button>;
        })}</div>
      </div>;
    })}
  </section>;
}

function Dialog({modal,data,busy,error,mutate,close}:{modal:Modal;data:Data;busy:boolean;error:string;mutate:(path:string,method:string,body?:unknown)=>Promise<boolean>;close:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  const [name,setName]=useState('');
  const [project,setProject]=useState(modal.type==='schedule'?(modal.projectId??data.projects[0]?.id??''):(data.projects[0]?.id??''));
  const [employee,setEmployee]=useState(data.employees[0]?.id??'');
  const [start,setStart]=useState(dateKey(new Date()));
  const [end,setEnd]=useState(dateKey(new Date()));
  const [formError,setFormError]=useState('');
  useEffect(()=>{ref.current?.showModal();},[]);
  useEffect(()=>{if(modal.type==='schedule'){const s=data.schedules.find(s=>s.project_id===project);setStart(s?.start_date??dateKey(new Date()));setEnd(s?.end_date??dateKey(new Date()));}},[project]);
  const titles={projects:'Projekt hinzufügen',customers:'Kunde hinzufügen',employees:'Mitarbeiter hinzufügen',groups:'Gruppe hinzufügen',schedule:'Projektzeitraum'};
  const available=modal.type==='day'?data.projects.filter(p=>data.schedules.some(s=>s.project_id===p.id&&s.start_date<=modal.day&&s.end_date>=modal.day)):[];
  const [dayProject,setDayProject]=useState(available[0]?.id??'');
  async function submit(e:React.FormEvent){e.preventDefault();setFormError('');let ok=false;
    if(modal.type==='schedule'){
      if(end<start){setFormError('Das Ende muss am oder nach dem Start liegen.');return;}
      ok=await mutate(`projects/${project}/schedule`,'PUT',{start_date:start,end_date:end});
    }else if(modal.type==='day'){ok=await mutate('assignments','POST',{project_id:dayProject,employee_id:employee,day:modal.day});}
    else {if(!name.trim()){setFormError('Bitte einen Namen eingeben.');return;}ok=await mutate(modal.type,'POST',{name:name.trim()});}
    if(ok&&modal.type!=='day')close();
  }
  function options(objects:Named[]){return objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>);}
  const assigned=modal.type==='day'?data.assignments.filter(a=>a.day===modal.day):[];
  return <dialog ref={ref} onCancel={e=>{if(busy)e.preventDefault();else close();}}><div className="dialog-heading"><h2>{modal.type==='day'?new Date(`${modal.day}T12:00:00`).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):titles[modal.type]}</h2><button className="close" aria-label="Schließen" disabled={busy} onClick={close}>×</button></div>
    <form onSubmit={submit}>
      {modal.type==='schedule'?<><label>Projekt<select value={project} onChange={e=>setProject(e.target.value)} required>{options(data.projects)}</select></label><div className="date-fields"><label>Start<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Ende<input type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label></div></>:modal.type==='day'?<>
        <div className="day-assignments">{assigned.map(a=><div className="assignment-row" key={a.id}><span className="avatar small">{initials(data.employees.find(e=>e.id===a.employee_id)?.name??'?')}</span><div><strong>{data.employees.find(e=>e.id===a.employee_id)?.name}</strong><span>{data.projects.find(p=>p.id===a.project_id)?.name}</span></div><button className="close" type="button" disabled={busy} aria-label="Zuordnung entfernen" onClick={()=>void mutate(`assignments/${a.id}`,'DELETE')}>×</button></div>)}</div>
        {available.length&&data.employees.length?<><label>Projekt<select value={dayProject} onChange={e=>setDayProject(e.target.value)} required>{options(available)}</select></label><label>Mitarbeiter<select value={employee} onChange={e=>setEmployee(e.target.value)} required>{options(data.employees)}</select></label></>:<p className="hint">{!available.length?'Für diesen Tag ist noch kein Projektzeitraum geplant.':'Lege zuerst ein Teammitglied an.'}</p>}
      </>:<label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} required maxLength={200} autoComplete="off"/></label>}
      {(formError||error)&&<p className="form-error" role="alert">{formError||error}</p>}
      <div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={close}>{modal.type==='day'?'Schließen':'Abbrechen'}</button>{(modal.type!=='day'||!!available.length&&!!data.employees.length)&&<button className="primary" disabled={busy}>{busy?'Speichert …':modal.type==='day'?'Zuordnen':'Speichern'}</button>}</div>
    </form></dialog>;
}

createRoot(document.getElementById('root')!).render(<App/>);
