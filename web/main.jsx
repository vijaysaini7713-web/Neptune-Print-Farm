import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Printer,Settings,Activity,LogOut,RefreshCw,AlertTriangle,CheckCircle2,Thermometer,Clock,Layers,Plus,Trash2,Bell,ShieldCheck,WifiOff,PackageCheck,CheckCheck,Search,Calendar,Filter,XCircle,TrendingUp,ExternalLink,Wifi,Globe,Radio,Server,Terminal,Play,Pause,Square,Flame,RotateCcw,Send,X,Home,ShieldAlert,Sliders}from'lucide-react';
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

function Login({done}){
 const[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false),[sys,setSys]=useState(null);
 useEffect(()=>{api('/system-info').then(setSys).catch(()=>{})},[]);
 const isLocal = sys ? (sys.isLocalClient || ['localhost','127.0.0.1'].includes(window.location.hostname) || window.location.hostname.startsWith('172.16.') || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.')) : true;
 async function submit(e){e.preventDefault();setLoading(true);setError('');try{await api('/login',{method:'POST',body:JSON.stringify({password})});done()}catch(e){setError(e.message)}finally{setLoading(false)}}
 return <main className="loginShell">
  <form onSubmit={submit} className="login card">
   <div className="logo"><Printer size={25}/> NEPTUNE <span>FARM</span></div>
   <div className={'netBadge '+(isLocal?'local':'remote')} style={{marginBottom:'16px'}}>
    {isLocal?<Wifi size={13}/>:<Globe size={13}/>}
    <span>{isLocal?`LAN Network (${sys?.primaryIp||'172.16.20.139'})`:`Remote Access (Host: ${sys?.primaryIp||'172.16.20.139'})`}</span>
   </div>
   <h1>Welcome back</h1>
   <p>Monitor your entire 3D printer farm in one place.</p>
   <label>Admin password</label>
   <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required autoFocus/>
   <button className="primary full" disabled={loading}>{loading?'Signing in…':'Sign in to dashboard'}</button>
   {error&&<div className="error">{error}</div>}
   <small>Read-only printer monitoring</small>
  </form>
 </main>;
}

function PrinterCard({p,isLocal,systemInfo,onOpenControl}){
 const s=p.status||'connecting';
 const printerUrl=p.host?`http://${p.host}${p.port&&p.port!==80?':'+p.port:''}`:null;
 const isDone=s==='completed';
 const isIdle=s==='idle';
 const isPaused=s==='paused';
 const isError=s==='error'||s==='offline';

 return <article className={`card printerCard state-${s}`}>
  {/* High Visibility Distance Banner for Across-the-Room Recognition */}
  {isDone&&(
   <div className="stateBanner completed">
    <CheckCircle2 size={13}/>
    <span>PRINT COMPLETED · READY TO CLEAR</span>
   </div>
  )}
  {isIdle&&(
   <div className="stateBanner idle">
    <Clock size={13}/>
    <span>PRINTER IDLE · READY FOR JOB</span>
   </div>
  )}
  {isPaused&&(
   <div className="stateBanner paused">
    <Pause size={13}/>
    <span>PRINT PAUSED · ATTENTION NEEDED</span>
   </div>
  )}
  {isError&&(
   <div className="stateBanner error">
    <AlertTriangle size={13}/>
    <span>{s==='offline'?'PRINTER OFFLINE':'ERROR / ATTENTION NEEDED'}</span>
   </div>
  )}

  <div className="printerTop">
   <div className="printerTopLeft">
    <div className="printerIcon"><Printer size={17}/></div>
    <div>
     <h3 className="printerName">{p.name}</h3>
     <div className="printerIpRow">
      {p.enabled&&printerUrl?(
       <a href={printerUrl} target="_blank" rel="noreferrer" className="printerIpLink" title={`Open ${p.name} Web UI (${p.host})`}>
        <span>{p.host}</span>
        <ExternalLink size={10}/>
       </a>
      ):<span className="subline">Not enabled</span>}
     </div>
    </div>
   </div>
   <div className="printerTopRight">
    <span className={'pill '+color(s)}><i/>{s}</span>
    {p.filamentDetected===false&&(
     <span className="filRunoutBadge" title="Filament runout detected!">RUNOUT</span>
    )}
   </div>
  </div>

  <div className="job" title={p.file||'No active job'}>
   <Activity size={12} style={{flexShrink:0,opacity:.7}}/>
   <span className="jobName">{p.file||'No active G-code job'}</span>
  </div>

  <div className="progressBarWrap">
   <div className="progressHead">
    <span>Progress</span>
    <b>{p.progress??0}%</b>
   </div>
   <div className="bar">
    <div className={'barFill '+color(s)} style={{width:(p.progress??0)+'%'}}/>
   </div>
  </div>

  {s==='printing'&&p.eta&&(
   <div className="finishBannerCompact">
    <span className="finishPart">🏁 <b>{formatFinishTime(p.eta)}</b></span>
    <span className="finishPart right">⏳ <b>{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'}</b> left</span>
   </div>
  )}

  {/* Exactly 2 lines (3 columns x 2 rows) */}
  <div className="facts2x3">
   <div className="factCell">
    <div className="factLabel"><Thermometer size={10}/> NOZZLE</div>
    <div className="factVal">{temp(p.nozzle)}{p.nozzleTarget?` / ${p.nozzleTarget}°`:''}</div>
   </div>
   <div className="factCell">
    <div className="factLabel"><Thermometer size={10}/> BED</div>
    <div className="factVal">{temp(p.bed)}{p.bedTarget?` / ${p.bedTarget}°`:''}</div>
   </div>
   <div className="factCell">
    <div className="factLabel"><Layers size={10}/> LAYER</div>
    <div className="factVal">{p.layer!=null?`${p.layer}${p.totalLayers?' / '+p.totalLayers:''}`:p.z!=null?`${p.z.toFixed(1)}mm`:'—'}</div>
   </div>
   <div className="factCell">
    <div className="factLabel"><Clock size={10}/> ELAPSED</div>
    <div className="factVal">{fmtDuration(p.duration)}</div>
   </div>
   <div className="factCell">
    <div className="factLabel"><CheckCheck size={10}/> REMAINING</div>
    <div className="factVal highlight">{p.remainingTime!=null?fmtDuration(p.remainingTime):isDone?'Done':'—'}</div>
   </div>
   <div className="factCell">
    <div className="factLabel"><Clock size={10}/> TOTAL TIME</div>
    <div className="factVal">{fmtDuration(p.totalDuration)}</div>
   </div>
  </div>

  {p.error&&<div className="errorText" title={p.error}>{p.error}</div>}

  {/* Compact 1-line button row */}
  {p.enabled&&(
   <div className="cardActionRow">
    <button className="controlBtnSmall" onClick={()=>onOpenControl(p)} title="Remote controls, emergency actions & G-code console">
     <Sliders size={12}/>
     <span>Controls</span>
    </button>
    {printerUrl&&(
     <a href={printerUrl} target="_blank" rel="noreferrer" className={'openPrinterBtnSmall '+(isLocal?'':'remoteBtn')} title={isLocal?`Open ${p.name} Fluidd interface directly`: `Direct LAN IP ${p.host} (requires farm Wi-Fi or VPN)`}>
      <ExternalLink size={12}/>
      <span>{isLocal?'Web UI':'LAN UI'}</span>
     </a>
    )}
   </div>
  )}

  <div className="cardFoot">
   <span>Updated {p.updatedAt?new Date(p.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Waiting'}</span>
   {!isLocal&&<span className="remoteTag"> · System Relay</span>}
  </div>
 </article>;
}

function RemoteControlModal({p,isLocal,systemInfo,onClose,onRefresh}){
 const [logs,setLogs]=useState([]);
 const [cmd,setCmd]=useState('');
 const [sending,setSending]=useState(false);
 const [feedback,setFeedback]=useState(null);
 const [autoScroll,setAutoScroll]=useState(true);
 const logBoxRef=React.useRef(null);

 async function loadLogs(){
  try{
   const r=await api(`/printers/${p.id}/console?count=40`);
   if(r.ok&&Array.isArray(r.logs)){
    setLogs(r.logs);
   }
  }catch(err){}
 }

 useEffect(()=>{
  loadLogs();
  const iv=setInterval(loadLogs,3000);
  return ()=>clearInterval(iv);
 },[p.id]);

 useEffect(()=>{
  if(autoScroll&&logBoxRef.current){
   logBoxRef.current.scrollTop=logBoxRef.current.scrollHeight;
  }
 },[logs]);

 async function sendCommand(action,gcode,confirmPrompt){
  if(confirmPrompt&&!window.confirm(confirmPrompt))return;
  setSending(true);
  setFeedback(null);
  try{
   const r=await api(`/printers/${p.id}/command`,{
    method:'POST',
    body:JSON.stringify({action,gcode})
   });
   setFeedback({type:'success',text:`Command executed: ${action||gcode} (${r.result||'ok'})`});
   if(action==='gcode')setCmd('');
   setTimeout(loadLogs,600);
   setTimeout(onRefresh,800);
  }catch(err){
   setFeedback({type:'error',text:err.message});
  }finally{
   setSending(false);
  }
 }

 const s=p.status||'connecting';
 const printerUrl=p.host?`http://${p.host}${p.port&&p.port!==80?':'+p.port:''}`:null;

 return (
  <div className="modalBackdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
   <div className="modalCard controlModal">
    <div className="modalHeader">
     <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
      <div className="printerIcon" style={{width:'36px',height:'36px'}}><Printer size={18}/></div>
      <div>
       <h2 style={{fontSize:'17px',margin:0,color:'#fff'}}>{p.name}</h2>
       <div style={{fontSize:'11px',color:'#7f94b0'}}>{p.host}:{p.port} · {isLocal?'Direct LAN Mode':'Relayed via Farm Host'}</div>
      </div>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
      <span className={'pill '+color(s)}><i/>{s}</span>
      <button className="iconButton" onClick={onClose} title="Close"><X size={18}/></button>
     </div>
    </div>

    {/* Quick Stats Bar */}
    <div className="controlStatsBar">
     <div>
      <span>Nozzle</span>
      <strong>{temp(p.nozzle)}{p.nozzleTarget?` / ${p.nozzleTarget}°C`:''}</strong>
     </div>
     <div>
      <span>Bed</span>
      <strong>{temp(p.bed)}{p.bedTarget?` / ${p.bedTarget}°C`:''}</strong>
     </div>
     <div>
      <span>Job</span>
      <strong title={p.file||'None'}>{p.file?p.file.slice(0,18)+'...':'No job'}</strong>
     </div>
     <div>
      <span>Progress</span>
      <strong>{p.progress??0}%</strong>
     </div>
     <div>
      <span>Remaining</span>
      <strong>{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'}</strong>
     </div>
    </div>

    {/* Action Feedback Banner */}
    {feedback&&(
     <div className={'ctrlFeedback '+(feedback.type==='error'?'error':'success')}>
      {feedback.type==='error'?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}
      <span>{feedback.text}</span>
     </div>
    )}

    {/* Quick Action Buttons */}
    <div className="ctrlSectionTitle">
     <span>⚡ Emergency & Quick Actions</span>
     <small style={{color:'#7d93ae'}}>Instant control commands executed via Moonraker</small>
    </div>
    <div className="ctrlActionsGrid">
     <button className="ctrlBtn pause" disabled={sending} onClick={()=>sendCommand('pause')}>
      <Pause size={14}/> Pause Print
     </button>
     <button className="ctrlBtn resume" disabled={sending} onClick={()=>sendCommand('resume')}>
      <Play size={14}/> Resume Print
     </button>
     <button className="ctrlBtn cancel" disabled={sending} onClick={()=>sendCommand('cancel',null,`Are you sure you want to CANCEL the print on ${p.name}?`)}>
      <Square size={14}/> Cancel Print
     </button>
     <button className="ctrlBtn cooldown" disabled={sending} onClick={()=>sendCommand('cooldown')}>
      <Flame size={14}/> Cooldown Heaters
     </button>
     <button className="ctrlBtn home" disabled={sending} onClick={()=>sendCommand('home')}>
      <Home size={14}/> Home All (G28)
     </button>
     <button className="ctrlBtn restart" disabled={sending} onClick={()=>sendCommand('firmware_restart',null,`Restart Klipper firmware on ${p.name}?`)}>
      <RotateCcw size={14}/> Firmware Restart
     </button>
     <button className="ctrlBtn emergency" disabled={sending} onClick={()=>sendCommand('emergency_stop',null,`EMERGENCY STOP (M112): This immediately halts all motors and heaters on ${p.name}. Confirm?`)}>
      <ShieldAlert size={14}/> Emergency Stop (M112)
     </button>
    </div>

    {/* Live Terminal Console */}
    <div className="ctrlSectionTitle" style={{marginTop:'18px'}}>
     <span><Terminal size={14} style={{verticalAlign:'middle',marginRight:'5px'}}/> G-Code Terminal & Live Console</span>
     <button className="textButton" style={{fontSize:'11px'}} onClick={loadLogs}>Refresh logs</button>
    </div>

    <div className="terminalBox" ref={logBoxRef}>
     {logs.length?logs.map((item,idx)=>(
      <div key={idx} className={'termLine '+(item.type==='command'?'cmd':'resp')}>
       <span className="termTime">[{new Date(item.time*1000).toLocaleTimeString()}]</span>
       <span className="termPrefix">{item.type==='command'?'> ':'  '}</span>
       <span className="termMsg">{item.message}</span>
      </div>
     )):<div className="empty" style={{padding:'14px'}}>Awaiting terminal logs...</div>}
    </div>

    {/* Preset Quick Chips */}
    <div className="presetChips">
     <span style={{fontSize:'11px',color:'#778ea9',alignSelf:'center'}}>Quick:</span>
     <button className="chip" onClick={()=>sendCommand('gcode','M115')}>M115 (Firmware)</button>
     <button className="chip" onClick={()=>sendCommand('gcode','M105')}>M105 (Temps)</button>
     <button className="chip" onClick={()=>sendCommand('gcode','M84')}>M84 (Motors Off)</button>
     <button className="chip" onClick={()=>sendCommand('gcode','M106 S255')}>Fan 100%</button>
     <button className="chip" onClick={()=>sendCommand('gcode','M106 S0')}>Fan Off</button>
     <button className="chip" onClick={()=>sendCommand('gcode','STATUS')}>STATUS</button>
    </div>

    {/* Command Input Box */}
    <form className="termInputRow" onSubmit={e=>{e.preventDefault();if(cmd.trim())sendCommand('gcode',cmd.trim())}}>
     <input 
      type="text" 
      placeholder="Type custom G-code (e.g. M104 S200, G28, M117 Printing)..." 
      value={cmd} 
      onChange={e=>setCmd(e.target.value)} 
      disabled={sending}
     />
     <button type="submit" className="primary" disabled={sending||!cmd.trim()}>
      <Send size={14}/> {sending?'Sending...':'Send'}
     </button>
    </form>

    {/* Web UI IP Footer */}
    <div className="modalFooter">
     <div style={{fontSize:'12px',color:'#849bb6'}}>
      <strong>Direct Printer Web Interface:</strong>
      <div style={{marginTop:'2px',fontSize:'11px',color:'#6b829e'}}>
       {isLocal?'Connected via Local Wi-Fi':'Direct Fluidd requires farm LAN or VPN; commands above work from anywhere!'}
      </div>
     </div>
     {printerUrl&&(
      <a href={printerUrl} target="_blank" rel="noreferrer" className="openPrinterBtn" style={{width:'auto',margin:0,padding:'7px 12px',fontSize:'11px'}}>
       <ExternalLink size={12}/> Open Fluidd ({p.host})
      </a>
     )}
    </div>
   </div>
  </div>
 );
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

function SettingsPage({list,reload,systemInfo}){const[items,setItems]=useState(list),[busy,setBusy]=useState(false),[message,setMessage]=useState('');useEffect(()=>setItems(list),[list]);function edit(i,key,value){setItems(old=>old.map((p,j)=>j===i?{...p,[key]:value}:p))}async function save(){setBusy(true);setMessage('');try{await api('/config',{method:'PUT',body:JSON.stringify(items)});await reload();setMessage('Saved! Printer monitoring will refresh.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}async function telegram(){try{const r=await api('/test-telegram',{method:'POST'});setMessage(r.note)}catch(e){setMessage(e.message)}}return <div className="settings"><div className="titleRow"><div><h1>Printer settings</h1><p>Use each printer's local IP and port (Neptune 4 uses port <b>80</b>; standard Klipper uses 7125).</p></div><button className="outline" onClick={()=>setItems(a=>[...a,{id:'printer-'+Date.now(),name:'New printer',host:'192.168.1.100',port:80,enabled:false}])}><Plus size={16}/> Add printer</button></div><div className="card settingCard">{items.map((p,i)=><div key={p.id} className="settingRow"><div className="settingNum">{String(i+1).padStart(2,'0')}</div><label>Printer name<input value={p.name} onChange={e=>edit(i,'name',e.target.value)}/></label><label>IP / host<input value={p.host} onChange={e=>edit(i,'host',e.target.value)}/></label><label>Moonraker port<input type="number" min="1" max="65535" value={p.port} onChange={e=>edit(i,'port',Number(e.target.value))}/></label><label className="enabled"><input type="checkbox" checked={p.enabled} onChange={e=>edit(i,'enabled',e.target.checked)}/>Enabled</label><button title="Remove printer" className="iconButton" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))}><Trash2 size={17}/></button></div>)}<div className="settingActions"><button className="primary" onClick={save} disabled={busy}>{busy?'Saving…':'Save changes'}</button><button className="outline" onClick={telegram}><Bell size={16}/> Test Telegram</button>{message&&<span>{message}</span>}</div></div>

<div className="card settingCard" style={{marginTop:'19px'}}>
 <h2><Server size={18} style={{verticalAlign:'middle',marginRight:'8px',color:'#5ea5ff'}}/> Farm Host & Live Access</h2>
 <p style={{fontSize:'13px',color:'#8ea2bd',marginTop:'4px'}}>
  This computer ({systemInfo?.hostname||'Farm Host'}) is the live bridge. It connects directly to your 5 printers on local LAN ({systemInfo?.primaryIp||'172.16.20.139'}).
 </p>
 <div className="netGrid">
  <div className="netBox">
   <span className="netBoxLabel">Local Wi-Fi / LAN URL</span>
   <strong className="netBoxVal">http://{systemInfo?.primaryIp||'172.16.20.139'}:{systemInfo?.port||3080}</strong>
   <small>Open this on any phone or PC connected to the same office Wi-Fi</small>
  </div>
  <div className="netBox">
   <span className="netBoxLabel">Make Live Remotely</span>
   <strong className="netBoxVal" style={{color:'#6ee7b7'}}>npm run live</strong>
   <small>Generates a secure public HTTPS link to monitor your farm from outside</small>
  </div>
 </div>
</div>

<div className="card tip"><ShieldCheck size={21}/><div><b>Security & Architecture</b><p>When opened locally on office Wi-Fi, the dashboard connects directly. When opened remotely, this host computer acts as the live telemetry relay so you never have to expose the raw printer IPs publicly.</p></div></div></div>}

function App(){
 const[authed,setAuthed]=useState(null),[page,setPage]=useState('overview'),[printers,setPrinters]=useState([]),[config,setConfig]=useState([]),[events,setEvents]=useState([]),[completed,setCompleted]=useState({jobs:[],summary:[]}),[systemInfo,setSystemInfo]=useState(null),[controlPrinter,setControlPrinter]=useState(null),[error,setError]=useState(''),[refreshed,setRefreshed]=useState(null);

 async function refresh(){
  try{
   const [p,e,c,s]=await Promise.all([api('/printers'),api('/events'),api('/completed-prints'),api('/system-info')]);
   setPrinters(p);setEvents(e);setCompleted(c);setSystemInfo(s);setError('');setRefreshed(new Date());
   setControlPrinter(curr=>curr?p.find(x=>x.id===curr.id)||curr:null);
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

 const isLocal = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('172.16.') ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  (systemInfo?.primaryIp && window.location.hostname === systemInfo.primaryIp) ||
  systemInfo?.isLocalClient === true
 );

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
    <div className="badgeInfo">
     <div>READ-ONLY MONITORING</div>
     <div style={{marginTop:'5px',fontSize:'10px',color:'#506a88'}}>HOST: {systemInfo?.primaryIp||'172.16.20.139'}</div>
    </div>
    <button className="nav" onClick={async()=>{await api('/logout',{method:'POST'});setAuthed(false)}}><LogOut size={18}/> Sign out</button>
   </div>
  </aside>

  <main className="main">
   <header>
    <div className="mobileLogo"><Printer size={20}/> Neptune Farm</div>
    <div className={'netBadge '+(isLocal?'local':'remote')} title={isLocal?`Connected via Local Farm LAN (${systemInfo?.primaryIp||'172.16.20.139'})`:`Remote Access: Telemetry is continuously relayed from your Farm Host PC (${systemInfo?.primaryIp||'172.16.20.139'})`}>
     {isLocal?<Wifi size={13}/>:<Globe size={13}/>}
     <span>{isLocal?`LAN Mode (${systemInfo?.primaryIp||'172.16.20.139'})`:`Remote Relay (${systemInfo?.primaryIp||'172.16.20.139'})`}</span>
    </div>
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
     <div className="overviewHeaderBar">
      <div className="overviewTitle">
       <h1>Print Farm Live Overview</h1>
       <span className="subline">{total} Connected Printers · Real-Time Telemetry</span>
      </div>
      <div className="farmMetrics">
       <div className="metricChip total"><Printer size={13}/><span><b>{total}</b> Total</span></div>
       <div className="metricChip printing"><Activity size={13}/><span><b>{printing}</b> Printing</span></div>
       <div className="metricChip idle"><Clock size={13}/><span><b>{Math.max(0, online - printing - (issues+paused))}</b> Idle</span></div>
       {(issues+paused)>0&&(
        <div className="metricChip attention"><AlertTriangle size={13}/><span><b>{issues+paused}</b> Attention</span></div>
       )}
       <div className="metricChip time"><Calendar size={13}/><span>{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span></div>
      </div>
     </div>

     {/* 5 Printers in a single responsive grid */}
     <section className="printersGrid5">
      {printers.map(p=><PrinterCard key={p.id} p={p} isLocal={isLocal} systemInfo={systemInfo} onOpenControl={setControlPrinter}/>)}
     </section>

     {/* Collapsible / Compact Bottom Drawer for Production & Logs */}
     <div className="overviewBottomDrawer">
      <div className="bottomDrawerHeader">
       <span>Quick Production & Activity</span>
       <div style={{display:'flex',gap:'12px'}}>
        <button className="textButton" onClick={()=>setPage('completed')}>Full Production Log →</button>
        <button className="textButton" onClick={()=>setPage('alerts')}>All Events →</button>
       </div>
      </div>
      <div className="bottomDrawerGrid">
       <div className="bottomCard miniQty">
        <strong>Completed Quantities by Model</strong>
        {completed.summary.length?(
         <div className="miniChips">
          {completed.summary.slice(0,5).map(s=>(
           <div key={s.file} className="miniChip" title={s.file}>
            <span className="miniChipName">{s.file}</span>
            <span className="miniChipQty">{s.quantity} pcs</span>
           </div>
          ))}
         </div>
        ):<small style={{color:'#64748b'}}>No prints recorded yet.</small>}
       </div>
       <div className="bottomCard miniEvents">
        <strong>Latest Observed Events</strong>
        {events.length?(
         <div className="miniEventList">
          {events.slice(0,3).map(e=>(
           <div key={e.id} className="miniEvent">
            <span className={'dot '+(e.type==='completed'?'teal':'amber')}/>
            <span className="miniEventMsg">{e.message}</span>
            <span className="miniEventTime">{new Date(e.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
           </div>
          ))}
         </div>
        ):<small style={{color:'#64748b'}}>No events recorded yet.</small>}
       </div>
      </div>
     </div>
    </>
   ):page==='completed'?(
    <CompletedPage data={completed} onSync={syncHistory}/>
   ):page==='settings'?(
    <SettingsPage list={config} reload={async()=>{await loadConfig();await refresh()}} systemInfo={systemInfo}/>
   ):(
    <>
     <div className="titleRow"><div><h1>Alerts and event history</h1><p>Changes observed while this monitor was running.</p></div></div>
     <div className="card activity">
      {events.length?events.map(e=><div className="event" key={e.id}><span className={'dot '+(e.type==='completed'?'teal':'amber')}/><div>{e.message}<small>{new Date(e.time).toLocaleString()} · {e.type}</small></div></div>):<div className="empty"><WifiOff size={22}/> No events recorded yet.</div>}
     </div>
    </>
   )}

   {controlPrinter&&(
    <RemoteControlModal 
     p={controlPrinter} 
     isLocal={isLocal} 
     systemInfo={systemInfo} 
     onClose={()=>setControlPrinter(null)} 
     onRefresh={refresh}
    />
   )}
  </main>
 </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
