import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Printer,Settings,Activity,LogOut,RefreshCw,AlertTriangle,CheckCircle2,Thermometer,Clock,Layers,Plus,Trash2,Bell,ShieldCheck,WifiOff,PackageCheck,CheckCheck,Search,Calendar,Filter,XCircle,TrendingUp,ExternalLink}from'lucide-react';
import './style.css';

const api=async(url,options={})=>{const r=await fetch('/api'+url,{credentials:'same-origin',headers:{'content-type':'application/json'},...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Request failed');return data};
const fmtDuration=n=>n==null?'—':Math.floor(n/3600)+'h '+Math.floor(n%3600/60)+'m';
const temp=n=>typeof n==='number'?n.toFixed(1)+'°C':'—';
const color=s=>({printing:'green',completed:'teal',idle:'blue',paused:'amber',offline:'red',error:'red',disabled:'gray',connecting:'gray',cancelled:'gray'})[s]||'gray';

const getLocalDateStr=d=>{
 if(!d)return'';
 const dt=new Date(d);
 if(isNaN(dt.getTime()))return'';
 return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

const formatLocalDate=dateStr=>{
 if(!dateStr)return'';
 const today=getLocalDateStr(new Date());
 const y=new Date();y.setDate(y.getDate()-1);
 const yesterday=getLocalDateStr(y);
 const[yr,mo,da]=dateStr.split('-').map(Number);
 const dt=new Date(yr,mo-1,da);
 const formatted=dt.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
 if(dateStr===today)return `Today (${formatted})`;
 if(dateStr===yesterday)return `Yesterday (${formatted})`;
 return formatted;
};

const formatTime=iso=>{
 if(!iso)return'—';
 const dt=new Date(iso);
 return dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
};

const statusLabel=st=>{
 if(st==='completed')return'Completed';
 if(st==='cancelled')return'Cancelled';
 if(st==='error')return'Error';
 if(st==='klippy_shutdown')return'MCU Shutdown';
 if(st==='klippy_disconnect')return'Disconnected';
 return st||'Failed';
};

const formatFinishTime=etaIso=>{
 if(!etaIso)return'—';
 const dt=new Date(etaIso);
 if(isNaN(dt.getTime()))return'—';
 const today=getLocalDateStr(new Date());
 const tm=new Date();tm.setDate(tm.getDate()+1);
 const tomorrow=getLocalDateStr(tm);
 const etaDate=getLocalDateStr(dt);
 const timeStr=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 if(etaDate===today)return `Today, ${timeStr}`;
 if(etaDate===tomorrow)return `Tomorrow, ${timeStr}`;
 return `${dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}, ${timeStr}`;
};

function Login({done}){const[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);async function submit(e){e.preventDefault();setLoading(true);setError('');try{await api('/login',{method:'POST',body:JSON.stringify({password})});done()}catch(e){setError(e.message)}finally{setLoading(false)}}return <main className="loginShell"><form onSubmit={submit} className="login card"><div className="logo"><Printer size={25}/> NEPTUNE <span>FARM</span></div><h1>Welcome back</h1><p>Monitor your entire 3D printer farm in one place.</p><label>Admin password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required autoFocus/><button className="primary full" disabled={loading}>{loading?'Signing in…':'Sign in to dashboard'}</button>{error&&<div className="error">{error}</div>}<small>Read-only printer monitoring</small></form></main>}

function PrinterCard({p}){
 const s=p.status||'connecting';
 const printerUrl=p.host?`http://${p.host}${p.port&&p.port!==80?':'+p.port:''}`:null;
 return <article className="card printerCard">
  <div className="printerTop">
   <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
    <div className="printerIcon"><Printer size={22}/></div>
    {p.enabled&&printerUrl&&(
     <a href={printerUrl} target="_blank" rel="noreferrer" className="printerIpLink" title={`Open ${p.name} web UI (${p.host})`}>
      <span>{p.host}</span>
      <ExternalLink size={11}/>
     </a>
    )}
   </div>
   <span className={'pill '+color(s)}><i/>{s}</span>
  </div>
  <h3>{p.name}</h3>
  <div className="subline">{p.enabled?(p.port===80?'Port 80 (HTTP)':p.host+':'+p.port):'Not enabled'}</div>
  <div className="job" title={p.file}>{p.file||'No active G-code job'}</div>

  <div className="progressHead">
   <span>Print progress</span>
   <b>{p.progress??0}%</b>
  </div>
  <div className="bar">
   <div className={'barFill '+color(s)} style={{width:(p.progress??0)+'%'}}/>
  </div>

  {s==='printing'&&p.eta&&(
   <div className="finishBanner">
    <div className="finishItem">
     <span className="finishLabel">🏁 Finish Time</span>
     <strong className="finishVal">{formatFinishTime(p.eta)}</strong>
    </div>
    <div className="finishItem right">
     <span className="finishLabel">⏳ Remaining</span>
     <strong className="finishVal">{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'} left</strong>
    </div>
   </div>
  )}

  <div className="facts">
   <div><Thermometer size={16}/><span>Nozzle</span><b>{temp(p.nozzle)}</b></div>
   <div><Thermometer size={16}/><span>Bed</span><b>{temp(p.bed)}</b></div>
   <div><Clock size={16}/><span>Elapsed</span><b>{fmtDuration(p.duration)}</b></div>
   <div><Clock size={16}/><span>Total Time</span><b>{fmtDuration(p.totalDuration)}</b></div>
   <div>
    <Layers size={16}/>
    <span>Layer</span>
    <b>{p.layer!=null?p.layer+(p.totalLayers!=null?' / '+p.totalLayers:p.z!=null?` (${p.z.toFixed(2)}mm)`:''):p.z!=null?`${p.z.toFixed(2)} mm`:'—'}</b>
   </div>
   <div>
    <CheckCheck size={16}/>
    <span>Remaining</span>
    <b>{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'}</b>
   </div>
  </div>

  <div className={'filament '+(p.filamentDetected===false?'danger':'')}>
   <span>Filament sensor</span>
   <strong>{p.filamentDetected===false?'RUNOUT':p.filamentDetected===true?'Detected':'Unavailable / Unknown'}</strong>
  </div>

  {p.error&&<div className="errorText" title={p.error}>{p.error}</div>}

  {p.enabled&&printerUrl&&(
   <a href={printerUrl} target="_blank" rel="noreferrer" className="openPrinterBtn" title={`Open ${p.name} Fluidd interface (${p.host})`}>
    <ExternalLink size={13}/>
    <span>Open Printer Web UI ({p.host})</span>
   </a>
  )}

  <div className="updated">Updated: {p.updatedAt?new Date(p.updatedAt).toLocaleString():'Awaiting connection'}</div>
 </article>;
}

function CompletedPage({data,onSync}){
 const[search,setSearch]=useState('');
 const[tab,setTab]=useState('days'); // 'days' | 'summary' | 'jobs'
 const[datePreset,setDatePreset]=useState('all'); // 'all' | 'today' | 'yesterday' | 'last7' | 'custom'
 const[statusFilter,setStatusFilter]=useState('all'); // 'all' | 'completed' | 'failed'
 const[customDate,setCustomDate]=useState('');
 const[syncing,setSyncing]=useState(false);

 const allJobs=data?.jobs||[];
 const todayStr=getLocalDateStr(new Date());
 const yDate=new Date();yDate.setDate(yDate.getDate()-1);
 const yesterdayStr=getLocalDateStr(yDate);
 const last7Date=new Date();last7Date.setDate(last7Date.getDate()-7);
 const last7Str=getLocalDateStr(last7Date);

 const todayCount=allJobs.filter(j=>getLocalDateStr(j.completedAt)===todayStr).length;
 const yesterdayCount=allJobs.filter(j=>getLocalDateStr(j.completedAt)===yesterdayStr).length;
 const last7Count=allJobs.filter(j=>getLocalDateStr(j.completedAt)>=last7Str).length;

 const totalCompletedAll=allJobs.filter(j=>j.isCompleted).length;
 const totalFailedAll=allJobs.filter(j=>j.isFailed).length;

 // Filter jobs by date, status, and search
 const filteredJobs=allJobs.filter(j=>{
  const dStr=getLocalDateStr(j.completedAt);
  if(datePreset==='today'&&dStr!==todayStr)return false;
  if(datePreset==='yesterday'&&dStr!==yesterdayStr)return false;
  if(datePreset==='last7'&&dStr<last7Str)return false;
  if(datePreset==='custom'&&customDate&&dStr!==customDate)return false;
  if(statusFilter==='completed'&&!j.isCompleted)return false;
  if(statusFilter==='failed'&&!j.isFailed)return false;
  if(search&&!(j.file||'').toLowerCase().includes(search.toLowerCase()))return false;
  return true;
 });

 // File quantities for filtered selection
 const fileSummaryMap=new Map();
 for(const j of filteredJobs){
  const fn=j.file||'Unknown';
  if(!fileSummaryMap.has(fn)){
   fileSummaryMap.set(fn,{file:fn,quantity:0,failedCount:0,totalJobs:0,totalDuration:0,failedDuration:0,lastCompletedAt:null,lastFailedAt:null,printers:new Set(),completionTimes:[],failureTimes:[]});
  }
  const item=fileSummaryMap.get(fn);
  item.totalJobs+=1;
  if(j.isCompleted){
   item.quantity+=1;
   item.totalDuration+=(j.duration||0);
   if(!item.lastCompletedAt||new Date(j.completedAt)>new Date(item.lastCompletedAt)){item.lastCompletedAt=j.completedAt}
   item.completionTimes.push(j.completedAt);
  }else{
   item.failedCount+=1;
   item.failedDuration+=(j.duration||0);
   if(!item.lastFailedAt||new Date(j.completedAt)>new Date(item.lastFailedAt)){item.lastFailedAt=j.completedAt}
   item.failureTimes.push({time:j.completedAt,status:j.status,duration:j.duration});
  }
  if(j.printerName)item.printers.add(j.printerName);
 }

 const fileSummary=Array.from(fileSummaryMap.values()).map(x=>({
  ...x,
  printers:Array.from(x.printers),
  avgDuration:x.quantity?Math.round(x.totalDuration/x.quantity):0,
  successRate:x.totalJobs?Math.round((x.quantity/x.totalJobs)*100):0,
  completionTimes:x.completionTimes.sort((a,b)=>new Date(b)-new Date(a)),
  failureTimes:x.failureTimes.sort((a,b)=>new Date(b.time)-new Date(a.time))
 })).sort((a,b)=>b.quantity-a.quantity||b.totalJobs-a.totalJobs);

 const filteredCompletedCount=filteredJobs.filter(j=>j.isCompleted).length;
 const filteredFailedCount=filteredJobs.filter(j=>j.isFailed).length;
 const totalDuration=filteredJobs.filter(j=>j.isCompleted).reduce((a,b)=>a+(b.duration||0),0);
 const wastedDuration=filteredJobs.filter(j=>j.isFailed).reduce((a,b)=>a+(b.duration||0),0);
 const successRate=filteredJobs.length?Math.round((filteredCompletedCount/filteredJobs.length)*100):0;
 const topFile=fileSummary[0];

 // Daily breakdown map
 const dailyMap=new Map();
 const dailyBaseJobs=allJobs.filter(j=>{
  const dStr=getLocalDateStr(j.completedAt);
  if(datePreset==='last7'&&dStr<last7Str)return false;
  if(datePreset==='today'&&dStr!==todayStr)return false;
  if(datePreset==='yesterday'&&dStr!==yesterdayStr)return false;
  if(datePreset==='custom'&&customDate&&dStr!==customDate)return false;
  if(search&&!(j.file||'').toLowerCase().includes(search.toLowerCase()))return false;
  return true;
 });

 for(const j of dailyBaseJobs){
  const dStr=getLocalDateStr(j.completedAt);
  if(!dailyMap.has(dStr)){
   dailyMap.set(dStr,{date:dStr,completedCount:0,failedCount:0,totalJobs:0,totalDuration:0,wastedDuration:0,fileMap:new Map(),jobs:[]});
  }
  const day=dailyMap.get(dStr);
  day.totalJobs+=1;
  day.jobs.push(j);
  if(j.isCompleted){
   day.completedCount+=1;
   day.totalDuration+=(j.duration||0);
  }else{
   day.failedCount+=1;
   day.wastedDuration+=(j.duration||0);
  }

  const fn=j.file||'Unknown';
  if(!day.fileMap.has(fn)){
   day.fileMap.set(fn,{file:fn,completedCount:0,failedCount:0,times:[],failedTimes:[],printers:new Set()});
  }
  const fm=day.fileMap.get(fn);
  if(j.isCompleted){
   fm.completedCount+=1;
   fm.times.push(j.completedAt);
  }else{
   fm.failedCount+=1;
   fm.failedTimes.push({time:j.completedAt,status:j.status,duration:j.duration});
  }
  if(j.printerName)fm.printers.add(j.printerName);
 }

 const dailyList=Array.from(dailyMap.values()).map(d=>({
  ...d,
  files:Array.from(d.fileMap.values()).map(f=>({
   ...f,
   printers:Array.from(f.printers),
   times:f.times.sort((a,b)=>new Date(b)-new Date(a)),
   failedTimes:f.failedTimes.sort((a,b)=>new Date(b.time)-new Date(a.time))
  })).sort((a,b)=>b.completedCount-a.completedCount||b.failedCount-a.failedCount)
 })).sort((a,b)=>b.date.localeCompare(a.date));

 async function triggerSync(){
  setSyncing(true);
  try{await onSync()}finally{setSyncing(false)}
 }

 function selectDay(dStr){
  setDatePreset('custom');
  setCustomDate(dStr);
  setTab('summary');
 }

 function clearFilter(){
  setDatePreset('all');
  setCustomDate('');
  setStatusFilter('all');
  setSearch('');
 }

 return <div className="completedPage">
  <div className="titleRow">
   <div>
    <h1>Production & Completed Prints</h1>
    <p>Daily piece tracking, successful prints vs failures, completion times, and quantities.</p>
   </div>
   <button className="outline" onClick={triggerSync} disabled={syncing}>
    <RefreshCw size={16} className={syncing?'spin':''}/> {syncing?'Syncing…':'Sync History'}
   </button>
  </div>

  {/* Filter Card */}
  <div className="card" style={{padding:'14px 18px',marginBottom:'22px'}}>
   {/* Status Filter Buttons */}
   <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px',marginBottom:'12px',paddingBottom:'12px',borderBottom:'1px solid #223249'}}>
    <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',color:'#768ba6',display:'flex',alignItems:'center',gap:'6px',marginRight:'6px'}}>
     STATUS:
    </span>
    <button className={'statusFilterBtn '+(statusFilter==='all'?'active all':'')} onClick={()=>setStatusFilter('all')}>
     All Prints ({allJobs.length})
    </button>
    <button className={'statusFilterBtn '+(statusFilter==='completed'?'active completed':'')} onClick={()=>setStatusFilter('completed')}>
     <CheckCircle2 size={14}/> Completed ({totalCompletedAll} pcs)
    </button>
    <button className={'statusFilterBtn '+(statusFilter==='failed'?'active failed':'')} onClick={()=>setStatusFilter('failed')}>
     <XCircle size={14}/> Failed & Cancelled ({totalFailedAll})
    </button>
   </div>

   {/* Date Filter Buttons */}
   <div className="dateFilterRow">
    <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',color:'#768ba6',display:'flex',alignItems:'center',gap:'6px',marginRight:'6px'}}>
     <Calendar size={13}/> DATE:
    </span>
    <button className={'dateBtn '+(datePreset==='all'?'active':'')} onClick={()=>{setDatePreset('all');setCustomDate('')}}>
     All Dates
    </button>
    <button className={'dateBtn '+(datePreset==='today'?'active':'')} onClick={()=>{setDatePreset('today');setCustomDate('')}}>
     Today ({todayCount})
    </button>
    <button className={'dateBtn '+(datePreset==='yesterday'?'active':'')} onClick={()=>{setDatePreset('yesterday');setCustomDate('')}}>
     Yesterday ({yesterdayCount})
    </button>
    <button className={'dateBtn '+(datePreset==='last7'?'active':'')} onClick={()=>{setDatePreset('last7');setCustomDate('')}}>
     Last 7 Days ({last7Count})
    </button>

    <div style={{display:'flex',alignItems:'center',gap:'6px',marginLeft:'auto'}}>
     <Calendar size={15} style={{color:'#7088a8'}}/>
     <input
      type="date"
      className="dateInput"
      value={customDate}
      onChange={e=>{
       if(e.target.value){
        setCustomDate(e.target.value);
        setDatePreset('custom');
       }else{
        setDatePreset('all');
        setCustomDate('');
       }
      }}
     />
     {(datePreset!=='all'||statusFilter!=='all'||search)&&<button className="clearBtn" onClick={clearFilter}>Reset all filters</button>}
    </div>
   </div>
  </div>

  {/* Filter Notice Banner if specific filter active */}
  {(datePreset!=='all'||statusFilter!=='all'||search)&&(
   <div className="filterNotice">
    <span>
     Showing: <b>{statusFilter==='completed'?'Completed Only':statusFilter==='failed'?'Failed Only':'All Statuses'}</b>
     {' '}for <b>
      {datePreset==='today'?`Today (${formatLocalDate(todayStr)})`:
       datePreset==='yesterday'?`Yesterday (${formatLocalDate(yesterdayStr)})`:
       datePreset==='last7'?'Last 7 Days':
       customDate?formatLocalDate(customDate):'All Dates'}
     </b> · <strong>{filteredCompletedCount} completed</strong> · <strong style={{color:'#ff8b95'}}>{filteredFailedCount} failed</strong>
    </span>
    <button className="clearBtn" onClick={clearFilter}>Show All</button>
   </div>
  )}

  {/* KPI Stats Row */}
  <section className="stats">
   <div className="stat card">
    <div><span>Pieces Completed</span><b>{filteredCompletedCount} pcs</b></div>
    <PackageCheck/>
   </div>
   <div className="stat card">
    <div>
     <span style={{color:'#ff9ca6'}}>Failed / Cancelled</span>
     <b style={{color:'#ff808d'}}>{filteredFailedCount}</b>
    </div>
    <XCircle style={{color:'#ff707f'}}/>
   </div>
   <div className="stat card">
    <div><span>Success Rate</span><b>{successRate}%</b></div>
    <TrendingUp style={{color:successRate>=75?'#3ddbb3':'#f1a94e'}}/>
   </div>
   <div className="stat card">
    <div>
     <span>Completed Time</span>
     <b>{fmtDuration(totalDuration)}</b>
     {wastedDuration>0&&<small style={{display:'block',color:'#ff8b95',marginTop:'4px'}}>Wasted: {fmtDuration(wastedDuration)}</small>}
    </div>
    <Clock/>
   </div>
  </section>

  {/* Subtabs and Search Bar */}
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'20px'}}>
   <div className="subTabs">
    <button className={'subTabBtn '+(tab==='days'?'active':'')} onClick={()=>setTab('days')}>
     Days-wise Breakdown ({dailyList.length} days)
    </button>
    <button className={'subTabBtn '+(tab==='summary'?'active':'')} onClick={()=>setTab('summary')}>
     Quantities by File ({fileSummary.length})
    </button>
    <button className={'subTabBtn '+(tab==='jobs'?'active':'')} onClick={()=>setTab('jobs')}>
     Detailed Job Log ({filteredJobs.length})
    </button>
   </div>

   <div className="searchBox">
    <Search size={16}/>
    <input type="text" placeholder="Search G-code filename…" value={search} onChange={e=>setSearch(e.target.value)}/>
   </div>
  </div>

  {/* TAB 1: Days-wise Breakdown */}
  {tab==='days'&&(
   <div className="dailyBreakdown">
    {dailyList.length?dailyList.map(d=>(
     <div className="dayCard" key={d.date}>
      <div className="dayHeader">
       <div className="dayTitle">
        <Calendar size={18} style={{color:'#539bf5'}}/>
        <span>{formatLocalDate(d.date)}</span>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{color:'#889cb5',fontSize:'12px'}}>Time: <b>{fmtDuration(d.totalDuration)}</b></span>
        <span className="qtyBadge" style={{fontSize:'12px',padding:'4px 10px'}}>{d.completedCount} pcs</span>
        {d.failedCount>0&&<span className="failBadge" style={{fontSize:'12px',padding:'4px 10px'}}>{d.failedCount} failed</span>}
        <button className="outline" style={{padding:'5px 11px',fontSize:'12px',marginLeft:'4px'}} onClick={()=>selectDay(d.date)}>Filter this day</button>
       </div>
      </div>

      <div style={{marginTop:'12px'}}>
       {d.files.map(f=>(
        <div className="dayRow" key={f.file}>
         <div style={{minWidth:0,flex:1,paddingRight:'14px'}}>
          <div style={{color:'#fff',fontWeight:600,fontSize:'13px'}}>{f.file}</div>
          <div style={{marginTop:'5px',display:'flex',alignItems:'center',flexWrap:'wrap',gap:'4px'}}>
           {f.times.length>0&&<>
            <span style={{color:'#7b90aa',fontSize:'11px',marginRight:'2px'}}>Completed:</span>
            {f.times.map((t,idx)=>(
             <span key={idx} className="timeBadge">{formatTime(t)}</span>
            ))}
           </>}
           {f.failedTimes.length>0&&<>
            <span style={{color:'#e37681',fontSize:'11px',marginLeft:'6px',marginRight:'2px'}}>Failed / Cancelled:</span>
            {f.failedTimes.map((ft,idx)=>(
             <span key={idx} className="timeBadge failed" title={`${statusLabel(ft.status)} after ${fmtDuration(ft.duration)}`}>
              {formatTime(ft.time)} ({statusLabel(ft.status)})
             </span>
            ))}
           </>}
           {f.printers.map(p=>(
            <span key={p} className="printerTag">{p}</span>
           ))}
          </div>
         </div>
         <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
          {f.completedCount>0&&<span className="qtyBadge">{f.completedCount} pcs</span>}
          {f.failedCount>0&&<span className="failBadge">{f.failedCount} failed</span>}
         </div>
        </div>
       ))}
      </div>
     </div>
    )):<div className="card empty">No days found matching the selected filter.</div>}
   </div>
  )}

  {/* TAB 2: Quantities by File */}
  {tab==='summary'&&(
   <div className="card" style={{overflow:'hidden'}}>
    <div className="tableWrapper">
     <table className="prodTable">
      <thead>
       <tr>
        <th>File Name</th>
        <th style={{textAlign:'center'}}>Completed</th>
        <th style={{textAlign:'center'}}>Failed</th>
        <th style={{textAlign:'center'}}>Success Rate</th>
        <th>Avg Time (Success)</th>
        <th>Completion & Failure Times</th>
        <th>Printed On</th>
       </tr>
      </thead>
      <tbody>
       {fileSummary.length?fileSummary.map(s=>(
        <tr key={s.file}>
         <td style={{maxWidth:'280px'}}>
          <strong style={{color:'#fff',fontSize:'13px',display:'block',wordBreak:'break-all'}}>{s.file}</strong>
          {s.lastCompletedAt&&<small style={{color:'#7d93ae',display:'block',marginTop:'3px'}}>Last completed: {new Date(s.lastCompletedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small>}
          {s.lastFailedAt&&<small style={{color:'#dd7883',display:'block',marginTop:'2px'}}>Last failed: {new Date(s.lastFailedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small>}
         </td>
         <td style={{textAlign:'center'}}>
          {s.quantity>0?<span className="qtyBadge">{s.quantity} pcs</span>:<span style={{color:'#667b96'}}>—</span>}
         </td>
         <td style={{textAlign:'center'}}>
          {s.failedCount>0?<span className="failBadge">{s.failedCount}</span>:<span style={{color:'#667b96'}}>0</span>}
         </td>
         <td style={{textAlign:'center'}}>
          <span style={{fontWeight:700,color:s.successRate>=80?'#4eedb8':s.successRate>=50?'#f1a94e':'#ff7d89'}}>
           {s.totalJobs?`${s.successRate}%`:'—'}
          </span>
         </td>
         <td className="timePill">{fmtDuration(s.avgDuration)}</td>
         <td>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px',maxWidth:'340px'}}>
           {s.completionTimes.slice(0,5).map((t,idx)=>(
            <span key={idx} className="timeBadge" title={`Completed at ${new Date(t).toLocaleString()}`}>{formatTime(t)}</span>
           ))}
           {s.failureTimes.slice(0,3).map((ft,idx)=>(
            <span key={'f'+idx} className="timeBadge failed" title={`Failed (${statusLabel(ft.status)}) at ${new Date(ft.time).toLocaleString()}`}>
             {formatTime(ft.time)} ({statusLabel(ft.status)})
            </span>
           ))}
           {(s.completionTimes.length>5||s.failureTimes.length>3)&&<small style={{color:'#7e96b3'}}>+more</small>}
          </div>
         </td>
         <td>{s.printers.map(p=><span key={p} className="printerTag">{p}</span>)}</td>
        </tr>
       )):<tr><td colSpan="7" style={{textAlign:'center',padding:'36px',color:'#7f93ad'}}>No prints found matching your filter.</td></tr>}
      </tbody>
     </table>
    </div>
   </div>
  )}

  {/* TAB 3: Detailed Job Log */}
  {tab==='jobs'&&(
   <div className="card" style={{overflow:'hidden'}}>
    <div className="tableWrapper">
     <table className="prodTable">
      <thead>
       <tr>
        <th>Job ID</th>
        <th>File Name</th>
        <th>Status</th>
        <th>Printer</th>
        <th>Duration</th>
        <th>Finished / Failed At</th>
        <th>Filament Used</th>
       </tr>
      </thead>
      <tbody>
       {filteredJobs.length?filteredJobs.map(j=>(
        <tr key={j.id}>
         <td style={{color:'#6882a4',fontFamily:'monospace'}}>{j.jobId||j.id.slice(-6)}</td>
         <td><strong style={{color:'#fff',fontSize:'13px'}}>{j.file}</strong></td>
         <td>
          <span className={'pill '+(j.isCompleted?'green':j.status==='cancelled'?'amber':'red')}>
           <i/>{statusLabel(j.status)}
          </span>
         </td>
         <td><span className="printerTag">{j.printerName}</span></td>
         <td className="timePill">
          {fmtDuration(j.duration)}
          {j.isFailed&&<small style={{display:'block',color:'#ff8b95'}}>Wasted</small>}
         </td>
         <td>
          <span style={{color:j.isCompleted?'#9cb5d6':'#f19aa2'}}>
           {new Date(j.completedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}
          </span>
         </td>
         <td style={{color:'#88a3c5'}}>{j.filamentUsed?(j.filamentUsed/1000).toFixed(2)+' m':'—'}</td>
        </tr>
       )):<tr><td colSpan="7" style={{textAlign:'center',padding:'36px',color:'#7f93ad'}}>No jobs found for this filter.</td></tr>}
      </tbody>
     </table>
    </div>
   </div>
  )}
 </div>
}

function SettingsPage({list,reload}){const[items,setItems]=useState(list),[busy,setBusy]=useState(false),[message,setMessage]=useState('');useEffect(()=>setItems(list),[list]);function edit(i,key,value){setItems(old=>old.map((p,j)=>j===i?{...p,[key]:value}:p))}async function save(){setBusy(true);setMessage('');try{await api('/config',{method:'PUT',body:JSON.stringify(items)});await reload();setMessage('Saved! Printer monitoring will refresh.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}async function telegram(){try{const r=await api('/test-telegram',{method:'POST'});setMessage(r.note)}catch(e){setMessage(e.message)}}return <div className="settings"><div className="titleRow"><div><h1>Printer settings</h1><p>Use each printer's local IP and port (Neptune 4 uses port <b>80</b>; standard Klipper uses 7125).</p></div><button className="outline" onClick={()=>setItems(a=>[...a,{id:'printer-'+Date.now(),name:'New printer',host:'192.168.1.100',port:80,enabled:false}])}><Plus size={16}/> Add printer</button></div><div className="card settingCard">{items.map((p,i)=><div key={p.id} className="settingRow"><div className="settingNum">{String(i+1).padStart(2,'0')}</div><label>Printer name<input value={p.name} onChange={e=>edit(i,'name',e.target.value)}/></label><label>IP / host<input value={p.host} onChange={e=>edit(i,'host',e.target.value)}/></label><label>Moonraker port<input type="number" min="1" max="65535" value={p.port} onChange={e=>edit(i,'port',Number(e.target.value))}/></label><label className="enabled"><input type="checkbox" checked={p.enabled} onChange={e=>edit(i,'enabled',e.target.checked)}/>Enabled</label><button title="Remove printer" className="iconButton" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))}><Trash2 size={17}/></button></div>)}<div className="settingActions"><button className="primary" onClick={save} disabled={busy}>{busy?'Saving…':'Save changes'}</button><button className="outline" onClick={telegram}><Bell size={16}/> Test Telegram</button>{message&&<span>{message}</span>}</div></div><div className="card tip"><ShieldCheck size={21}/><div><b>Security</b><p>Keep Moonraker and dashboard ports private. For phone access outside the office, use a secure tailnet/VPN such as Tailscale. Do not expose the printer IPs on the open internet.</p></div></div></div>}

function App(){
 const[authed,setAuthed]=useState(null),[page,setPage]=useState('overview'),[printers,setPrinters]=useState([]),[config,setConfig]=useState([]),[events,setEvents]=useState([]),[completed,setCompleted]=useState({jobs:[],summary:[]}),[error,setError]=useState(''),[refreshed,setRefreshed]=useState(null);

 async function refresh(){
  try{
   const [p,e,c]=await Promise.all([api('/printers'),api('/events'),api('/completed-prints')]);
   setPrinters(p);setEvents(e);setCompleted(c);setError('');setRefreshed(new Date());
  }catch(e){
   if(e.message==='Login required')setAuthed(false);else setError(e.message);
  }
 }

 async function loadConfig(){try{setConfig(await api('/config'))}catch(e){setError(e.message)}}
 async function syncHistory(){await api('/completed-prints/sync',{method:'POST'});await refresh()}

 useEffect(()=>{api('/me').then(()=>setAuthed(true)).catch(()=>setAuthed(false))},[]);
 useEffect(()=>{if(!authed)return;refresh();loadConfig();const t=setInterval(refresh,5000);return()=>clearInterval(t)},[authed]);

 if(authed===null)return <div className="boot">Loading Neptune Print Farm…</div>;
 if(!authed)return <Login done={()=>setAuthed(true)}/>;

 const total=printers.length,printing=printers.filter(p=>p.status==='printing').length,paused=printers.filter(p=>p.status==='paused').length,online=printers.filter(p=>p.connected).length,issues=printers.filter(p=>p.status==='offline'||p.status==='error'||p.filamentDetected===false).length;

 return <div className="layout">
  <aside>
   <div className="logo"><Printer size={25}/> NEPTUNE <span>FARM</span></div>
   <div className="asideLabel">WORKSPACE</div>
   <button className={'nav '+(page==='overview'?'active':'')} onClick={()=>setPage('overview')}><Activity size={18}/> Live overview</button>
   <button className={'nav '+(page==='completed'?'active':'')} onClick={()=>setPage('completed')}><CheckCheck size={18}/> Production & Qty</button>
   <button className={'nav '+(page==='alerts'?'active':'')} onClick={()=>setPage('alerts')}><Bell size={18}/> Alerts & events</button>
   <button className={'nav '+(page==='settings'?'active':'')} onClick={()=>setPage('settings')}><Settings size={18}/> Printer settings</button>
   <div className="asideFoot">
    <div className="badgeInfo">READ-ONLY MONITORING</div>
    <button className="nav" onClick={async()=>{await api('/logout',{method:'POST'});setAuthed(false)}}><LogOut size={18}/> Sign out</button>
   </div>
  </aside>

  <main className="main">
   <header>
    <div className="mobileLogo"><Printer size={20}/> Neptune Farm</div>
    <span className="live"><i/> Local network monitor</span>
    <span className="headerTime">{refreshed?'Last refresh '+refreshed.toLocaleTimeString():'Connecting…'}</span>
    <button className="iconButton" title="Refresh" onClick={refresh}><RefreshCw size={18}/></button>
   </header>

   <div className="mobileNav">
    <button onClick={()=>setPage('overview')}>Overview</button>
    <button onClick={()=>setPage('completed')}>Production</button>
    <button onClick={()=>setPage('alerts')}>Alerts</button>
    <button onClick={()=>setPage('settings')}>Settings</button>
   </div>

   {error&&<div className="banner">{error}</div>}

   {page==='overview'?(
    <>
     <div className="titleRow">
      <div><h1>Printer farm overview</h1><p>Live operational status across all connected printers.</p></div>
      <span className="date">{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>
     </div>

     <section className="stats">
      <div className="stat card"><div><span>Total printers</span><b>{total}</b></div><Printer/></div>
      <div className="stat card"><div><span>Printing</span><b>{printing}</b></div><Activity/></div>
      <div className="stat card"><div><span>Online</span><b>{online}</b></div><CheckCircle2/></div>
      <div className="stat card"><div><span>Needs attention</span><b>{issues+paused}</b></div><AlertTriangle/></div>
     </section>

     <div className="sectionTitle"><h2>All printers</h2><span>{printing} printing · {paused} paused</span></div>
     <section className="printers">{printers.map(p=><PrinterCard key={p.id} p={p}/>)}</section>

     <div className="sectionTitle">
      <h2>Completed Quantities by File</h2>
      <button className="textButton" onClick={()=>setPage('completed')}>View full production log →</button>
     </div>
     <section className="card" style={{padding:'16px 20px',marginBottom:'34px'}}>
      {completed.summary.length?(
       <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:'12px'}}>
        {completed.summary.slice(0,6).map(s=>(
         <div key={s.file} style={{background:'#192538',border:'1px solid #2b3b52',borderRadius:'10px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{minWidth:0,paddingRight:'10px'}}>
           <div style={{color:'#e2edfc',fontWeight:600,fontSize:'13px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={s.file}>{s.file}</div>
           <small style={{color:'#829bb8'}}>Avg: {fmtDuration(s.avgDuration)} · Last: {s.lastCompletedAt?new Date(s.lastCompletedAt).toLocaleDateString([],{month:'short',day:'numeric'}):'—'}</small>
          </div>
          <span className="qtyBadge" style={{flexShrink:0}}>{s.quantity} pcs</span>
         </div>
        ))}
       </div>
      ):<div className="empty">No completed prints recorded yet.</div>}
     </section>

     <div className="sectionTitle"><h2>Recent activity</h2><button className="textButton" onClick={()=>setPage('alerts')}>View all →</button></div>
     <section className="card activity">
      {events.length?events.slice(0,5).map(e=><div key={e.id} className="event"><span className={'dot '+(e.type==='completed'?'teal':'amber')}/><div>{e.message}<small>{new Date(e.time).toLocaleString()}</small></div></div>):<div className="empty">No events yet. Enable printers in Settings to begin monitoring.</div>}
     </section>
    </>
   ):page==='completed'?(
    <CompletedPage data={completed} onSync={syncHistory}/>
   ):page==='settings'?(
    <SettingsPage list={config} reload={async()=>{await loadConfig();await refresh()}}/>
   ):(
    <>
     <div className="titleRow"><div><h1>Alerts and event history</h1><p>Changes observed while this monitor was running.</p></div></div>
     <div className="card activity">
      {events.length?events.map(e=><div className="event" key={e.id}><span className={'dot '+(e.type==='completed'?'teal':'amber')}/><div>{e.message}<small>{new Date(e.time).toLocaleString()} · {e.type}</small></div></div>):<div className="empty"><WifiOff size={22}/> No events recorded yet.</div>}
     </div>
    </>
   )}
  </main>
 </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
