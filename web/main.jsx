
import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Folder,FileText,Printer,Settings,Activity,Sparkles,LogOut,RefreshCw,AlertTriangle,CheckCircle2,Thermometer,Clock,Timer,Layers,Plus,Trash2,Bell,ShieldCheck,WifiOff,PackageCheck,CheckCheck,Search,Calendar,Filter,XCircle,TrendingUp,ExternalLink,Wifi,Globe,Radio,Server,Terminal,Play,Pause,Square,Flame,RotateCcw,Send,X,Home,ShieldAlert,Sliders,Sun,Moon,Move,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronUp,ChevronDown,Wind,Gauge,Compass,Zap,Key,Lock,Copy,Check,Cpu,HardDrive,Users,UserPlus,Eye,Shield,Mail,LayoutGrid,CircleCheckBig,TriangleAlert,Settings2}from'lucide-react';
import './style.css';
import './monitor.css';
import './theme.css';

function BrandMark(){
 return <svg className="brandMark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M8.5 2.5h7v4l-2.25 3h-2.5L8.5 6.5z"/>
  <path d="M12 9.5v2.25"/>
  <path d="M6 15h12"/>
  <path d="M4 18.5h16"/>
  <path d="M5.5 22h13"/>
 </svg>;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToWebPush(sendTest = true) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported on this browser.');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in Chrome site settings.');
  }
  const reg = await (navigator.serviceWorker.ready || navigator.serviceWorker.register('/sw.js'));
  const { publicKey } = await api('/push-vapid-key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }
  await api('/push-subscribe', { method: 'POST', body: JSON.stringify(sub) });
  if (sendTest) {
    await api('/push-test', { method: 'POST' });
  }
  return sub;
}

const api=async(url,options={})=>{
 let r;
 try{r=await fetch('/api'+url,{credentials:'same-origin',headers:{'content-type':'application/json'},...options});}
 catch{throw Error('Could not reach the farm server. Check your connection and try again.');}
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||(r.status===524||r.status===504?'The server took too long to respond. The command may still have run, so check the printer status.':`Request failed (HTTP ${r.status})`));
 return data;
};
const fmtDuration=n=>{if(n==null)return'—';const s=Math.max(0,Math.round(n)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),remS=s%60;if(h>0)return `${h}h ${m}m`;if(m>0)return `${m}m ${remS}s`;return `${remS}s`;};
const temp=n=>typeof n==='number'?n.toFixed(1)+'°C':'—';
const color=s=>({printing:'green',completed:'purple',idle:'blue',standby:'blue',paused:'amber',offline:'red',error:'red',disabled:'gray',connecting:'gray',cancelled:'gray',leveling:'teal',homing:'teal',runout:'orange',filament_runout:'orange'})[s]||'gray';

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
 const timeStr=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});
 if(etaDate===today)return `Today at ${timeStr}`;
 if(etaDate===tomorrow)return `Tomorrow at ${timeStr}`;
 return `${dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})} at ${timeStr}`;
};

const formatStartTime=iso=>{
 if(!iso)return'—';
 const dt=new Date(iso);
 if(isNaN(dt.getTime()))return'—';
 const today=getLocalDateStr(new Date());
 const tm=new Date();tm.setDate(tm.getDate()-1);
 const yesterday=getLocalDateStr(tm);
 const dtDate=getLocalDateStr(dt);
 const timeStr=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});
 if(dtDate===today)return timeStr;
 if(dtDate===yesterday)return `Yest. ${timeStr}`;
 return `${dt.toLocaleDateString(undefined,{month:'short',day:'numeric'})} ${timeStr}`;
};

const formatCompletedTime=iso=>{
 if(!iso)return'—';
 const dt=new Date(iso);
 if(isNaN(dt.getTime()))return'—';
 const today=getLocalDateStr(new Date());
 const tm=new Date();tm.setDate(tm.getDate()-1);
 const yesterday=getLocalDateStr(tm);
 const dtDate=getLocalDateStr(dt);
 const timeStr=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});
 if(dtDate===today)return `Today at ${timeStr}`;
 if(dtDate===yesterday)return `Yesterday at ${timeStr}`;
 return `${dt.toLocaleDateString(undefined,{month:'short',day:'numeric'})} at ${timeStr}`;
};

function Login({done,theme,toggleTheme}){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [sys,setSys]=useState(null);

 useEffect(()=>{api('/system-info').then(setSys).catch(()=>{})},[]);
 const host=window.location.hostname;
 const isLocal=Boolean(sys?.isLocalClient||['localhost','127.0.0.1'].includes(host)||['172.16.','192.168.','10.'].some(prefix=>host.startsWith(prefix)));
 const alternativeUrl=isLocal?(sys?.remoteUrl||'https://neptunemonitor.com'):sys?.localUrl;

 async function submit(event){
  event.preventDefault();
  if(loading)return;
  setLoading(true);
  setError('');
  try{
   const response=await api('/login',{method:'POST',body:JSON.stringify({email:email.trim(),password})});
   done(response.user);
  }catch(error){
   setError(error.message);
  }finally{
   setLoading(false);
  }
 }

 return <main className="loginShell launchLogin">
  <form onSubmit={submit} className="login card">
   <div className="loginBrand">
    <span><span className="logoIconBox" style={{width:32,height:32}}><BrandMark/></span> Neptune Farm</span>
    <button className="iconButton" type="button" onClick={toggleTheme} aria-label={theme==='dark'?'Use light mode':'Use dark mode'}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
   </div>
   <h1>Sign in</h1>
   <p>Monitor your printers and production.</p>
   <label htmlFor="farm-login-email">Email address</label>
   <input id="farm-login-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/>
   <label htmlFor="farm-login-password">Password</label>
   <input id="farm-login-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   {error && <div className="error" role="alert">{error}</div>}
   <button className="primary full" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
   <div className="loginAccess">
    <span>{isLocal?<Wifi size={14}/>:<Globe size={14}/>} {isLocal?'Local LAN':'Remote access'}</span>
    {alternativeUrl && <a href={alternativeUrl}>{isLocal?'Switch to Remote':'Switch to LAN'}</a>}
   </div>
  </form>
 </main>;
}

function PrinterCard({p,isLocal,systemInfo,onOpenControl,onClearBed,onFirmwareRestart,isAdmin=true}){
 const [showMore, setShowMore] = useState(false);
 const s=p.status||'connecting';
 const printerUrl=p.host?`http://${p.host}${p.port&&p.port!==80?':'+p.port:''}`:null;
 const isDone=s==='completed';
 const isShutdown = Boolean(
  p.isShutdown ||
  s==='shutdown' ||
  (s==='error' && (p.error && (
   p.error.toLowerCase().includes('shutdown') ||
   p.error.includes('Printer is shutdown') ||
   p.error.includes('not heating at expected rate') ||
   p.error.includes('verify_heater') ||
   p.error.includes('FIRMWARE_RESTART')
  ))) ||
  p.shutdownReason
 );
 const effectiveStatus = isShutdown ? 'error' : s;
 const hasRunout = Boolean(
  (s === 'runout' || (p.filamentRunout === true && (s === 'printing' || s === 'paused'))) &&
  !isDone &&
  !isShutdown &&
  s !== 'cancelled' &&
  s !== 'idle' &&
  s !== 'standby' &&
  s !== 'leveling' &&
  s !== 'homing' &&
  Boolean(p.file)
 );
 const isError=(effectiveStatus==='error'||s==='offline'||isShutdown) && !hasRunout;
 const hasIssue=(isError||Boolean(p.error)||isShutdown) && !hasRunout;
 const isIdle=(s==='idle' || s==='standby') && !hasRunout && !isShutdown;
 const isPaused=s==='paused' && !hasRunout && !isShutdown;
 const isPrinting=s==='printing' && !hasRunout && !isShutdown;
 const isCancelled=s==='cancelled' && !hasRunout && !isShutdown;
 const isLeveling=s==='leveling';
 const isHoming=s==='homing';
 const progressVal=isDone?100:Math.max(0,Math.min(100,p.progress??0));

 const label = hasRunout ? 'Filament runout' : isShutdown ? 'Shutdown' : statusLabel(s).replaceAll('_', ' ');
 const activeJob = isPrinting || isPaused || hasRunout || isDone;
 const tone = hasRunout || isPaused ? 'amber' : hasIssue ? 'red' : isPrinting ? 'green' : isDone ? 'purple' : 'neutral';
 const detailsId = 'printer-info-' + p.id;

 return (
  <section className={'monitorRow tone-'+tone+(activeJob&&progressVal>0?' has-charge':'')+(isDone?' charge-complete':'')} style={{'--job-charge':progressVal+'%'}}>
   <div className="monitorSummary">
    <div className="machineMark"><Printer size={19} aria-hidden="true"/></div>
    <div className="machineName"><h3 title={p.name}>{p.name}</h3><span className="machineState"><i/>{label}</span></div>
    <div className="jobBrief"><span title={p.file}>{p.file || 'No active job'}</span>
     {activeJob && <div className="jobMeter"><i style={{width:progressVal+'%'}}/></div>}
    </div>
    <div className="machineTime">{activeJob && <strong>{Math.round(progressVal)}%</strong>}
     {activeJob && !isDone && p.remainingTime != null && <small>{fmtDuration(p.remainingTime)} left</small>}
    </div>
    <button className="infoButton" aria-label={(showMore?'Less info for ':'More info for ')+p.name} aria-expanded={showMore} aria-controls={detailsId} onClick={()=>setShowMore(v=>!v)}>
     {showMore?'Less info':'More info'}{showMore?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
    </button>
   </div>
   <div id={detailsId} className={'monitorDetails'+(showMore?' is-expanded':'')}>
   <article className={`fleetCard state-${effectiveStatus} ${hasRunout?'has-runout':''} ${hasIssue?'has-issue':''} ${isPrinting?'is-printing':''} ${isShutdown?'is-shutdown':''}`}>
   {/* Orange Alert Fill for Filament Runout */}
   {hasRunout&&(
    <div className="fleetCardRunoutFill"/>
   )}

   {/* Red Alert Fill for Disconnected / Error / Issue Printers */}
   {hasIssue&&(
    <div className="fleetCardIssueFill"/>
   )}

   {/* Desktop & Tablet Landscape View (> 768px) */}
   <div className="fleetDesktopView">
    <div className="fleetMainRow">
    {/* Col 1: Identity (Status Pill on top, Printer name below, IP/Port at bottom) */}
    <div className="fleetCol identity">
     <div className="fleetPrinterIcon">
      <Printer size={19}/>
     </div>
     <div className="fleetIdentityText">
      <div className="fleetPillWrap">
       <span className={'fleetPill '+(hasRunout ? 'orange' : color(effectiveStatus))}>
        <i/>
        {hasRunout ? 'Filament Runout' : isShutdown ? 'Printer Shutdown' : effectiveStatus==='completed'?'Print Completed':effectiveStatus==='offline'?'Offline':effectiveStatus==='error'?'Printer error':effectiveStatus==='printing'?'Printing':effectiveStatus==='paused'?'Paused':effectiveStatus==='cancelled'?'Cancelled':effectiveStatus==='leveling'?'Leveling Bed':effectiveStatus==='homing'?'Homing Axes':effectiveStatus==='idle'?'Idle':effectiveStatus}
       </span>
      </div>
      <h3 className="fleetPrinterName" title={p.name}>{p.name}</h3>
      <div className="fleetSubline">
       <span>{p.host||'unknown'}{p.enabled?` · Port: ${p.port||80}`:' · Disabled'}</span>
      </div>
     </div>
    </div>

    {/* Col 2: Job & Progress */}
    <div className="fleetCol jobProgress">
     <div className="fleetJobHead">
      {isDone ? <Sparkles size={13} style={{flexShrink:0,color:'#34d399'}}/> : <Activity size={13} style={{flexShrink:0,opacity:.8,color:isPrinting?'#38bdf8':'#64748b'}}/>}
      <span className="fleetJobName" title={p.file||(isDone?'Print Finished':'No active G-code job')}>
       {p.file||(isDone?'Print Finished':'No active G-code job')}
      </span>
     </div>
     {activeJob && <div className="fleetProgressWrap">
      <div className="fleetBar">
       <div 
        className={'fleetBarFill '+(hasRunout ? 'orange' : color(s))} 
        style={{width:`${progressVal}%`}}
       />
      </div>
      <span className="fleetProgressPct">{Math.round(progressVal)}%</span>
     </div>}
     <div className="fleetJobFoot">
       {hasRunout ? (
        <div className="fleetTimeRow">
         {p.startedAt && (
          <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
           <span className="timeLabel"><Play size={12} className="timeIcon"/>Started</span>
           <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
          </span>
         )}
         <span className="fleetTimeBadge runout" title="Filament sensor triggered — spool is empty">
          <span className="timeLabel"><AlertTriangle size={13} className="timeIcon"/>Filament Runout:</span>
          <strong className="timeValue">{p.runoutHoldSec ? `Change needed · Paused ${fmtDuration(p.runoutHoldSec)}` : 'Replace spool'}</strong>
         </span>
         {p.remainingTime != null && (
          <span className="fleetTimeBadge remaining" title="Estimated time left once resumed">
           <span className="timeLabel"><Clock size={13} className="timeIcon"/>Remaining</span>
           <strong className="timeValue">{fmtDuration(p.remainingTime)}</strong>
          </span>
         )}
         {p.duration > 0 && (
          <span className="fleetTimeBadge totalTime" title={`Time this file has been running: ${fmtDuration(p.duration)}`}>
           <span className="timeLabel"><Timer size={12} className="timeIcon"/>Total time</span>
           <strong className="timeValue">{fmtDuration(p.duration)}</strong>
          </span>
         )}
         {p.jobHoldSec > 0 && (
          <span className="fleetTimeBadge holdTime" title={`Filament change hold time: ${fmtDuration(p.jobHoldSec)}`}>
           <span className="timeLabel"><Pause size={13} className="timeIcon"/>Filament Change:</span>
           <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
          </span>
         )}
        </div>
       ) : (isShutdown || isError) ? (
        <div className="fleetTimeRow errorRow">
         {p.startedAt && p.file && (
          <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
           <span className="timeLabel"><Play size={12} className="timeIcon"/>Started</span>
           <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
          </span>
         )}
         {p.duration > 0 && p.file && (
          <span className="fleetTimeBadge totalTime" title={`Elapsed print time before error: ${fmtDuration(p.duration)}`}>
           <span className="timeLabel"><Timer size={12} className="timeIcon"/>Total time</span>
           <strong className="timeValue">{fmtDuration(p.duration)}</strong>
          </span>
         )}
         <span className="fleetTimeBadge errorTime" title={`Error active for ${p.errorSec > 0 ? fmtDuration(p.errorSec) : 'just now'}: ${p.shutdownReason || p.error || 'Printer error'}`}>
          <span className="timeLabel"><AlertTriangle size={13} className="timeIcon"/>{isShutdown ? 'Shutdown Time:' : 'Error Time:'}</span>
          <strong className="timeValue">{p.errorSec > 0 ? fmtDuration(p.errorSec) : 'Active'}</strong>
         </span>
        </div>
       ) : isPrinting ? (
        <div className="fleetTimeRow">
         {p.startedAt && (
          <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
           <span className="timeLabel"><Play size={12} className="timeIcon"/>Started</span>
           <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
          </span>
         )}

         <span className="fleetTimeBadge remaining" title="Estimated time left">
          <span className="timeLabel"><Clock size={13} className="timeIcon"/>Remaining</span>
          <strong className="timeValue">{p.remainingTime != null ? fmtDuration(p.remainingTime) : '—'}</strong>
         </span>

         {p.eta && (
          <span className="fleetTimeBadge completedBy" title="Estimated completion time">
           <span className="timeLabel"><CheckCircle2 size={13} className="timeIcon"/>Estimated finish</span>
           <strong className="timeValue">{formatFinishTime(p.eta)}</strong>
          </span>
         )}

         {p.duration > 0 && (
          <span className="fleetTimeBadge totalTime" title={`Time this file has been running: ${fmtDuration(p.duration)}`}>
           <span className="timeLabel"><Timer size={12} className="timeIcon"/>Total time</span>
           <strong className="timeValue">{fmtDuration(p.duration)}</strong>
          </span>
         )}

         {p.jobHoldSec > 0 && (
          <span className="fleetTimeBadge holdTime" title={`Filament change hold time: ${fmtDuration(p.jobHoldSec)}`}>
           <span className="timeLabel"><Pause size={13} className="timeIcon"/>Filament Change:</span>
           <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
          </span>
         )}

         {p.speedFactor && p.speedFactor !== 1 && (
          <span className="fleetTimeBadge speedFactor" title={`Printing speed override: ${Math.round(p.speedFactor * 100)}%`}>
           <span className="timeLabel"><Zap size={13} className="timeIcon"/>Speed:</span>
           <strong className="timeValue">{Math.round(p.speedFactor * 100)}%</strong>
          </span>
         )}
        </div>
       ) : isDone ? (
        <div className="fleetTimeRow completedRow">
         {p.startedAt && (
          <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
           <span className="timeLabel"><Play size={12} className="timeIcon"/>Started</span>
           <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
          </span>
         )}

         {p.completedAt && (
          <span className="fleetTimeBadge completedAt" title={`Print finished at ${formatCompletedTime(p.completedAt)}`}>
           <span className="timeLabel"><CheckCircle2 size={13} className="timeIcon"/>Completed:</span>
           <strong className="timeValue">{formatCompletedTime(p.completedAt)}</strong>
          </span>
         )}

         {p.duration > 0 && (
          <span className="fleetTimeBadge totalTime" title={`Total print time taken: ${fmtDuration(p.duration)}`}>
           <span className="timeLabel"><Timer size={12} className="timeIcon"/>Total time</span>
           <strong className="timeValue">{fmtDuration(p.duration)}</strong>
          </span>
         )}

         {isAdmin && (
          <button 
           className="fleetClearBedBtn" 
           onClick={(e)=>{e.stopPropagation();onClearBed&&onClearBed(p);}}
           title="Mark model removed from bed and reset printer to Idle"
          >
           <CheckCircle2 size={13}/>
           <span>Clear Bed</span>
          </button>
         )}
        </div>
       ) : isIdle ? (
        <div className="fleetTimeRow">
         <span className="fleetTimeBadge idle" title={p.idleSec ? `Printer has been idle for ${fmtDuration(p.idleSec)}` : 'Printer is idle and ready'}>
          <span className="timeLabel"><Clock size={12} className="timeIcon"/>Idle Time:</span>
          <strong className="timeValue">{p.idleSec > 0 ? fmtDuration(p.idleSec) : 'Just Now'}</strong>
         </span>
         <span className="fleetTimeBadge idleReady">
          <span>Ready for next job</span>
         </span>
        </div>
       ) : isPaused ? (
        <div className="fleetTimeRow">
         {p.startedAt && (
          <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
           <span className="timeLabel"><Play size={12} className="timeIcon"/>Started</span>
           <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
          </span>
         )}

         <span className="fleetTimeBadge paused">
          <span className="timeLabel"><Pause size={13} className="timeIcon"/>Paused ·</span>
          <strong className="timeValue">{p.remainingTime != null ? fmtDuration(p.remainingTime) : '—'} left</strong>
         </span>

         {p.pausedSec > 0 && (
          <span className="fleetTimeBadge pausedTime" title={`Paused for ${fmtDuration(p.pausedSec)}`}>
           <span className="timeLabel"><Clock size={12} className="timeIcon"/>Paused Time:</span>
           <strong className="timeValue">{fmtDuration(p.pausedSec)}</strong>
          </span>
         )}

         {p.eta && (
          <span className="fleetTimeBadge completedBy">
           <span className="timeLabel"><CheckCircle2 size={13} className="timeIcon"/>Estimated finish</span>
           <strong className="timeValue">{formatFinishTime(p.eta)}</strong>
          </span>
         )}

         {p.duration > 0 && (
          <span className="fleetTimeBadge totalTime" title={`Time this file has been running: ${fmtDuration(p.duration)}`}>
           <span className="timeLabel"><Timer size={12} className="timeIcon"/>Total time</span>
           <strong className="timeValue">{fmtDuration(p.duration)}</strong>
          </span>
         )}

         {p.jobHoldSec > 0 && (
          <span className="fleetTimeBadge holdTime" title={`Filament change hold time: ${fmtDuration(p.jobHoldSec)}`}>
           <span className="timeLabel"><Pause size={13} className="timeIcon"/>Filament Change:</span>
           <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
          </span>
         )}

         {p.speedFactor && p.speedFactor !== 1 && (
          <span className="fleetTimeBadge speedFactor" title={`Printing speed override: ${Math.round(p.speedFactor * 100)}%`}>
           <span className="timeLabel"><Zap size={13} className="timeIcon"/>Speed:</span>
           <strong className="timeValue">{Math.round(p.speedFactor * 100)}%</strong>
          </span>
         )}
        </div>
       ) : (
        <div className="fleetTimeRow">
         <span className="fleetTimeBadge standby" title={p.idleSec ? `Standby for ${fmtDuration(p.idleSec)}` : 'Printer on standby'}>
          <span className="timeLabel"><Clock size={12} className="timeIcon"/>Standby:</span>
          <strong className="timeValue">{p.idleSec > 0 ? fmtDuration(p.idleSec) : 'Ready'}</strong>
         </span>
        </div>
       )}
      </div>
    </div>

    <div className="fleetCol actions">
     <details className="fleetReadings">
      <summary aria-label={p.name+' printer readings'}><Thermometer size={13}/> Readings <ChevronDown size={12} className="readingsChevron"/></summary>
      <div className="fleetCol metrics">
       <div className="fleetMetricItem">
        <div className="fleetMetricLabel"><Thermometer size={11}/> Nozzle</div>
        <div className="fleetMetricVal">
         {temp(p.nozzle)}{p.nozzleTarget?` / ${p.nozzleTarget}°`:''}
        </div>
       </div>
       <div className="fleetMetricItem">
        <div className="fleetMetricLabel"><Thermometer size={11}/> Bed</div>
        <div className="fleetMetricVal">
         {temp(p.bed)}{p.bedTarget?` / ${p.bedTarget}°`:''}
        </div>
       </div>
       <div className="fleetMetricItem">
        <div className="fleetMetricLabel"><Layers size={11}/> Layer</div>
        <div className="fleetMetricVal">
         {p.layer!=null?`${p.layer}${p.totalLayers?' / '+p.totalLayers:''}`:p.z!=null?`${p.z.toFixed(1)} mm`:'—'}
        </div>
       </div>
      </div>
     </details>
     {isAdmin&&isShutdown&&(
      <button 
       className="fleetBtn restart" 
       onClick={()=>onFirmwareRestart&&onFirmwareRestart(p)}
       title="Send FIRMWARE_RESTART to reset Klipper firmware"
      >
       <RotateCcw size={13}/>
       <span>Firmware Restart</span>
      </button>
     )}
     {isAdmin&&isDone&&(
      <button 
       className="fleetBtn clearBedTop" 
       onClick={()=>onClearBed&&onClearBed(p)} 
       title="Acknowledge printed model removed from build plate"
      >
       <CheckCircle2 size={13}/>
       <span>Clear Bed</span>
      </button>
     )}
     {hasRunout&&(
      <span className="fleetRunoutBadge orange" title={`Filament runout detected! ${p.runoutHoldSec ? `Paused for filament change: ${fmtDuration(p.runoutHoldSec)}` : ''}`}>{p.runoutHoldSec ? `CHANGE ${fmtDuration(p.runoutHoldSec)} · LOAD SPOOL` : 'CHANGE FILAMENT'}</span>
     )}
     {p.enabled&&(
      <button 
       className="fleetBtn control" 
       onClick={()=>onOpenControl(p)}
       title="Remote controls, emergency actions & terminal console"
      >
       <Sliders size={13}/>
       <span>{isLocal?'Control':'Remote control'}</span>
      </button>
     )}
     {isLocal&&printerUrl&&(
       <a
        href={printerUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="fleetBtn webui"
        title={`Open ${p.name} Fluidd interface directly (${p.host})`}
       >
        <ExternalLink size={13}/>
        <span>Web UI</span>
       </a>
      )}
    </div>
   </div>
   </div>

   {/* Mobile & Portrait Mode View (<= 768px and Portrait Mode) */}
   <div className="fleetMobileCardView">
    {/* 1. Header: Printer Name + Status Pill + Host Subline */}
    <div className="fleetMobHeader">
     <div className="fleetMobIdentity">
      <div className="fleetMobPrinterIcon">
       <Printer size={16}/>
      </div>
      <div className="fleetMobNameCol">
       <h3 className="fleetMobPrinterName" title={p.name}>{p.name}</h3>
       <span className="fleetMobSubline">{p.host||'unknown'}{p.enabled?` · Port: ${p.port||80}`:' · Disabled'}</span>
      </div>
     </div>
     <div className="fleetMobPillWrap">
      <span className={'fleetPill '+(hasRunout ? 'orange' : color(effectiveStatus))}>
       <i/>
       {hasRunout ? 'Filament Runout' : isShutdown ? 'Printer Shutdown' : effectiveStatus==='completed'?'Print Completed':effectiveStatus==='offline'?'Offline':effectiveStatus==='error'?'Printer error':effectiveStatus==='printing'?'Printing':effectiveStatus==='paused'?'Paused':effectiveStatus==='cancelled'?'Cancelled':effectiveStatus==='leveling'?'Leveling':effectiveStatus==='homing'?'Homing':effectiveStatus==='idle'?'Idle':effectiveStatus}
      </span>
     </div>
    </div>

    {/* 2. Job & Progress: File Name + Progress Bar + % */}
    <div className="fleetMobJobWrap">
     <div className="fleetMobJobHead">
      {isDone ? <Sparkles size={13} style={{flexShrink:0,color:'#34d399'}}/> : <Activity size={13} style={{flexShrink:0,opacity:.8,color:isPrinting?'#38bdf8':'#64748b'}}/>}
      <span className="fleetMobJobName" title={p.file||(isDone?'Print Finished':'No active G-code job')}>
       {p.file||(isDone?'Print Finished':'No active G-code job')}
      </span>
     </div>
     <div className="fleetMobProgressRow">
      <div className="fleetMobBar">
       <div 
        className={'fleetMobBarFill '+(hasRunout ? 'orange' : color(s))} 
        style={{width:`${progressVal}%`}}
       />
      </div>
      <span className="fleetMobProgressPct">{Math.round(progressVal)}%</span>
     </div>
    </div>

    {/* 4. Action Bar: Control, Web UI / Remote UI, and More Details Toggle */}
    <div className="fleetMobActionBar">
     <div className="fleetMobActionButtons">
      <details className="fleetReadings mobileReadings" key={String(showMore)}>
       <summary aria-label={p.name+' printer readings'}><Thermometer size={13}/> Readings <ChevronDown size={12} className="readingsChevron"/></summary>
       <small className="mobileReadingsConnection">{p.host||'Unknown host'} · Port {p.port||80}</small>
       <div className="mobMetricsGrid">
        <div className="mobMetricCard">
         <div className="mobMetricHead"><Thermometer size={12}/> Nozzle</div>
         <div className="mobMetricValue">
          {temp(p.nozzle)}
          {p.nozzleTarget ? <span className="mobMetricTarget"> / {p.nozzleTarget}°</span> : null}
         </div>
        </div>
        <div className="mobMetricCard">
         <div className="mobMetricHead"><Thermometer size={12}/> Bed</div>
         <div className="mobMetricValue">
          {temp(p.bed)}
          {p.bedTarget ? <span className="mobMetricTarget"> / {p.bedTarget}°</span> : null}
         </div>
        </div>
        <div className="mobMetricCard">
         <div className="mobMetricHead"><Layers size={12}/> Layer</div>
         <div className="mobMetricValue">
          {p.layer!=null?`${p.layer}${p.totalLayers?' / '+p.totalLayers:''}`:p.z!=null?`${p.z.toFixed(1)} mm`:'—'}
         </div>
        </div>
        <div className="mobMetricCard">
         <div className="mobMetricHead"><Activity size={12}/> Sensor</div>
         <div className="mobMetricValue" style={{fontSize:'12px',fontWeight:700,color:hasRunout?'#f97316':p.filamentSensor===false?'#f87171':'#34d399'}}>
          {hasRunout ? 'Runout' : p.filamentSensor === false ? 'Triggered' : p.filamentSensor === true ? 'Filament OK' : 'Unknown'}
         </div>
        </div>
       </div>
      </details>
      {isAdmin&&isShutdown&&(
       <button 
        className="fleetBtn restart" 
        onClick={()=>onFirmwareRestart&&onFirmwareRestart(p)}
        title="Send FIRMWARE_RESTART"
       >
        <RotateCcw size={13}/>
        <span>Restart</span>
       </button>
      )}
      {isAdmin&&isDone&&(
       <button 
        className="fleetBtn clearBedTop" 
        onClick={()=>onClearBed&&onClearBed(p)} 
        title="Clear Bed"
       >
        <CheckCircle2 size={13}/>
        <span>Clear Bed</span>
       </button>
      )}
      {p.enabled&&(
       <button 
        className="fleetBtn control" 
        onClick={()=>onOpenControl(p)}
        title="Remote controls and tools"
       >
        <Sliders size={13}/>
        <span>{isLocal?'Control':'Remote control'}</span>
       </button>
      )}
      {isLocal&&printerUrl&&(
       <a
         href={printerUrl} 
         target="_blank" 
         rel="noreferrer" 
         className="fleetBtn webui"
         title={`Open Fluidd (${p.host})`}
        >
         <ExternalLink size={13}/>
         <span>Web UI</span>
        </a>
      )}
     </div>

    </div>

    <div className="fleetMobExpandedSection">
      {/* Secondary Print Timers */}
      <div className="mobSecondaryTimes">
       <div className="fleetMobPrimaryTimeRow">
        {hasRunout ? (
         <span className="fleetTimeBadge runout" title="Filament sensor triggered">
          <AlertTriangle size={13} className="timeIcon"/>
          <span className="timeLabel">Filament Runout:</span>
          <strong className="timeValue">{p.runoutHoldSec ? `Paused ${fmtDuration(p.runoutHoldSec)}` : 'Spool empty'}</strong>
         </span>
        ) : (isShutdown || isError) ? (
         <span className="fleetTimeBadge errorTime" title={p.shutdownReason || p.error || 'Printer error'}>
          <AlertTriangle size={13} className="timeIcon"/>
          <span className="timeLabel">{isShutdown ? 'Shutdown:' : 'Error:'}</span>
          <strong className="timeValue">{p.errorSec > 0 ? fmtDuration(p.errorSec) : 'Active'}</strong>
         </span>
        ) : isDone ? (
         <span className="fleetTimeBadge completedAt" title="Print completed">
          <CheckCircle2 size={13} className="timeIcon"/>
          <span className="timeLabel">Completed:</span>
          <strong className="timeValue">{p.completedAt ? formatCompletedTime(p.completedAt) : 'Done'}</strong>
         </span>
        ) : (isPrinting || isPaused) ? (
         p.eta ? (
          <span className="fleetTimeBadge completedBy" title="Estimated finish time">
           <CheckCircle2 size={13} className="timeIcon"/>
           <span className="timeLabel">Estimated finish</span>
           <strong className="timeValue">{formatFinishTime(p.eta)}</strong>
          </span>
         ) : p.remainingTime != null ? (
          <span className="fleetTimeBadge remaining" title="Estimated time left">
           <Clock size={13} className="timeIcon"/>
           <span className="timeLabel">Remaining</span>
           <strong className="timeValue">{fmtDuration(p.remainingTime)}</strong>
          </span>
         ) : (
          <span className="fleetTimeBadge standby">
           <Clock size={13} className="timeIcon"/>
           <span className="timeLabel">Calculating ETA...</span>
          </span>
         )
        ) : isIdle ? (
         <span className="fleetTimeBadge idle" title="Printer is idle">
          <Clock size={12} className="timeIcon"/>
          <span className="timeLabel">Idle Time:</span>
          <strong className="timeValue">{p.idleSec > 0 ? fmtDuration(p.idleSec) : 'Just Now'}</strong>
         </span>
        ) : (
         <span className="fleetTimeBadge standby">
          <Clock size={12} className="timeIcon"/>
          <span className="timeLabel">Status:</span>
          <strong className="timeValue">{effectiveStatus}</strong>
         </span>
        )}
       </div>
       {p.startedAt && (
        <div className="mobTimeItem startedAt" title={`Started at ${formatStartTime(p.startedAt)}`}>
         <span className="mobTimeLabel"><Play size={11}/> Started:</span>
         <strong className="mobTimeVal">{formatStartTime(p.startedAt)}</strong>
        </div>
       )}
       {p.duration > 0 && (
        <div className="mobTimeItem totalTime" title={`Total print time running: ${fmtDuration(p.duration)}`}>
         <span className="mobTimeLabel"><Timer size={11}/> Total Time:</span>
         <strong className="mobTimeVal">{fmtDuration(p.duration)}</strong>
        </div>
       )}
       {p.remainingTime != null && (!((isPrinting||isPaused)&&!p.eta)) && (
        <div className="mobTimeItem remaining" title={`Estimated time remaining: ${fmtDuration(p.remainingTime)}`}>
         <span className="mobTimeLabel"><Clock size={11}/> Remaining:</span>
         <strong className="mobTimeVal">{fmtDuration(p.remainingTime)}</strong>
        </div>
       )}
       {p.jobHoldSec > 0 && (
        <div className="mobTimeItem holdTime" title={`Filament change hold time: ${fmtDuration(p.jobHoldSec)}`}>
         <span className="mobTimeLabel"><Pause size={11}/> Filament Change:</span>
         <strong className="mobTimeVal">{fmtDuration(p.jobHoldSec)}</strong>
        </div>
       )}
       {p.speedFactor && p.speedFactor !== 1 && (
        <div className="mobTimeItem speedFactor" title={`Print speed: ${Math.round(p.speedFactor * 100)}%`}>
         <span className="mobTimeLabel"><Zap size={11}/> Speed:</span>
         <strong className="mobTimeVal">{Math.round(p.speedFactor * 100)}%</strong>
        </div>
       )}
      </div>

    </div>
   </div>

   {/* Filament Runout Banner with Step-by-Step Instructions */}
   {hasRunout&&(
    <div className="fleetFilamentBanner">
     <AlertTriangle size={16} className="fleetFilamentIcon"/>
     <div className="fleetFilamentContent" style={{flex:1}}>
      <strong>⚠️ Filament Runout Detected — Print Paused</strong>
      <span>
       {p.runoutHoldSec ? `Printer paused for filament change (${fmtDuration(p.runoutHoldSec)}). ` : ''}
       Spool is empty. To replace: load fresh filament into sensor, purge nozzle, and resume print.
      </span>
     </div>
     <button 
      className="fleetRunoutGuideBtn"
      onClick={(e)=>{e.stopPropagation();onOpenControl(p)}}
      title="Open Extruder controls and replacement guide"
     >
      <Sliders size={13}/>
      <span>Filament Guide</span>
     </button>
    </div>
   )}

   {/* Bed Leveling Banner */}
   {isLeveling&&(
    <div className="fleetLevelingBanner" style={{background:'rgba(20,184,166,0.12)',border:'1px solid rgba(20,184,166,0.3)',borderRadius:'8px',padding:'10px 14px',margin:'10px 14px 0',display:'flex',alignItems:'center',gap:'10px',color:'#2dd4bf',fontSize:'12.5px'}}>
     <Activity size={16} className="spin" color="#2dd4bf"/>
     <div style={{flex:1}}>
      <strong style={{color:'#5eead4'}}>Auto Bed Mesh Leveling in Progress</strong>
      <span style={{display:'block',fontSize:'11.5px',color:'#cbd5e1',marginTop:'2px'}}>Toolhead is probing bed mesh calibration points. Axes are actively moving.</span>
     </div>
    </div>
   )}

   {/* Cancelled Banner */}
   {isCancelled&&(
    <div className="fleetCancelledBanner" style={{background:'rgba(100,116,139,0.12)',border:'1px solid rgba(100,116,139,0.3)',borderRadius:'8px',padding:'10px 14px',margin:'10px 14px 0',display:'flex',alignItems:'center',gap:'10px',color:'#94a3b8',fontSize:'12.5px'}}>
     <Square size={15} color="#94a3b8"/>
     <div style={{flex:1}}>
      <strong style={{color:'#f1f5f9'}}>Print Cancelled / Stopped</strong>
      <span style={{display:'block',fontSize:'11.5px',color:'#94a3b8',marginTop:'2px'}}>Job was stopped manually. Printer is ready for a new file or calibration.</span>
     </div>
    </div>
   )}

   {/* Print Completed Banner */}
   {isDone&&(
    <div className="fleetCompletedBanner">
     <Sparkles size={16} className="fleetCompletedIcon"/>
     <div className="fleetCompletedContent">
      <strong>🎉 Print Finished Successfully! Ready to clear bed</strong>
      <span>
       {p.file ? `Model "${p.file}" has finished printing.` : 'Print job completed.'} Remove printed model from build plate and click <b>Clear Bed</b> when ready.
      </span>
      <div className="fleetCompletedTimeStrip">
       {p.startedAt && (
        <span className="compTimePill" title={`Started at ${formatStartTime(p.startedAt)}`}>
         <Play size={11}/> Started: <b>{formatStartTime(p.startedAt)}</b>
        </span>
       )}
       {p.completedAt && (
        <span className="compTimePill" title={`Completed at ${formatCompletedTime(p.completedAt)}`}>
         <CheckCircle2 size={11}/> Completed: <b>{formatCompletedTime(p.completedAt)}</b>
        </span>
       )}
       {p.duration > 0 && (
        <span className="compTimePill" title={`Total print time taken: ${fmtDuration(p.duration)}`}>
         <Timer size={11}/> Total Time: <b>{fmtDuration(p.duration)}</b>
        </span>
       )}
       {p.jobHoldSec > 0 && (
        <span className="compTimePill hold" title={`Filament change time: ${fmtDuration(p.jobHoldSec)}`}>
         <Pause size={11}/> Filament Change: <b>{fmtDuration(p.jobHoldSec)}</b>
        </span>
       )}
      </div>
     </div>
     {isAdmin&&(
      <button 
       className="fleetClearBedBannerBtn"
       onClick={()=>onClearBed&&onClearBed(p)}
      >
       <CheckCircle2 size={14}/>
       <span>Clear Bed</span>
      </button>
     )}
    </div>
   )}

   {/* Error / Offline / Shutdown Banner */}
   {isError&&(
    <div className={`fleetErrorBanner ${isShutdown ? 'is-shutdown' : ''}`}>
     <AlertTriangle size={16} className="fleetErrorIcon"/>
     <div className="fleetErrorContent">
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
       <strong>{isShutdown ? '🚨 Printer is shutdown (Klipper Error)' : "Can't reach this printer"}</strong>
       {p.errorSec > 0 && (
        <span className="fleetBannerErrorTime">
         <Clock size={11}/> Error active for {fmtDuration(p.errorSec)}
        </span>
       )}
      </div>
      <span className="fleetErrorMsg">
       {p.shutdownReason || p.error || `Connection timed out while contacting Moonraker at ${p.host}:${p.port}. Check the printer power, IP address, and Moonraker port.`}
      </span>
      {p.file && p.duration > 0 && (
       <div className="fleetErrorJobContext">
        <span>File was running: <b>{p.file}</b></span>
        <span>• Elapsed: <b>{fmtDuration(p.duration)}</b></span>
        {p.startedAt && <span>• Started: <b>{formatStartTime(p.startedAt)}</b></span>}
       </div>
      )}
     </div>
     {isAdmin&&isShutdown&&(
      <button 
       className="fleetFirmwareRestartBtn"
       onClick={()=>onFirmwareRestart&&onFirmwareRestart(p)}
       title="Restart Klipper firmware and reload config"
      >
       <RotateCcw size={13}/>
       <span>FIRMWARE_RESTART</span>
      </button>
     )}
    </div>
   )}
  </article>
   </div>
  </section>
 );
}

function HostStatusModal({systemInfo, total, online, onClose, onOpenGuide, onRefresh}){
 const [copiedLan, setCopiedLan] = useState(false);
 const [copiedRemote, setCopiedRemote] = useState(false);
 const [refreshing, setRefreshing] = useState(false);

 const lanHost = systemInfo?.primaryIp || '172.16.20.139';
 const lanPort = systemInfo?.port || 3080;
 const lanUrl = `http://${lanHost}:${lanPort}`;
 const remoteUrl = 'https://neptunemonitor.com';
 const hostName = systemInfo?.hostname || 'DESKTOP-7K68NSL';

 const handleCopyLan = () => {
  if (navigator?.clipboard?.writeText) {
   navigator.clipboard.writeText(lanUrl).then(()=>{
    setCopiedLan(true);
    setTimeout(()=>setCopiedLan(false), 2000);
   });
  }
 };

 const handleCopyRemote = () => {
  if (navigator?.clipboard?.writeText) {
   navigator.clipboard.writeText(remoteUrl).then(()=>{
    setCopiedRemote(true);
    setTimeout(()=>setCopiedRemote(false), 2000);
   });
  }
 };

 const handleRefresh = async () => {
  setRefreshing(true);
  try {
   await onRefresh();
  } finally {
   setTimeout(()=>setRefreshing(false), 400);
  }
 };

 return (
  <div className="hostModalBackdrop" onClick={onClose}>
   <div className="hostModalCard hostStatusCard" onClick={e=>e.stopPropagation()}>
    <div className="hostModalHead">
     <div className="hostModalTitle">
      <HardDrive size={18} color="#38bdf8"/>
      <span>Host System Status</span>
     </div>
     <button className="hostModalClose" onClick={onClose} title="Close">
      <X size={18}/>
     </button>
    </div>

    <div className="hostModalBody">
     {/* SECTION 1: Registered Host Computer */}
     <div className="hostModalSection">
      <div className="hostModalSecHead">
       <span>Host Computer Telemetry</span>
       <span className="hostLivePill online">
        <span className="liveDot green"/> Online (Ready)
       </span>
      </div>

      <div className="hostModalRow">
       <label>Computer Name</label>
       <strong>{hostName}</strong>
      </div>
      <div className="hostModalRow">
       <label>Farm LAN IP</label>
       <div style={{display:'flex',alignItems:'center',gap:6}}>
        <strong className="mono">{lanUrl}</strong>
        <button className="copyBtn" onClick={handleCopyLan} title="Copy LAN address">
         {copiedLan ? <Check size={12} color="#10b981"/> : <Copy size={12}/>}
        </button>
       </div>
      </div>
      <div className="hostModalRow">
       <label>Cloudflare Public URL</label>
       <div style={{display:'flex',alignItems:'center',gap:6}}>
        <strong className="mono">{remoteUrl}</strong>
        <button className="copyBtn" onClick={handleCopyRemote} title="Copy remote URL">
         {copiedRemote ? <Check size={12} color="#10b981"/> : <Copy size={12}/>}
        </button>
        <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="openBtn" title="Open in new tab">
         <ExternalLink size={12}/>
        </a>
       </div>
      </div>
      <div className="hostModalRow">
       <label>Host Uptime</label>
       <strong>{systemInfo?.uptimeSec != null ? fmtDuration(systemInfo.uptimeSec) : 'Active'}</strong>
      </div>
      <div className="hostModalRow">
       <label>Linked 3D Printers</label>
       <strong style={{color:'#34d399'}}>{online} of {total} connected</strong>
      </div>
     </div>

     {/* SECTION 2: 24/7 Background Watchdog */}
     <div className="hostModalSection">
      <div className="hostModalSecHead">
       <span>24/7 Persistent Watchdog</span>
       <span style={{color:'#10b981',fontWeight:700,fontSize:11}}>ACTIVE</span>
      </div>
      <div style={{fontSize:12.5,color:'#94a3b8',lineHeight:1.55}}>
       <div className="hostModalRow" style={{padding:'4px 0'}}>
        <label>Service Type</label>
        <strong style={{color:'#38bdf8'}}>Windows WMI Background Service</strong>
       </div>
       <div className="hostModalRow" style={{padding:'4px 0'}}>
        <label>IDE Decoupling</label>
        <strong style={{color:'#10b981'}}>Independent of Antigravity</strong>
       </div>
       <div className="hostModalRow" style={{padding:'4px 0'}}>
        <label>Auto-Recovery</label>
        <strong>Monitors port 3080 & tunnel every 10s</strong>
       </div>
       <div className="hostModalRow" style={{padding:'4px 0'}}>
        <label>Boot Auto-Start</label>
        <strong>Windows Registry Run & Startup Folder</strong>
       </div>
      </div>
     </div>
    </div>

    <div className="hostModalFoot" style={{justifyContent:'space-between'}}>
     <button 
      className="fleetRefreshBtn" 
      onClick={()=>{onClose();onOpenGuide();}} 
      style={{fontSize:12,padding:'6px 12px',gap:6}}
     >
      <Sparkles size={13} color="#38bdf8"/> How to Setup...
     </button>
     <div style={{display:'flex',gap:8}}>
      <button 
       className="fleetRefreshBtn" 
       onClick={handleRefresh} 
       disabled={refreshing} 
       style={{fontSize:12,padding:'6px 12px'}}
      >
       <RefreshCw size={13} className={refreshing?'spin':''}/> {refreshing ? 'Checking...' : 'Refresh'}
      </button>
      <button 
       className="fleetRefreshBtn" 
       onClick={onClose} 
       style={{padding:'6px 16px',fontSize:12.5}}
      >
       Close
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}

function ConnectionSwitcherModal({isLocal, systemInfo, onClose}){
 const lanHost = systemInfo?.primaryIp || '172.16.20.139';
 const lanPort = systemInfo?.port || 3080;
 const lanUrl = systemInfo?.localUrl || `http://${lanHost}:${lanPort}`;
 const remoteUrl = systemInfo?.remoteUrl || 'https://neptunemonitor.com';
 const [copiedLan, setCopiedLan] = useState(false);
 const [copiedRemote, setCopiedRemote] = useState(false);

 const copyLan = () => {
  if (navigator?.clipboard?.writeText) {
   navigator.clipboard.writeText(lanUrl).then(()=>{
    setCopiedLan(true);
    setTimeout(()=>setCopiedLan(false), 2000);
   });
  }
 };

 const copyRemote = () => {
  if (navigator?.clipboard?.writeText) {
   navigator.clipboard.writeText(remoteUrl).then(()=>{
    setCopiedRemote(true);
    setTimeout(()=>setCopiedRemote(false), 2000);
   });
  }
 };

 return (
  <div className="hostModalBackdrop" onClick={onClose}>
   <div className="hostModalCard" style={{maxWidth:'560px'}} onClick={e=>e.stopPropagation()}>
    <div className="hostModalHead">
     <div className="hostModalTitle">
      <Radio size={18} color="#38bdf8"/>
      <span>Connection Access Switcher</span>
     </div>
     <button className="hostModalClose" onClick={onClose} title="Close">
      <X size={18}/>
     </button>
    </div>

    <div className="hostModalBody" style={{padding:'18px 20px'}}>
     {/* Current active status pill */}
     <div style={{background:'#09111e',border:'1px solid #1e293b',borderRadius:'10px',padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div>
       <span style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px',color:'#64748b',fontWeight:700}}>Currently Connected Via</span>
       <div style={{fontSize:'13.5px',fontWeight:700,color:'#f8fafc',marginTop:'2px',display:'flex',alignItems:'center',gap:'6px'}}>
        {isLocal ? <Wifi size={14} color="#10b981"/> : <Globe size={14} color="#38bdf8"/>}
        {isLocal ? `Local LAN Network (${lanHost})` : 'Remote Cloudflare Internet'}
       </div>
      </div>
      <span className={'netPill '+(isLocal?'local':'remote')} style={{padding:'4px 10px',borderRadius:'12px',fontSize:'11.5px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'5px'}}>
       <span className="liveDot green"/>
       {isLocal ? 'LAN Active' : 'Remote Active'}
      </span>
     </div>

     {/* 2 Big Cards: Local LAN and Remote Cloud */}
     <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {/* Option 1: Local LAN */}
      <div style={{background:'#0e1726',border:isLocal?'1.5px solid #10b981':'1px solid #1e2c40',borderRadius:'10px',padding:'14px 16px',position:'relative'}}>
       {isLocal && (
        <span style={{position:'absolute',right:'14px',top:'14px',background:'rgba(16,185,129,0.15)',color:'#34d399',border:'1px solid rgba(16,185,129,0.3)',fontSize:'10.5px',padding:'2px 8px',borderRadius:'10px',fontWeight:700}}>
         CURRENTLY ACTIVE
        </span>
       )}
       <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
        <Wifi size={16} color="#34d399"/>
        <strong style={{fontSize:'14px',color:'#f8fafc'}}>Local LAN Wi-Fi Access</strong>
       </div>
       <p style={{fontSize:'12px',color:'#94a3b8',margin:'0 0 10px 0',lineHeight:1.4}}>
        Use when connected to the <b>same workshop Wi-Fi / LAN</b> as the printers. Direct network path with fastest update rate and native Fluidd Web UI support.
       </p>
       <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#070d18',padding:'8px 12px',borderRadius:'6px',border:'1px solid #1a273b'}}>
        <code style={{fontSize:'12.5px',color:'#38bdf8',fontFamily:'monospace'}}>{lanUrl}</code>
        <div style={{display:'flex',gap:'6px'}}>
         <button className="copyBtn" onClick={copyLan} title="Copy LAN URL" style={{padding:'4px 8px',fontSize:'11px',display:'inline-flex',alignItems:'center',gap:'4px'}}>
          {copiedLan ? <Check size={12} color="#10b981"/> : <Copy size={12}/>} {copiedLan ? 'Copied' : 'Copy'}
         </button>
         <a href={lanUrl} className="primary" style={{padding:'4px 10px',fontSize:'11px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px'}}>
          <ExternalLink size={12}/> Open LAN
         </a>
        </div>
       </div>
      </div>

      {/* Option 2: Remote Cloud */}
      <div style={{background:'#0e1726',border:!isLocal?'1.5px solid #38bdf8':'1px solid #1e2c40',borderRadius:'10px',padding:'14px 16px',position:'relative'}}>
       {!isLocal && (
        <span style={{position:'absolute',right:'14px',top:'14px',background:'rgba(56,189,248,0.15)',color:'#38bdf8',border:'1px solid rgba(56,189,248,0.3)',fontSize:'10.5px',padding:'2px 8px',borderRadius:'10px',fontWeight:700}}>
         CURRENTLY ACTIVE
        </span>
       )}
       <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
        <Globe size={16} color="#38bdf8"/>
        <strong style={{fontSize:'14px',color:'#f8fafc'}}>Remote Cloud Internet Access</strong>
       </div>
       <p style={{fontSize:'12px',color:'#94a3b8',margin:'0 0 10px 0',lineHeight:1.4}}>
        Use when you are <b>outside the workshop, at home, or on mobile 4G/5G data</b>. Securely relayed through Cloudflare tunnel 24/7.
       </p>
       <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#070d18',padding:'8px 12px',borderRadius:'6px',border:'1px solid #1a273b'}}>
        <code style={{fontSize:'12.5px',color:'#38bdf8',fontFamily:'monospace'}}>{remoteUrl}</code>
        <div style={{display:'flex',gap:'6px'}}>
         <button className="copyBtn" onClick={copyRemote} title="Copy Remote URL" style={{padding:'4px 8px',fontSize:'11px',display:'inline-flex',alignItems:'center',gap:'4px'}}>
          {copiedRemote ? <Check size={12} color="#10b981"/> : <Copy size={12}/>} {copiedRemote ? 'Copied' : 'Copy'}
         </button>
         <a href={remoteUrl} className="primary" style={{padding:'4px 10px',fontSize:'11px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px'}}>
          <ExternalLink size={12}/> Open Remote
         </a>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}

function UsersManager({printers = [], currentUser}){
 const [users, setUsers] = useState([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [editingUser, setEditingUser] = useState(null);
 const [showAddForm, setShowAddForm] = useState(false);

 const [formEmail, setFormEmail] = useState('');
 const [formName, setFormName] = useState('');
 const [formPassword, setFormPassword] = useState('');
 const [formRole, setFormRole] = useState('guest');
 const [formPrinters, setFormPrinters] = useState(['*']);

 const loadUsers = async () => {
  setLoading(true);
  setError('');
  try {
   const res = await api('/users');
   const list = Array.isArray(res) ? res : (res.users || []);
   setUsers(list);
  } catch (err) {
   setError(err.message);
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  loadUsers();
 }, []);

 const startAdd = () => {
  setEditingUser(null);
  setFormEmail('');
  setFormName('');
  setFormPassword('');
  setFormRole('guest');
  setFormPrinters(['*']);
  setShowAddForm(true);
  setError('');
  setSuccess('');
 };

 const startEdit = (u) => {
  setEditingUser(u);
  setFormEmail(u.email);
  setFormName(u.name || '');
  setFormPassword('');
  setFormRole(u.role || 'guest');
  setFormPrinters(Array.isArray(u.assignedPrinters) && u.assignedPrinters.length ? u.assignedPrinters : ['*']);
  setShowAddForm(true);
  setError('');
  setSuccess('');
 };

 const cancelForm = () => {
  setShowAddForm(false);
  setEditingUser(null);
  setError('');
 };

 const togglePrinter = (printerId) => {
  if (printerId === '*') {
   setFormPrinters(['*']);
   return;
  }
  let current = formPrinters.filter(x => x !== '*');
  if (current.includes(printerId)) {
   current = current.filter(x => x !== printerId);
   if (current.length === 0) current = ['*'];
  } else {
   current.push(printerId);
  }
  setFormPrinters(current);
 };

 const handleSave = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  try {
   if (!editingUser) {
    if (!formEmail || !formEmail.includes('@')) throw new Error('Valid email address is required');
    if (!formPassword || formPassword.length < 6) throw new Error('Password must be at least 6 characters');
    await api('/users', {
     method: 'POST',
     body: JSON.stringify({
      email: formEmail,
      name: formName,
      password: formPassword,
      role: formRole,
      assignedPrinters: formPrinters
     })
    });
    setSuccess(`Created ${formRole} user "${formEmail}" successfully!`);
   } else {
    await api(`/users/${editingUser.id}`, {
     method: 'PUT',
     body: JSON.stringify({
      email: formEmail,
      name: formName,
      password: formPassword || undefined,
      role: formRole,
      assignedPrinters: formPrinters
     })
    });
    setSuccess(`Updated user "${formEmail}" successfully!`);
   }
   setShowAddForm(false);
   setEditingUser(null);
   await loadUsers();
   setTimeout(() => setSuccess(''), 4000);
  } catch (err) {
   setError(err.message);
  }
 };

 const handleDelete = async (u) => {
  if (u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1) {
   alert('Cannot delete the only admin account.');
   return;
  }
  if (!confirm(`Are you sure you want to delete user "${u.email}" (${u.name})?`)) return;
  try {
   await api(`/users/${u.id}`, { method: 'DELETE' });
   setSuccess(`User "${u.email}" deleted successfully.`);
   await loadUsers();
   setTimeout(() => setSuccess(''), 4000);
  } catch (err) {
   setError(err.message);
  }
 };

 return (
  <div className="usersManagerWrap">
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
    <div>
     <h3 style={{fontSize:'16px',fontWeight:700,color:'var(--farm-ink)',margin:0}}>User & Guest Accounts</h3>
     <p style={{fontSize:'12.5px',color:'#8fa2bc',margin:'2px 0 0'}}>
      Manage user logins, Admin privileges, and Guest view-only printer assignments.
     </p>
    </div>
    {!showAddForm && (
     <button className="primary" onClick={startAdd} style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'7px 14px',fontSize:'13px'}}>
      <UserPlus size={15}/> Add New Guest / Admin
     </button>
    )}
   </div>

   {success && <div className="tgFeedback success" style={{marginBottom:'14px'}}>{success}</div>}
   {error && <div className="tgFeedback error" style={{marginBottom:'14px'}}>{error}</div>}

   {showAddForm && (
    <form onSubmit={handleSave} className="card" style={{background:'var(--farm-panel)',border:'1px solid #1e3a5f',borderRadius:'10px',padding:'16px 18px',marginBottom:'18px'}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',borderBottom:'1px solid #1a273e',paddingBottom:'8px'}}>
      <strong style={{fontSize:'14px',color:'#38bdf8',display:'flex',alignItems:'center',gap:'6px'}}>
       {editingUser ? <Users size={16}/> : <UserPlus size={16}/>}
       {editingUser ? `Edit Account: ${editingUser.email}` : 'Create New Account'}
      </strong>
      <button type="button" className="iconButton" onClick={cancelForm} title="Cancel"><X size={16}/></button>
     </div>

     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'12px',marginBottom:'12px'}}>
      <label style={{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px',color:'#94a3b8'}}>
       Email Address *
       <input 
        type="email" 
        value={formEmail} 
        onChange={e=>setFormEmail(e.target.value)} 
        placeholder="guest@example.com" 
        required 
        style={{background:'var(--farm-canvas)',border:'1px solid #1e2c40',padding:'8px 10px',borderRadius:'6px',color:'var(--farm-ink)',fontSize:'13px'}}
       />
      </label>

      <label style={{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px',color:'#94a3b8'}}>
       Full Name / Nickname
       <input 
        type="text" 
        value={formName} 
        onChange={e=>setFormName(e.target.value)} 
        placeholder="e.g. Workshop Guest" 
        style={{background:'var(--farm-canvas)',border:'1px solid #1e2c40',padding:'8px 10px',borderRadius:'6px',color:'var(--farm-ink)',fontSize:'13px'}}
       />
      </label>

      <label style={{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px',color:'#94a3b8'}}>
       Password {editingUser ? '(leave blank to keep unchanged)' : '*'}
       <input 
        type="password" 
        value={formPassword} 
        onChange={e=>setFormPassword(e.target.value)} 
        placeholder={editingUser ? '•••••••• (unchanged)' : 'Min 6 characters'} 
        required={!editingUser}
        minLength={formPassword ? 6 : undefined}
        style={{background:'var(--farm-canvas)',border:'1px solid #1e2c40',padding:'8px 10px',borderRadius:'6px',color:'var(--farm-ink)',fontSize:'13px'}}
       />
      </label>

      <label style={{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px',color:'#94a3b8'}}>
       Account Role *
       <select 
        value={formRole} 
        onChange={e=>setFormRole(e.target.value)}
        style={{background:'var(--farm-canvas)',border:'1px solid #1e2c40',padding:'8px 10px',borderRadius:'6px',color:'var(--farm-ink)',fontSize:'13px'}}
       >
        <option value="guest">Guest (View Only — No Stops or Controls)</option>
        <option value="admin">Admin (Full Control + Management)</option>
       </select>
      </label>
     </div>

     {/* Printer Assignment Selection */}
     <div style={{background:'var(--farm-canvas)',border:'1px solid #162438',borderRadius:'8px',padding:'12px 14px',marginBottom:'14px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
       <span style={{fontSize:'12px',fontWeight:700,color:'var(--farm-muted)'}}>Assigned Printers Access</span>
       <span style={{fontSize:'11px',color:'#64748b'}}>
        {formPrinters.includes('*') ? 'Can view all printers' : `Assigned to ${formPrinters.length} printer(s)`}
       </span>
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
       <label style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#0e1a2d',border:formPrinters.includes('*')?'1px solid #38bdf8':'1px solid #1c2b42',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:formPrinters.includes('*')?'#38bdf8':'#cbd5e1'}}>
        <input 
         type="checkbox" 
         checked={formPrinters.includes('*')} 
         onChange={()=>togglePrinter('*')}
        />
        <strong>All Fleet Printers (*)</strong>
       </label>

       {printers.map(p => {
        const isChecked = formPrinters.includes('*') || formPrinters.includes(p.id);
        return (
         <label key={p.id} style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#0e1a2d',border:isChecked?'1px solid #10b981':'1px solid #1c2b42',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:isChecked?'#34d399':'#94a3b8',opacity:formPrinters.includes('*')?0.6:1}}>
          <input 
           type="checkbox" 
           checked={isChecked} 
           disabled={formPrinters.includes('*')}
           onChange={()=>togglePrinter(p.id)}
          />
          <span>{p.name} ({p.host})</span>
         </label>
        );
       })}
      </div>
     </div>

     <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
      <button type="button" className="outline" onClick={cancelForm}>Cancel</button>
      <button type="submit" className="primary">
       {editingUser ? 'Save Account Changes' : 'Create Account'}
      </button>
     </div>
    </form>
   )}

   {/* Users Table */}
   <div className="card" style={{padding:0,overflow:'hidden',background:'var(--farm-panel)',border:'1px solid #162032'}}>
    <table className="settingsUsersTable" role="table" style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:'12.5px'}}>
     <thead role="rowgroup">
      <tr role="row" style={{background:'var(--farm-canvas)',borderBottom:'1px solid #162032',color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>
       <th role="columnheader" style={{padding:'10px 14px'}}>User / Email</th>
       <th role="columnheader" style={{padding:'10px 14px'}}>Name</th>
       <th role="columnheader" style={{padding:'10px 14px'}}>Role</th>
       <th role="columnheader" style={{padding:'10px 14px'}}>Assigned Printers</th>
       <th role="columnheader" style={{padding:'10px 14px',textAlign:'right'}}>Actions</th>
      </tr>
     </thead>
     <tbody role="rowgroup">
      {users.map(u => {
       const isCurrent = u.id === currentUser?.id || u.email === currentUser?.email;
       const assignedNames = u.assignedPrinters?.includes('*') 
        ? 'All Fleet Printers (*)' 
        : u.assignedPrinters?.map(id => {
           const match = printers.find(p => p.id === id);
           return match ? match.name : id;
          }).join(', ') || 'None';

       return (
        <tr role="row" key={u.id} style={{borderBottom:'1px solid #141e2e'}}>
         <td role="cell" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
           <Mail size={14} color="#64748b"/>
           <strong style={{color:'var(--farm-ink)'}}>{u.email}</strong>
           {isCurrent && <span style={{fontSize:'10px',background:'#1e293b',color:'#94a3b8',padding:'1px 5px',borderRadius:'4px'}}>You</span>}
          </div>
         </td>
         <td role="cell" style={{padding:'12px 14px',color:'var(--farm-muted)'}}>{u.name || '—'}</td>
         <td role="cell" style={{padding:'12px 14px'}}>
          <span className={'roleBadge ' + (u.role === 'admin' ? 'admin' : 'guest')}>
           {u.role === 'admin' ? <ShieldCheck size={12}/> : <Eye size={12}/>}
           {u.role === 'admin' ? 'Admin' : 'Guest (View Only)'}
          </span>
         </td>
         <td role="cell" className="settingsUserPrinters" style={{padding:'12px 14px',color:'#94a3b8',fontSize:'12px'}}>
          <span className="settingsCellLabel">Assigned printers</span>
          {assignedNames}
         </td>
         <td role="cell" style={{padding:'12px 14px',textAlign:'right'}}>
          <div style={{display:'inline-flex',gap:'6px'}}>
           <button className="iconButton" onClick={()=>startEdit(u)} title="Edit user">
            <Sliders size={13}/>
           </button>
           <button 
            className="iconButton deleteBtn" 
            onClick={()=>handleDelete(u)} 
            title="Delete user"
            disabled={u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1}
           >
            <Trash2 size={13}/>
           </button>
          </div>
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
   </div>
  </div>
 );
}

function UsersModal({printers, currentUser, onClose}){
 return (
  <div className="hostModalBackdrop" onClick={onClose}>
   <div className="hostModalCard" style={{maxWidth:'820px',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
    <div className="hostModalHead">
     <div className="hostModalTitle">
      <Users size={18} color="#34d399"/>
      <span>User & Guest Management</span>
     </div>
     <button className="hostModalClose" onClick={onClose} title="Close">
      <X size={18}/>
     </button>
    </div>

    <div className="hostModalBody" style={{padding:'18px 20px'}}>
     <UsersManager printers={printers} currentUser={currentUser}/>
    </div>
   </div>
  </div>
 );
}

function HostSetupGuideModal({onClose, onOpenStatus}){
 const [guideTab, setGuideTab] = useState('remote'); // 'remote' | 'printers' | 'watchdog'
 const [copiedRemote, setCopiedRemote] = useState(false);
 const remoteUrl = 'https://neptunemonitor.com';

 const handleCopyRemote = () => {
  if (navigator?.clipboard?.writeText) {
   navigator.clipboard.writeText(remoteUrl).then(()=>{
    setCopiedRemote(true);
    setTimeout(()=>setCopiedRemote(false), 2000);
   });
  }
 };

 return (
  <div className="hostModalBackdrop" onClick={onClose}>
   <div className="hostModalCard hostGuideCard" onClick={e=>e.stopPropagation()}>
    <div className="hostModalHead">
     <div className="hostModalTitle">
      <Sparkles size={18} color="#38bdf8"/>
      <span>How to Setup Neptune Farm</span>
     </div>
     <button className="hostModalClose" onClick={onClose} title="Close">
      <X size={18}/>
     </button>
    </div>

    {/* Guide Tabs */}
    <div className="hostGuideTabsBar">
     <button 
      className={'hostGuideTabBtn '+(guideTab==='remote'?'active':'')} 
      onClick={()=>setGuideTab('remote')}
     >
      <Globe size={13}/> Remote Access
     </button>
     <button 
      className={'hostGuideTabBtn '+(guideTab==='printers'?'active':'')} 
      onClick={()=>setGuideTab('printers')}
     >
      <Printer size={13}/> Add 3D Printers
     </button>
     <button 
      className={'hostGuideTabBtn '+(guideTab==='watchdog'?'active':'')} 
      onClick={()=>setGuideTab('watchdog')}
     >
      <ShieldCheck size={13}/> 24/7 Always-On
     </button>
    </div>

    <div className="hostModalBody" style={{padding:'16px 20px'}}>
     {guideTab === 'remote' && (
      <div className="hostModalSection">
       <div className="hostModalSecHead">
        <span>🌐 Remote Access Setup</span>
        <span style={{color:'#38bdf8',fontSize:11,fontWeight:700}}>Cloudflare Argo</span>
       </div>
       <ol style={{margin:'0 0 14px 0',paddingLeft:18,fontSize:12.5,color:'#cbd5e1',lineHeight:1.65,display:'flex',flexDirection:'column',gap:6}}>
        <li>
         Open <strong style={{color:'#38bdf8'}}>https://neptunemonitor.com</strong> from any smartphone, laptop, or remote network.
        </li>
        <li>
         All traffic is encrypted and securely relayed to your Host PC via Cloudflare Tunnel.
        </li>
        <li>
         No port forwarding, static IP, or firewall exceptions are needed on your router.
        </li>
        <li>
         Printers on your farm LAN are immediately discovered and monitored in real time.
        </li>
       </ol>
       <div style={{display:'flex',gap:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <button className="fleetRefreshBtn" onClick={handleCopyRemote} style={{fontSize:12,padding:'6px 12px'}}>
         {copiedRemote ? <Check size={13} color="#10b981"/> : <Copy size={13}/>} Copy neptunemonitor.com
        </button>
        <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="fleetRefreshBtn" style={{fontSize:12,padding:'6px 12px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:6}}>
         <ExternalLink size={13}/> Open neptunemonitor.com
        </a>
       </div>
      </div>
     )}

     {guideTab === 'printers' && (
      <div className="hostModalSection">
       <div className="hostModalSecHead">
        <span>🖨️ How to Add 3D Printers</span>
        <span style={{color:'#34d399',fontSize:11,fontWeight:700}}>Moonraker / Fluidd</span>
       </div>
       <ol style={{margin:0,paddingLeft:18,fontSize:12.5,color:'#cbd5e1',lineHeight:1.65,display:'flex',flexDirection:'column',gap:6}}>
        <li>
         Connect your Elegoo Neptune printer to your farm Wi-Fi or router network.
        </li>
        <li>
         Find the printer's assigned IP on the touch screen (e.g. <code style={{color:'#38bdf8'}}>172.16.20.xxx</code>).
        </li>
        <li>
         Navigate to <b>Printer settings</b> tab in the sidebar and click <b>+ Add printer</b>.
        </li>
        <li>
         Enter printer name, IP address, and default Moonraker port <code style={{color:'#38bdf8'}}>7125</code> (or <code style={{color:'#38bdf8'}}>80</code>).
        </li>
        <li>
         Click <b>Save printer list</b> — Neptune Farm immediately establishes real-time telemetry!
        </li>
       </ol>
      </div>
     )}

     {guideTab === 'watchdog' && (
      <div className="hostModalSection">
       <div className="hostModalSecHead">
        <span>🛡️ 24/7 Always-On Service</span>
        <span style={{color:'#10b981',fontSize:11,fontWeight:700}}>Zero Maintenance</span>
       </div>
       <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:'#cbd5e1',lineHeight:1.65,display:'flex',flexDirection:'column',gap:6}}>
        <li>
         <b>Decoupled from Antigravity:</b> Runs under Windows OS service (`WmiPrvSE.exe`). Closing the IDE will not terminate your farm host.
        </li>
        <li>
         <b>Automatic Startup:</b> Starts automatically when Windows boots or logs in via Registry Auto-Run & Startup folder.
        </li>
        <li>
         <b>Auto-Recovery:</b> The watchdog verifies port 3080 and the Cloudflare tunnel every 10 seconds. If any process dies or PC wakes from sleep, it revives it in seconds.
        </li>
        <li>
         <b>Desktop Launcher:</b> A backup 1-click launcher is placed on your Desktop: <code style={{color:'#38bdf8'}}>START-NEPTUNE-FARM.bat</code>.
        </li>
       </ul>
      </div>
     )}
    </div>

    <div className="hostModalFoot" style={{justifyContent:'space-between'}}>
     <button 
      className="fleetRefreshBtn" 
      onClick={()=>{onClose();onOpenStatus();}} 
      style={{fontSize:12,padding:'6px 12px',gap:6}}
     >
      <HardDrive size={13} color="#38bdf8"/> View Host Status...
     </button>
     <button 
      className="fleetRefreshBtn" 
      onClick={onClose} 
      style={{padding:'6px 18px',fontSize:12.5}}
     >
      Close
     </button>
    </div>
   </div>
  </div>
 );
}

function RemoteControlModal({p,isLocal,systemInfo,onClose,onRefresh,isAdmin=true}){
 const hasRunout = Boolean(
  (p.status === 'runout' || (p.filamentRunout === true && (p.status === 'printing' || p.status === 'paused'))) &&
  Boolean(p.file) &&
  p.status !== 'cancelled' &&
  p.status !== 'idle' &&
  p.status !== 'standby' &&
  p.status !== 'leveling' &&
  p.status !== 'homing' &&
  !p.isShutdown
 );
 const [logs,setLogs]=useState([]);
 const [cmd,setCmd]=useState('');
 const [sending,setSending]=useState(false);
 const [feedback,setFeedback]=useState(null);
 const [autoScroll,setAutoScroll]=useState(true);
 const [modalTab,setModalTab]=useState('job');
 const [files,setFiles]=useState([]);
 const [loadingFiles,setLoadingFiles]=useState(false);
 const [filesError,setFilesError]=useState(null);
 const [fileSearch,setFileSearch]=useState('');
 const [startingPrint,setStartingPrint]=useState(false);

 async function loadFiles(){
  setLoadingFiles(true);
  setFilesError(null);
  try{
   const r=await api(`/printers/${p.id}/files`);
   if(r.ok&&Array.isArray(r.files)){
    setFiles(r.files);
   }else{
    setFilesError(r.error||'Failed to load printer files');
   }
  }catch(err){
   setFilesError(err.message);
  }finally{
   setLoadingFiles(false);
  }
 }

 useEffect(()=>{
  if(modalTab==='files'){
   loadFiles();
  }
 },[modalTab,p.id]);

 async function handleStartPrint(filename){
  if(!isAdmin){
   setFeedback({type:'error',text:'Guest View-Only Mode: Starting print jobs is restricted to Admins.'});
   return;
  }
  if(!window.confirm(`Start printing "${filename}" on ${p.name}?`))return;
  setStartingPrint(true);
  setFeedback(null);
  try{
   const r=await api(`/printers/${p.id}/print-file`,{
    method:'POST',
    body:JSON.stringify({filename})
   });
   setFeedback({type:'success',text:`Print job started for: ${filename}`});
   setTimeout(onRefresh,1000);
   setTimeout(loadFiles,1500);
  }catch(err){
   setFeedback({type:'error',text:err.message});
  }finally{
   setStartingPrint(false);
  }
 }

 const filteredFiles = files.filter(f => (f.filename || '').toLowerCase().includes(fileSearch.trim().toLowerCase()));
 const [jogStep,setJogStep]=useState(10); // 0.1 | 1 | 10 | 50 | 100
 const [customNozzle,setCustomNozzle]=useState(210);
 const [customBed,setCustomBed]=useState(60);
 const logBoxRef=React.useRef(null);

 async function loadLogs(){
  try{
   const r=await api(`/printers/${p.id}/console?count=50`);
   if(r.ok&&Array.isArray(r.logs)){
    setLogs(r.logs);
   }
  }catch(err){}
 }

 useEffect(()=>{
  if(modalTab!=='terminal')return;
  loadLogs();
  const iv=setInterval(loadLogs,3000);
  return ()=>clearInterval(iv);
 },[p.id,modalTab]);

 useEffect(()=>{
  if(autoScroll&&logBoxRef.current){
   logBoxRef.current.scrollTop=logBoxRef.current.scrollHeight;
  }
 },[logs]);

 async function sendCommand(action,gcode,confirmPrompt){
  if(!isAdmin){
   setFeedback({type:'error',text:'Guest View-Only Mode: Printer controls and command execution are restricted to Admins.'});
   return;
  }
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
   if(modalTab==='terminal')setTimeout(loadLogs,500);
   setTimeout(onRefresh,800);
  }catch(err){
   setFeedback({type:'error',text:err.message});
  }finally{
   setSending(false);
  }
 }

 const s=p.status||'connecting';
 const isIdle=s==='idle'||s==='standby';
 const isShutdown=Boolean(p.isShutdown||p.shutdownReason||s==='shutdown');
 const isError=s==='offline'||s==='error';
 const canResume=s==='paused'||hasRunout;
 const canPause=s==='printing'&&!hasRunout;
 const advancedTabs=[['fan','Filament & fan',Wind],['jog','Motion',Compass],['terminal','Console',Terminal],['elements','Diagnostics',Activity]];
 const primaryTabs=[['job','Current job',Activity],['files','Files',Folder],...(isAdmin?[['temp','Heat',Flame]]:[])];
 const printerUrl=p.host?`http://${p.host}${p.port&&p.port!==80?':'+p.port:''}`:null;

 return (
  <div className="modalBackdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
   <div className="modalCard controlModal printerWorkspace" role="dialog" aria-modal="true" aria-label={p.name+' controls'}>
    {/* Header */}
    <div className="modalHeader">
     <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
      <div className="printerIcon" style={{width:'40px',height:'40px',borderRadius:'10px',background:'#132238',display:'grid',placeItems:'center',color:'#38bdf8'}}>
       <Printer size={20}/>
      </div>
      <div>
       <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <h2 style={{fontSize:'18px',margin:0,color:'var(--farm-ink)',fontWeight:800}}>{p.name}</h2>
        <span className={'pill '+(hasRunout ? 'orange' : color(s))} style={{fontSize:'10px',padding:'2px 8px'}}><i/>{hasRunout ? 'Filament Runout' : s === 'cancelled' ? 'Cancelled' : s === 'leveling' ? 'Leveling Bed' : s === 'homing' ? 'Homing' : s === 'completed' ? 'Completed' : s}</span>
       </div>
       <div style={{fontSize:'11.5px',color:'var(--farm-muted)',marginTop:'2px'}}>
        {isLocal?'Local connection':'Remote connection'} · {isLocal?'Direct LAN Link':'Relayed via Farm Host'} · Fluidd / Klipper
       </div>
      </div>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      {isLocal&&printerUrl&&(
       <a href={printerUrl} target="_blank" rel="noreferrer" className="outline" style={{padding:'5px 10px',fontSize:'11.5px',gap:'5px'}} title="Open Fluidd Web Interface">
        <ExternalLink size={13}/> Web UI
       </a>
      )}
      <button className="iconButton" onClick={onClose} title="Close"><X size={18}/></button>
     </div>
    </div>

    <div className="controlStatsBar">
     <div><span>Nozzle</span><strong>{temp(p.nozzle)}{p.nozzleTarget ? ' / '+p.nozzleTarget+'°C' : ''}</strong></div>
     <div><span>Bed</span><strong>{temp(p.bed)}{p.bedTarget ? ' / '+p.bedTarget+'°C' : ''}</strong></div>
     <div><span>Layer</span><strong>{p.layer==null?'—':p.layer+(p.totalLayers?' / '+p.totalLayers:'')}</strong></div>
    </div>
    {/* Action Feedback Banner */}
    {feedback&&(
     <div className={'ctrlFeedback '+(feedback.type==='error'?'error':'success')}>
      {feedback.type==='error'?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}
      <span>{feedback.text}</span>
     </div>
    )}

    {hasRunout && <div className="ctrlFeedback error"><AlertTriangle size={15}/><span>Filament runout. Replace the spool before resuming.</span>{isAdmin && <button className="outline" onClick={()=>setModalTab('fan')}>Filament guide</button>}</div>}
    <div className="printerWorkspaceTabs">
     {primaryTabs.map(([key,label,Icon])=>(
      <button key={key} className={'ctrlTabBtn '+(modalTab===key?'active':'')} aria-pressed={modalTab===key} onClick={()=>setModalTab(key)}><Icon size={15}/>{label}</button>
     ))}
     <select aria-label="Advanced controls" value={advancedTabs.some(([key])=>key===modalTab)?modalTab:''} onChange={e=>setModalTab(e.target.value)}>
      <option value="" disabled>Advanced</option>
      {advancedTabs.filter(([key])=>isAdmin||key==='elements').map(([key,label])=><option key={key} value={key}>{label}</option>)}
     </select>
    </div>

    {/* TAB 1: JOG & MOTION */}
    {modalTab==='jog'&&(
     <div className="ctrlTabContent">
      <div className="ctrlJogWrapper">
       {/* Left: Step Selector & D-Pad */}
       <div className="jogMain">
        <div className="stepSelectorRow">
         <span style={{fontSize:'11.5px',color:'#8fa0b5',fontWeight:600}}>Step Size:</span>
         {[0.1, 1, 10, 50, 100].map(val=>(
          <button 
           key={val} 
           className={'stepPill '+(jogStep===val?'active':'')} 
           onClick={()=>setJogStep(val)}
          >
           {val}mm
          </button>
         ))}
        </div>

        <div className="dpadContainer">
         <div className="dpadGrid">
          <div/>
          <button 
           className="dpadBtn up" 
           disabled={sending} 
           title={`Move Y+ ${jogStep}mm (Back)`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 Y${jogStep} F6000\nG90`)}
          >
           <ArrowUp size={18}/>
           <span>Y+</span>
          </button>
          <div/>

          <button 
           className="dpadBtn left" 
           disabled={sending} 
           title={`Move X- ${jogStep}mm (Left)`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 X-${jogStep} F6000\nG90`)}
          >
           <ArrowLeft size={18}/>
           <span>X-</span>
          </button>
          <button 
           className="dpadBtn home" 
           disabled={sending} 
           title="Home All Axes (G28)" 
           onClick={()=>sendCommand('home')}
          >
           <Home size={18}/>
           <span>ALL</span>
          </button>
          <button 
           className="dpadBtn right" 
           disabled={sending} 
           title={`Move X+ ${jogStep}mm (Right)`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 X${jogStep} F6000\nG90`)}
          >
           <ArrowRight size={18}/>
           <span>X+</span>
          </button>

          <div/>
          <button 
           className="dpadBtn down" 
           disabled={sending} 
           title={`Move Y- ${jogStep}mm (Front)`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 Y-${jogStep} F6000\nG90`)}
          >
           <ArrowDown size={18}/>
           <span>Y-</span>
          </button>
          <div/>
         </div>

         {/* Z Axis Column */}
         <div className="zAxisCol">
          <span style={{fontSize:'11px',fontWeight:700,color:'#38bdf8',textAlign:'center'}}>Z-AXIS</span>
          <button 
           className="zBtn up" 
           disabled={sending} 
           title={`Lift Z+ ${jogStep}mm`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 Z${jogStep} F600\nG90`)}
          >
           <ChevronUp size={20}/>
           <span>Z+</span>
          </button>
          <button 
           className="zBtn home" 
           disabled={sending} 
           title="Home Z Axis (G28 Z)" 
           onClick={()=>sendCommand('gcode', 'G28 Z')}
          >
           <Home size={13}/>
           <span>Home Z</span>
          </button>
          <button 
           className="zBtn down" 
           disabled={sending} 
           title={`Lower Z- ${jogStep}mm`} 
           onClick={()=>sendCommand('gcode', `G91\nG1 Z-${jogStep} F600\nG90`)}
          >
           <ChevronDown size={20}/>
           <span>Z-</span>
          </button>
         </div>
        </div>

        {/* Quick Homing & Leveling Chips */}
        <div className="homingChipsRow">
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 X')}>Home X</button>
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 Y')}>Home Y</button>
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 Z')}>Home Z</button>
         <button className="chipBtn primary" disabled={sending} style={{background:'rgba(20,184,166,0.18)',borderColor:'rgba(20,184,166,0.45)',color:'#2dd4bf'}} onClick={()=>sendCommand('level',null,'Start Auto Bed Mesh Leveling (BED_MESH_CALIBRATE)? The toolhead will home and probe grid points.')}>Auto Bed Level (Mesh)</button>
         <button className="chipBtn warn" disabled={sending} onClick={()=>sendCommand('gcode','M84')}>Motors Off (M84)</button>
        </div>
       </div>
      </div>
     </div>
    )}

    {/* TAB 2: TEMPERATURES & PREHEATS */}
    {modalTab==='temp'&&(
     <div className="ctrlTabContent">
      <div className="sectionSubHead">🔥 Quick Material Pre-heats</div>
      <div className="tempPresetsGrid">
       <button className="presetCard pla" disabled={sending} onClick={()=>sendCommand('gcode','M104 S205\nM140 S60')}>
        <span className="presetTitle">PLA Preheat</span>
        <strong className="presetVals">205°C / 60°C</strong>
        <small>Standard PLA / PLA+</small>
       </button>
       <button className="presetCard petg" disabled={sending} onClick={()=>sendCommand('gcode','M104 S235\nM140 S75')}>
        <span className="presetTitle">PETG Preheat</span>
        <strong className="presetVals">235°C / 75°C</strong>
        <small>PETG / High Speed PETG</small>
       </button>
       <button className="presetCard abs" disabled={sending} onClick={()=>sendCommand('gcode','M104 S250\nM140 S100')}>
        <span className="presetTitle">ABS / ASA</span>
        <strong className="presetVals">250°C / 100°C</strong>
        <small>Enclosed technical filaments</small>
       </button>
       <button className="presetCard cool" disabled={sending} onClick={()=>sendCommand('cooldown')}>
        <span className="presetTitle">Cooldown All</span>
        <strong className="presetVals">0°C / 0°C</strong>
        <small>Turn off nozzle, bed & fan</small>
       </button>
      </div>

      <div className="sectionSubHead" style={{marginTop:'16px'}}>🎯 Manual Target Temperature Setters</div>
      <div className="tempSetterGrid">
       <div className="tempSetterBox">
        <label>Nozzle Target (°C)</label>
        <div className="tempInputRow">
         <input 
          type="number" 
          min="0" 
          max="310" 
          value={customNozzle} 
          onChange={e=>setCustomNozzle(Number(e.target.value))}
         />
         <button className="primary" disabled={sending} onClick={()=>sendCommand('gcode', `M104 S${customNozzle}`)}>
          Set Nozzle
         </button>
         <button className="outline" disabled={sending} onClick={()=>sendCommand('gcode', 'M104 S0')}>Off</button>
        </div>
       </div>
       <div className="tempSetterBox">
        <label>Heatbed Target (°C)</label>
        <div className="tempInputRow">
         <input 
          type="number" 
          min="0" 
          max="120" 
          value={customBed} 
          onChange={e=>setCustomBed(Number(e.target.value))}
         />
         <button className="primary" disabled={sending} onClick={()=>sendCommand('gcode', `M140 S${customBed}`)}>
          Set Bed
         </button>
         <button className="outline" disabled={sending} onClick={()=>sendCommand('gcode', 'M140 S0')}>Off</button>
        </div>
       </div>
      </div>
     </div>
    )}

    {/* TAB 3: EXTRUDER & FAN */}
    {modalTab==='fan'&&(
     <div className="ctrlTabContent">
      <div className="sectionSubHead">🧵 Filament Extruder Controls</div>
      <div className="extrudeGrid">
       <button className="extrudeBtn in" disabled={sending} onClick={()=>sendCommand('gcode','M83\nG1 E10 F300')}>
        <ChevronDown size={16}/> Extrude 10mm (F300)
       </button>
       <button className="extrudeBtn in" disabled={sending} onClick={()=>sendCommand('gcode','M83\nG1 E25 F300')}>
        <ChevronDown size={16}/> Extrude 25mm (F300)
       </button>
       <button className="extrudeBtn out" disabled={sending} onClick={()=>sendCommand('gcode','M83\nG1 E-5 F1800')}>
        <ChevronUp size={16}/> Retract 5mm
       </button>
       <button className="extrudeBtn out" disabled={sending} onClick={()=>sendCommand('gcode','M83\nG1 E-10 F1800')}>
        <ChevronUp size={16}/> Retract 10mm
       </button>
      </div>
      <small style={{display:'block',color:'#8298b4',marginTop:'4px',fontSize:'11px'}}>
       ⚠️ Safety: Ensure extruder nozzle is heated above 180°C before extruding or retracting.
      </small>

      <div className="sectionSubHead" style={{marginTop:'18px'}}>💨 Part Cooling Fan</div>
      <div className="fanGrid">
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M106 S255')}>Fan 100% (High)</button>
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M106 S128')}>Fan 50% (Medium)</button>
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M106 S0')}>Fan Off (0%)</button>
      </div>

      <div className="sectionSubHead" style={{marginTop:'18px'}}>⚡ Print Speed Override Factor (M220)</div>
      <div className="speedGrid">
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M220 S50')}>50% Slow</button>
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M220 S100')}>100% Normal</button>
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M220 S125')}>125% Fast</button>
       <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','M220 S150')}>150% Turbo</button>
      </div>

      {/* Step-by-Step Guide: How to Replace Filament */}
      <div className="filamentGuideBox" style={{marginTop:'18px',background:'#070d18',border:'1px solid #1e2e44',borderRadius:'10px',padding:'14px 16px'}}>
       <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',fontWeight:700,fontSize:'13px',color:'#38bdf8'}}>
         <Sparkles size={15}/>
         <span>How to Replace Filament & Reload Spool</span>
        </div>
        <span style={{fontSize:'11px',color:'#10b981',fontWeight:700,background:'rgba(16,185,129,0.12)',padding:'2px 8px',borderRadius:'10px',border:'1px solid rgba(16,185,129,0.3)'}}>
         Step-by-Step Guide
        </span>
       </div>
       
       <ol style={{margin:'0 0 12px 0',paddingLeft:'18px',fontSize:'12.5px',color:'var(--farm-muted)',lineHeight:1.65,display:'flex',flexDirection:'column',gap:'6px'}}>
        <li>
         <strong style={{color:'var(--farm-ink)'}}>Step 1: Preheat Nozzle</strong> — Ensure nozzle is heated above 180°C (PLA: 205°C–215°C, PETG: 230°C–240°C). Cold extrusion is blocked by firmware safety limits.
        </li>
        <li>
         <strong style={{color:'var(--farm-ink)'}}>Step 2: Unload Old Filament</strong> — Press the extruder release tension lever and gently pull remaining filament strand out of the PTFE tube and runout sensor.
        </li>
        <li>
         <strong style={{color:'var(--farm-ink)'}}>Step 3: Insert New Spool</strong> — Snip the new filament tip cleanly at a 45° angle. Feed through the runout sensor until it engages into the extruder drive gears.
        </li>
        <li>
         <strong style={{color:'var(--farm-ink)'}}>Step 4: Purge Old Color</strong> — Click <b>Extrude 25mm</b> once or twice above until new filament flows cleanly from the nozzle tip with consistent solid color.
        </li>
        <li>
         <strong style={{color:'var(--farm-ink)'}}>Step 5: Resume Printing</strong> — Remove any purged plastic from the nozzle tip and click <b>Resume Print</b> to seamlessly continue your print job!
        </li>
       </ol>

       <div style={{display:'flex',gap:'8px',flexWrap:'wrap',paddingTop:'8px',borderTop:'1px solid #142033'}}>
        <button 
         className="chipBtn" 
         disabled={sending} 
         onClick={()=>sendCommand('gcode','M104 S210')}
         style={{fontSize:'11.5px',display:'inline-flex',alignItems:'center',gap:'5px'}}
        >
         <Flame size={12} color="#fbbf24"/> Preheat 210°C
        </button>
        <button 
         className="extrudeBtn in" 
         disabled={sending} 
         onClick={()=>sendCommand('gcode','M83\nG1 E25 F300')}
         style={{fontSize:'11.5px',padding:'6px 12px'}}
        >
         <ChevronDown size={14}/> Purge 25mm
        </button>
        <button 
         className="ctrlBtn resume" 
         disabled={sending} 
         onClick={()=>sendCommand('resume')}
         style={{fontSize:'11.5px',padding:'6px 14px'}}
        >
         <Play size={12}/> Resume Print
        </button>
       </div>
      </div>
     </div>
    )}

    {/* TAB: JOBS & FILES */}
    {modalTab==='job'&&(
     <div className="ctrlTabContent ctrlFilesTab">
      <div className="ctrlActiveJobSection">
       <div className="ctrlActiveJobHeader">
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
         <Activity size={15} className={p.status==='printing' ? 'spin' : ''} style={{color: p.status==='printing' ? '#38bdf8' : '#94a3b8'}}/>
         <strong style={{fontSize:'13px',color:'var(--farm-ink)'}}>
          {p.status==='printing' ? 'Active Print Job' : p.status==='paused' ? 'Job Paused' : p.status==='completed' ? 'Finished Job' : 'Current Job Status'}
         </strong>
        </div>
        <span className={'pill '+(hasRunout ? 'orange' : color(s))} style={{fontSize:'10px',padding:'2px 8px'}}>
         <i/>{hasRunout ? 'Filament Runout' : s}
        </span>
       </div>

       {p.file ? (
        <div className="ctrlActiveJobBody">
         <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',minWidth:0}}>
           <FileText size={17} style={{color:'#38bdf8',flexShrink:0}}/>
           <span className="ctrlActiveFileName" title={p.file}>{p.file}</span>
          </div>
          <span style={{fontSize:'13px',fontWeight:800,color:'#38bdf8'}}>{p.progress ?? 0}%</span>
         </div>

         <div className="fleetBar" style={{margin:'8px 0',height:'7px'}}>
          <div className={'fleetBarFill '+(hasRunout ? 'orange' : color(s))} style={{width:`${p.progress??0}%`}}/>
         </div>

         <div className="ctrlActiveJobMeta">
          {p.startedAt && <span><Play size={11}/> Started: <b>{formatStartTime(p.startedAt)}</b></span>}
          {p.duration > 0 && <span><Timer size={11}/> Elapsed: <b>{fmtDuration(p.duration)}</b></span>}
          {p.remainingTime != null && <span><Clock size={11}/> Remaining: <b>{fmtDuration(p.remainingTime)}</b></span>}
          {p.eta && <span><CheckCircle2 size={11}/> Complete by: <b>{formatFinishTime(p.eta)}</b></span>}
         </div>


        </div>
       ) : (
        <div className="ctrlNoJobBox">
         <FileText size={22} style={{color:'#475569',margin:'0 auto 6px',display:'block'}}/>
         <span>No active print job.</span>
        </div>
       )}
      </div>

     </div>
    )}
    {modalTab==='files'&&(
     <div className="ctrlTabContent ctrlFilesTab">
      <div className="ctrlFilesListSection">
       <div className="ctrlFilesHeader">
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
         <Folder size={16} style={{color:'#10b981'}}/>
         <strong style={{fontSize:'13px',color:'var(--farm-ink)'}}>Files Stored on {p.name}</strong>
         <span className="ctrlFilesCount">{filteredFiles.length} {filteredFiles.length===1?'file':'files'}</span>
        </div>
        <button className="textButton" style={{display:'inline-flex',alignItems:'center',gap:'5px',fontSize:'12px'}} onClick={loadFiles} disabled={loadingFiles}>
         <RefreshCw size={12} className={loadingFiles?'spin':''}/> Refresh
        </button>
       </div>

       {/* Search Bar */}
       <div className="ctrlFilesSearchBar">
        <Search size={14} style={{color:'#64748b',flexShrink:0}}/>
        <input 
         type="text" 
         placeholder="Search G-code files on this printer..." 
         value={fileSearch} 
         onChange={e=>setFileSearch(e.target.value)}
        />
        {fileSearch && (
         <button className="clearSearchBtn" onClick={()=>setFileSearch('')} title="Clear filter">
          <X size={12}/>
         </button>
        )}
       </div>

       {/* Files List */}
       {loadingFiles && files.length===0 ? (
        <div className="ctrlFilesLoading">
         <RefreshCw size={18} className="spin" style={{color:'#38bdf8',margin:'0 auto 8px',display:'block'}}/>
         <span>Loading files list from printer...</span>
        </div>
       ) : filesError ? (
        <div className="ctrlFilesError">
         <AlertTriangle size={15}/> <span>{filesError}</span>
         <button className="chipBtn" style={{marginTop:'6px',fontSize:'11px'}} onClick={loadFiles}>Retry</button>
        </div>
       ) : filteredFiles.length===0 ? (
        <div className="ctrlFilesEmpty">
         <span>{fileSearch ? 'No files match your search filter.' : 'No G-code files found on this printer.'}</span>
        </div>
       ) : (
        <div className="ctrlFilesScrollList">
         {filteredFiles.map((f, idx)=>{
          const isCurrent = (p.file === f.filename);
          const isPrinterBusy = (p.status === 'printing' || p.status === 'paused');
          const sizeMb = f.size ? (f.size / (1024 * 1024)).toFixed(1) : '—';
          const dateStr = f.modified ? new Date(f.modified).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : '—';

          return (
           <div key={f.filename || idx} className={'ctrlFileRow '+(isCurrent ? 'activeFile' : '')}>
            <div className="ctrlFileIcon">
             <FileText size={18} style={{color: isCurrent ? '#38bdf8' : '#94a3b8'}}/>
            </div>
            <div className="ctrlFileInfo">
             <strong className="ctrlFileName" title={f.filename}>{f.filename}</strong>
             <div className="ctrlFileMeta">
              <span>{sizeMb} MB</span>
              <span>•</span>
              <span>{dateStr}</span>
             </div>
            </div>
            <div className="ctrlFileAction">
             {isCurrent && isPrinterBusy ? (
              <span className="fileStatusBadge running">
               <Activity size={11} className="spin"/> Active
              </span>
             ) : isPrinterBusy ? (
              <span className="fileStatusBadge busy" title="Printer is busy printing another file">
               Busy
              </span>
             ) : (
              isAdmin ? (
               <button 
                className="chipBtn printFileBtn"
                disabled={startingPrint}
                onClick={()=>handleStartPrint(f.filename)}
                title={`Start printing ${f.filename}`}
               >
                <Play size={11}/> Print File
               </button>
              ) : (
               <span className="fileStatusBadge ready">Ready</span>
              )
             )}
            </div>
           </div>
          );
         })}
        </div>
       )}
      </div>
     </div>
    )}

    {/* TAB 4: TERMINAL CONSOLE */}
    {modalTab==='terminal'&&(
     <div className="ctrlTabContent" style={{padding:'0 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'12px 0 6px'}}>
       <span style={{fontSize:'12px',fontWeight:700,color:'var(--farm-muted)'}}>Live Moonraker G-Code Console</span>
       <button className="textButton" style={{fontSize:'11.5px'}} onClick={loadLogs}>Refresh</button>
      </div>

      <div className="terminalBox" ref={logBoxRef} style={{maxHeight:'220px'}}>
       {logs.length?logs.map((item,idx)=>(
        <div key={idx} className={'termLine '+(item.type==='command'?'cmd':'resp')}>
         <span className="termTime">[{new Date(item.time*1000).toLocaleTimeString()}]</span>
         <span className="termPrefix">{item.type==='command'?'> ':'  '}</span>
         <span className="termMsg">{item.message}</span>
        </div>
       )):<div className="empty" style={{padding:'14px'}}>Awaiting terminal logs...</div>}
      </div>

      {/* Preset Quick Chips */}
      <div className="presetChips" style={{padding:'8px 0 0'}}>
       <span style={{fontSize:'11px',color:'#778ea9',alignSelf:'center'}}>Quick:</span>
       <button className="chip" onClick={()=>sendCommand('gcode','STATUS')}>STATUS</button>
       <button className="chip" onClick={()=>sendCommand('gcode','M105')}>M105 (Temps)</button>
       <button className="chip" onClick={()=>sendCommand('gcode','M115')}>M115 (Firmware)</button>
       <button className="chip" onClick={()=>sendCommand('gcode','M84')}>M84 (Motors Off)</button>
       <button className="chip" onClick={()=>sendCommand('firmware_restart',null,'Restart Klipper firmware?')}>FIRMWARE_RESTART</button>
      </div>

      {/* Command Input Box */}
      <form className="termInputRow" style={{padding:'10px 0 12px'}} onSubmit={e=>{e.preventDefault();if(cmd.trim())sendCommand('gcode',cmd.trim())}}>
       <input 
        type="text" 
        placeholder={!isAdmin ? "Guest view-only mode: terminal commands disabled" : "Type custom G-code (e.g. G28, M104 S210, M117 Printing)..."}
        value={cmd} 
        onChange={e=>setCmd(e.target.value)} 
        disabled={sending||!isAdmin}
       />
       <button type="submit" className="primary" disabled={sending||!isAdmin||!cmd.trim()}>
        <Send size={14}/> {sending?'Sending...':'Send'}
       </button>
      </form>
     </div>
    )}

    {/* TAB 5: PRINTER ELEMENTS & FLUIDD REMOTE ACCESS */}
    {modalTab==='elements'&&(
     <div className="ctrlTabContent">
      <div className="sectionSubHead">📊 Comprehensive Klipper Elements & Telemetry</div>
      <div className="elementsGrid">
       <div className="elementCard">
        <span className="elementLabel"><Flame size={13}/> Nozzle Extruder</span>
        <strong className="elementVal">{temp(p.nozzle)}{p.nozzleTarget?` / ${p.nozzleTarget}°C`:' (Off)'}</strong>
        <small className="elementSub">{p.nozzleTarget > 0 ? (p.nozzle >= p.nozzleTarget - 2 ? 'At target temperature' : 'Heating up...') : 'Heater is idle'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Flame size={13}/> Heated Bed</span>
        <strong className="elementVal">{temp(p.bed)}{p.bedTarget?` / ${p.bedTarget}°C`:' (Off)'}</strong>
        <small className="elementSub">{p.bedTarget > 0 ? (p.bed >= p.bedTarget - 2 ? 'At target temperature' : 'Heating up...') : 'Heater is idle'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Activity size={13}/> Active Job File</span>
        <strong className="elementVal" title={p.file||'None'} style={{maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>
         {p.file||'No file active'}
        </strong>
        <small className="elementSub">{p.status==='printing' ? 'Printing in progress' : p.status==='completed' ? 'Print completed' : 'Ready for next file'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Play size={13}/> Job Started At</span>
        <strong className="elementVal">{p.startedAt ? formatStartTime(p.startedAt) : '—'}</strong>
        <small className="elementSub">{p.startedAt ? `Started: ${new Date(p.startedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}` : 'Not currently printing'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><CheckCircle2 size={13}/> {p.status==='completed' ? 'Print Completed At' : 'Estimated Completion'}</span>
        <strong className="elementVal">{p.status==='completed' ? formatCompletedTime(p.completedAt) : (p.eta ? formatFinishTime(p.eta) : '—')}</strong>
        <small className="elementSub">{p.status==='completed' ? 'Finished time' : (p.remainingTime != null ? `${fmtDuration(p.remainingTime)} remaining` : 'No ETA available')}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Timer size={13}/> Total Print Time</span>
        <strong className="elementVal">
         {p.duration ? fmtDuration(p.duration) : '—'}
        </strong>
        <small className="elementSub">{p.status==='completed' ? 'Actual time taken to finish' : 'Time this file has been running'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Pause size={13}/> Filament Change Time</span>
        <strong className="elementVal" style={{color: p.jobHoldSec > 0 ? '#fbbf24' : '#94a3b8'}}>
         {p.jobHoldSec > 0 ? fmtDuration(p.jobHoldSec) : '0s'}
        </strong>
        <small className="elementSub">{p.jobHoldSec > 0 ? 'Total pause duration for filament changes' : 'No filament change pauses during this print'}</small>
       </div>
       {(p.idleSec > 0 || isIdle) && (
        <div className="elementCard">
         <span className="elementLabel"><Clock size={13}/> Idle Duration</span>
         <strong className="elementVal" style={{color:'#38bdf8'}}>
          {p.idleSec > 0 ? fmtDuration(p.idleSec) : '< 1m'}
         </strong>
         <small className="elementSub">Time printer has been idle waiting for jobs</small>
        </div>
       )}
       {(p.errorSec > 0 || isShutdown || isError) && (
        <div className="elementCard" style={{borderColor:'rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.06)'}}>
         <span className="elementLabel" style={{color:'#f87171'}}><AlertTriangle size={13}/> Error Duration</span>
         <strong className="elementVal" style={{color:'#ef4444'}}>
          {p.errorSec > 0 ? fmtDuration(p.errorSec) : '< 1m'}
         </strong>
         <small className="elementSub" style={{color:'#fca5a5'}}>Time printer has been in error / shutdown</small>
        </div>
       )}
       {(p.pausedSec > 0 && !hasRunout) && (
        <div className="elementCard">
         <span className="elementLabel"><Pause size={13}/> Paused Duration</span>
         <strong className="elementVal" style={{color:'#fbbf24'}}>
          {fmtDuration(p.pausedSec)}
         </strong>
         <small className="elementSub">Time current print has remained paused</small>
        </div>
       )}
       <div className="elementCard">
        <span className="elementLabel"><Layers size={13}/> Print Layer & Height</span>
        <strong className="elementVal">{p.layer != null ? `Layer ${p.layer}` : '—'} {p.totalLayers ? `/ ${p.totalLayers}` : ''}</strong>
        <small className="elementSub">{p.z != null ? `Current Z: ${p.z} mm` : 'Z coordinate unknown'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Zap size={13}/> Speed Override Factor</span>
        <strong className="elementVal">{Math.round((p.speedFactor || 1) * 100)}%</strong>
        <small className="elementSub">M220 feedrate speed multiplier</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Sparkles size={13}/> Filament Sensor</span>
        <strong className="elementVal" style={{color: p.filamentDetected !== false ? '#34d399' : (hasRunout ? '#f97316' : '#94a3b8')}}>
         {p.filamentDetected !== false ? 'Filament Detected (OK)' : (hasRunout ? 'Runout Detected (Empty)' : 'No Filament Loaded (Empty)')}
        </strong>
        <small className="elementSub">{p.filamentUsed ? `${Math.round(p.filamentUsed)} mm used` : 'Switch sensor active'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Server size={13}/> Network & Host Port</span>
        <strong className="elementVal">{p.host}:{p.port || 80}</strong>
        <small className="elementSub">{isLocal ? 'Local Farm Wi-Fi' : 'Relayed securely via Host PC'}</small>
       </div>
      </div>

      <div className="fluiddRemoteNoticeBox">
       <div className="noticeTitle">
        <Globe size={16} style={{color:'#38bdf8'}}/>
        <strong>Fluidd Direct Web Interface & Remote Access</strong>
       </div>
       <p style={{margin:'4px 0 8px',fontSize:'12px',color:'#94a3b8',lineHeight:1.5}}>
        The printer native Fluidd interface is hosted directly on the printer hardware at <code style={{color:'#38bdf8'}}>http://{p.host}:{p.port||80}</code>.
       </p>
       {isLocal ? (
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'8px'}}>
         <span style={{fontSize:'12px',color:'#34d399',fontWeight:600}}>✓ Connected to local farm Wi-Fi:</span>
         {isLocal && printerUrl && (
          <a href={printerUrl} target="_blank" rel="noreferrer" className="primary" style={{padding:'5px 14px',fontSize:'12px',display:'inline-flex',alignItems:'center',gap:'6px'}}>
           <ExternalLink size={13}/> Open Native Fluidd Web UI
          </a>
         )}
        </div>
       ) : (
        <div style={{fontSize:'12px',color:'var(--farm-muted)',lineHeight:1.6,marginTop:'6px',background:'rgba(15,23,42,0.6)',padding:'10px 12px',borderRadius:'8px',border:'1px solid #1e293b'}}>
         <span>🔒 <b>Remote Internet Access:</b> When accessing the farm remotely over <code>https://neptunemonitor.com</code>, all Klipper elements, telemetry, axis controls, temperatures, filament commands, and console terminal logs are relayed live through this dashboard. Native Fluidd direct links require opening your browser on the local farm Wi-Fi network.</span>
        </div>
       )}
      </div>
     </div>
    )}

    {/* Persistent Print & Safety Action Bar */}
    {isAdmin ? (
     <div className="modalFooterActions">
      <div className="actionGroupLeft">
       {canPause && <button className="ctrlBtn pause" disabled={sending} onClick={()=>sendCommand('pause')}><Pause size={14}/> Pause</button>}
       {canResume && <button className="ctrlBtn resume" disabled={sending} onClick={()=>sendCommand('resume')}><Play size={14}/> Resume</button>}
       {(canPause||canResume) && <button className="ctrlBtn cancel" disabled={sending} onClick={()=>sendCommand('cancel',null,`Cancel the print on ${p.name}?`)}><Square size={14}/> Cancel print</button>}
      </div>
      <div className="actionGroupRight">
       <button className="ctrlBtn emergency" disabled={sending} onClick={()=>sendCommand('emergency_stop',null,`EMERGENCY STOP (M112): Immediately halt all motors and heaters on ${p.name}. Confirm?`)}>
        <ShieldAlert size={15}/> Emergency stop
       </button>
      </div>
     </div>
    ) : (
     <div className="printerGuestNote"><Eye size={14}/> View-only access</div>
    )}
   </div>
  </div>
 );
}

function CompletedPage({data, onSync, isAdmin}){
 const [search, setSearch] = useState('');
 const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'last7' | 'custom'
 const [customDate, setCustomDate] = useState('');
 const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'failed'
 const [viewTab, setViewTab] = useState('by_file'); // 'by_file' | 'log'
 const [syncing, setSyncing] = useState(false);
 const [syncError,setSyncError]=useState('');

 const allJobs=(data?.jobs||[])
  .filter(job=>job.status!=='completed'||!String(job.id||'').startsWith(job.printerId+'_live_'))
  .map(job=>({...job,isCompleted:job.status==='completed',isFailed:job.status!=='completed'}));
 const todayStr = getLocalDateStr(new Date());
 const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
 const yesterdayStr = getLocalDateStr(yDate);
 const last7Date = new Date(); last7Date.setDate(last7Date.getDate() - 6);
 const last7Str = getLocalDateStr(last7Date);

 const completedByDay=new Map();
 for(const job of allJobs){
  if(!job.isCompleted)continue;
  const day=getLocalDateStr(job.completedAt);
  if(day>=last7Str&&day<=todayStr)completedByDay.set(day,(completedByDay.get(day)||0)+1);
 }
 const outputDays=Array.from({length:7},(_,index)=>{
  const date=new Date(last7Date);
  date.setDate(date.getDate()+index);
  const key=getLocalDateStr(date);
  return {key,label:date.toLocaleDateString([],{weekday:'short'}),count:completedByDay.get(key)||0};
 });
 const outputPeak=Math.max(1,...outputDays.map(day=>day.count));
 const weeklyOutput=outputDays.reduce((sum,day)=>sum+day.count,0);

 // Top Summary Metrics (Unmistakable piece counts!)
 const todayJobs = allJobs.filter(j => j.isCompleted && getLocalDateStr(j.completedAt) === todayStr);
 const todayPieces = todayJobs.length;

 const yesterdayJobs = allJobs.filter(j => j.isCompleted && getLocalDateStr(j.completedAt) === yesterdayStr);
 const yesterdayPieces = yesterdayJobs.length;


 const totalCompletedPieces = allJobs.filter(j => j.isCompleted).length;
 const totalFailedJobs = allJobs.filter(j => j.isFailed).length;
 const totalProductionSec = allJobs.filter(j => j.isCompleted).reduce((sum, j) => sum + (j.duration || 0), 0);

 // Filtered Jobs based on user selections
 const filteredJobs = allJobs.filter(j => {
  const dStr = getLocalDateStr(j.completedAt);
  if (datePreset === 'today' && dStr !== todayStr) return false;
  if (datePreset === 'yesterday' && dStr !== yesterdayStr) return false;
  if (datePreset === 'last7' && (dStr < last7Str || dStr > todayStr)) return false;
  if (datePreset === 'custom' && customDate && dStr !== customDate) return false;
  if (statusFilter === 'completed' && !j.isCompleted) return false;
  if (statusFilter === 'failed' && !j.isFailed) return false;
  if (search && !(j.file || '').toLowerCase().includes(search.toLowerCase())) return false;
  return true;
 });

 const filteredCompletedCount = filteredJobs.filter(j => j.isCompleted).length;
 const filteredFailedCount = filteredJobs.filter(j => j.isFailed).length;

 // Group by File: gives exactly "how many pieces of which files completed, and when"
 const fileSummaryMap = new Map();
 for (const j of filteredJobs) {
  const fn = j.file || 'Unknown File';
  if (!fileSummaryMap.has(fn)) {
   fileSummaryMap.set(fn, {
    file: fn,
    completedPieces: 0,
    failedPieces: 0,
    totalDuration: 0,
    lastCompletedAt: null,
    printers: new Set(),
    batches: 0
   });
  }
  const item = fileSummaryMap.get(fn);
  if (j.isCompleted) {
   item.completedPieces += 1;
   item.totalDuration += (j.duration || 0);
   if (!item.lastCompletedAt || new Date(j.completedAt) > new Date(item.lastCompletedAt)) {
    item.lastCompletedAt = j.completedAt;
   }
   item.batches += 1;
  } else {
   item.failedPieces += 1;
  }
  if (j.printerName) item.printers.add(j.printerName);
 }

 const fileSummaryList = Array.from(fileSummaryMap.values()).map(x => ({
  ...x,
  printers: Array.from(x.printers),
  avgDuration: x.completedPieces > 0 ? Math.round(x.totalDuration / x.completedPieces) : 0
 })).sort((a,b) => b.completedPieces - a.completedPieces || b.totalDuration - a.totalDuration);

 async function triggerSync(){
  setSyncing(true);
  setSyncError('');
  try { await onSync(); } catch(error) {setSyncError(error.message);} finally { setSyncing(false); }
 }

 function resetFilters(){
  setDatePreset('all');
  setCustomDate('');
  setStatusFilter('all');
  setSearch('');
 }

 const isByFile=viewTab==='by_file';
 const results=isByFile?fileSummaryList:filteredJobs;
 const hasFilters=datePreset!=='all'||statusFilter!=='all'||Boolean(search);
 const dateTime=value=>{
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
 };

 return (
  <div className="productionPage">
   <div className="monitorTitle">
    <div><h1>Production</h1><p>Completed prints and job history</p></div>
    {isAdmin && <div className="monitorActions"><button onClick={triggerSync} disabled={syncing}><RefreshCw size={15} className={syncing?'spin':''}/>{syncing?'Syncing…':'Sync history'}</button></div>}
   </div>
   {syncError && <p className="banner" role="alert">{syncError}</p>}
   <section className="productionTotals" aria-label="Production totals">
    {[[PackageCheck,'Today',todayPieces],[Calendar,'Yesterday',yesterdayPieces],[CheckCircle2,'Total completed',totalCompletedPieces],[AlertTriangle,'Failed / cancelled',totalFailedJobs],[Clock,'Machine time',totalProductionSec>=360000?Math.round(totalProductionSec/3600).toLocaleString()+' h':fmtDuration(totalProductionSec)]].map(([Icon,label,value])=>(
     <div key={label} className="colorMetric"><Icon size={16}/><strong>{value}</strong><span>{label}</span></div>
    ))}
   </section>
   <section className="outputChart" aria-labelledby="weekly-output-heading">
    <div className="outputChartTitle">
     <h2 id="weekly-output-heading">7-day output</h2>
     <p><strong>{weeklyOutput}</strong> completed prints</p>
    </div>
    <div className="outputChartDays">
     {outputDays.map(day=>(
      <button key={day.key} type="button" className="outputDay"
       aria-label={formatLocalDate(day.key)+', '+day.count+' completed prints'}
       aria-pressed={datePreset==='custom'&&customDate===day.key}
       onClick={()=>{setDatePreset('custom');setCustomDate(day.key);setStatusFilter('completed');}}>
       <span className="outputBarTrack"><span style={{height:(day.count/outputPeak*100)+'%'}}/></span>
       <span className="outputDayLabel">{day.label} <strong>{day.count}</strong></span>
      </button>
     ))}
    </div>
   </section>
   <section className="productionToolbar" aria-label="Filter print history">
    <div className="prodViewToggle">
     <button className={'prodViewBtn '+(isByFile?'active':'')} aria-pressed={isByFile} onClick={()=>setViewTab('by_file')}><Layers size={15}/> By file</button>
     <button className={'prodViewBtn '+(!isByFile?'active':'')} aria-pressed={!isByFile} onClick={()=>setViewTab('log')}><Clock size={15}/> Job log</button>
    </div>
    <label className="productionSearch"><Search size={15}/><input type="search" aria-label="Search G-code files" placeholder="Search G-code files" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="productionFilters">
     <select aria-label="Period" value={datePreset} onChange={e=>{setDatePreset(e.target.value);setCustomDate('')}}>
      <option value="all">All time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last7">Last 7 days</option><option value="custom">Specific date</option>
     </select>
     <select aria-label="Print status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
      <option value="all">All results</option><option value="completed">Completed</option><option value="failed">Failed / cancelled</option>
     </select>
     {datePreset==='custom' && <input type="date" aria-label="Print date" value={customDate} onChange={e=>setCustomDate(e.target.value)}/>}
    </div>
   </section>
   <div className="productionResultCount">
    <span>{results.length} {isByFile?'files':'jobs'} · {filteredCompletedCount} completed{filteredFailedCount>0?' · '+filteredFailedCount+' failed / cancelled':''}</span>
    {hasFilters && <button className="prodClearLink" onClick={resetFilters}>Reset filters</button>}
   </div>
   <section className="productionResults" aria-label={isByFile?'Prints by file':'Print job log'}>
    {results.map((result,index)=>{
     const {file}=result;
     const meta=isByFile ? dateTime(result.lastCompletedAt) : [result.printerName,dateTime(result.completedAt)].filter(Boolean).join(' · ');
     const badge=isByFile ? result.completedPieces+' completed' : result.isCompleted?'Completed':statusLabel(result.status);
     const failed=isByFile ? result.failedPieces : !result.isCompleted;
     const startedAt=result.startedAt || (result.completedAt&&result.duration ? new Date(new Date(result.completedAt).getTime()-result.duration*1000) : null);
     return (
      <details className="productionRecord" key={isByFile?file:result.id||index}>
       <summary>
        <FileText size={17} className="productionFileIcon"/>
        <span className="productionRecordName"><strong>{file||'Unknown file'}</strong><small>{meta}</small></span>
        <span className="productionRecordStatus"><b className={!isByFile&&failed?'failed':''}>{badge}</b>{isByFile&&failed>0&&<small>{failed} failed</small>}</span>
        <ChevronDown size={15} className="productionRecordChevron"/>
       </summary>
       <dl>
        {(isByFile ? [
         ['Print batches',result.batches],
         ['Average time',fmtDuration(result.avgDuration)],
         ['Machine time',fmtDuration(result.totalDuration)],
         ['Printers',result.printers.join(', ')||'—']
        ] : [
         ['Started',dateTime(startedAt)],
         ['Duration',fmtDuration(result.duration||result.totalDuration)],
         ['Filament',result.filamentUsed?Math.round(result.filamentUsed)+' mm':'—']
        ]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
       </dl>
      </details>
     );
    })}
    {!results.length && <p className="productionEmpty">No print history matches these filters.</p>}
   </section>
  </div>
 );
}

function SettingsPage({list,reload,systemInfo}){
 const[settingsTab,setSettingsTab]=useState('printers');
 const[items,setItems]=useState(list),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>setItems(list),[list]);

 // Host settings
 const[hostConfig,setHostConfig]=useState(null);
 const[hostBusy,setHostBusy]=useState(false);
 const[hostMsg,setHostMsg]=useState('');
 const[hostErr,setHostErr]=useState('');

 // Password form
 const[pwdCurrent,setPwdCurrent]=useState('');
 const[pwdNew,setPwdNew]=useState('');
 const[pwdConfirm,setPwdConfirm]=useState('');
 const[pwdBusy,setPwdBusy]=useState(false);
 const[pwdMsg,setPwdMsg]=useState('');
 const[pwdErr,setPwdErr]=useState('');

 // Telegram test
 const[tgTesting,setTgTesting]=useState(false);
 const[tgMsg,setTgMsg]=useState('');
 const[tgErr,setTgErr]=useState('');

 // Copy indicators
 const[copiedTunnel,setCopiedTunnel]=useState(false);
 const[copiedLan,setCopiedLan]=useState(false);

 const loadHostConfig = async () => {
  try {
   const data = await api('/host-settings');
   setHostConfig(data);
  } catch(e) {
   setHostErr(e.message);
  }
 };

 useEffect(() => {
  loadHostConfig();
 }, []);

 function edit(i,key,value){
  setItems(old=>old.map((p,j)=>j===i?{...p,[key]:value}:p));
 }

 async function savePrinters(){
  setBusy(true);setMessage('');
  try{
   await api('/config',{method:'PUT',body:JSON.stringify(items)});
   await reload();
   setMessage('Printer settings saved successfully! Telemetry monitoring refreshed.');
   setTimeout(()=>setMessage(''), 4000);
  }catch(e){
   setMessage('Error saving printers: ' + e.message);
  }finally{
   setBusy(false);
  }
 }

 async function saveHost(){
  if(!hostConfig) return;
  setHostBusy(true);setHostMsg('');setHostErr('');
  try{
   await api('/host-settings',{
    method:'PUT',
    body:JSON.stringify({
     farmName: hostConfig.farmName,
     primaryIp: hostConfig.primaryIp,
     pollMs: Number(hostConfig.pollMs),
     telegramToken: hostConfig.telegramToken,
     telegramChatId: hostConfig.telegramChatId,
     telegramChats: hostConfig.telegramChats,
     telegramEnabled: Boolean(hostConfig.telegramEnabled),
     telegramEvents: hostConfig.telegramEvents,
     publicTunnelUrl: hostConfig.publicTunnelUrl
    })
   });
   await loadHostConfig();
   await reload();
   setHostMsg('Host settings saved successfully!');
   setTimeout(()=>setHostMsg(''), 4000);
  }catch(e){
   setHostErr(e.message);
  }finally{
   setHostBusy(false);
  }
 }

 async function handlePasswordChange(e){
  e.preventDefault();
  setPwdMsg('');setPwdErr('');
  if(pwdNew !== pwdConfirm){
   setPwdErr('New passwords do not match');
   return;
  }
  if(pwdNew.length < 6){
   setPwdErr('New password must be at least 6 characters');
   return;
  }
  setPwdBusy(true);
  try{
   await api('/host-settings/password',{
    method:'POST',
    body:JSON.stringify({currentPassword:pwdCurrent, newPassword:pwdNew})
   });
   setPwdMsg('Admin password updated successfully!');
   setPwdCurrent('');setPwdNew('');setPwdConfirm('');
   setTimeout(()=>setPwdMsg(''), 4000);
  }catch(e){
   setPwdErr(e.message);
  }finally{
   setPwdBusy(false);
  }
 }

 const [tgDetecting, setTgDetecting] = useState(false);
 const [newChatInput, setNewChatInput] = useState('');

 function addTelegramChat(raw) {
  const val = String(raw || newChatInput || '').trim();
  if (!val) return;
  const ids = val.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (!ids.length) return;
  const cur = hostConfig?.telegramChats || [];
  const seen = new Set(cur.map(c => String(c.id)));
  const toAdd = [];
  for (const id of ids) {
   if (!seen.has(id)) {
    seen.add(id);
    toAdd.push({ id, name: 'Chat ' + id });
   }
  }
  if (toAdd.length > 0) {
   const updated = [...cur, ...toAdd];
   setHostConfig(c => ({
    ...c,
    telegramChats: updated,
    telegramChatId: updated.map(x => x.id).join(', ')
   }));
  }
  setNewChatInput('');
 }

 function removeTelegramChat(idToRemove) {
  const cur = hostConfig?.telegramChats || [];
  const updated = cur.filter(c => String(c.id) !== String(idToRemove));
  setHostConfig(c => ({
   ...c,
   telegramChats: updated,
   telegramChatId: updated.map(x => x.id).join(', ')
  }));
 }

 async function testTelegram(){
  if(!hostConfig) return;
  setTgTesting(true);setTgMsg('');setTgErr('');
  try{
   const r = await api('/host-settings/test-telegram',{
    method:'POST',
    body:JSON.stringify({
     token: hostConfig.telegramToken,
     chatId: hostConfig.telegramChatId,
     chats: hostConfig.telegramChats
    })
   });
   setTgMsg(r.message || 'Telegram test message sent successfully! Check all connected Telegram chats.');
   setTimeout(()=>setTgMsg(''), 6000);
  }catch(e){
   setTgErr(e.message);
  }finally{
   setTgTesting(false);
  }
 }

 async function detectTelegramChat(){
  if(!hostConfig?.telegramToken){
   setTgErr('Please enter the Telegram Bot Token first');
   return;
  }
  setTgDetecting(true);setTgMsg('');setTgErr('');
  try{
   const r = await api('/host-settings/detect-telegram-chat',{
    method:'POST',
    body:JSON.stringify({token:hostConfig.telegramToken})
   });
   setHostConfig(c=>({
    ...c,
    telegramChatId: r.chatId,
    telegramChats: r.allChats || r.chats
   }));
   setTgMsg(r.message || `Detected chats successfully!`);
   setTimeout(()=>setTgMsg(''), 6000);
  }catch(e){
   setTgErr(e.message);
  }finally{
   setTgDetecting(false);
  }
 }

 function copyToClipboard(text, isTunnel){
  if(navigator.clipboard && navigator.clipboard.writeText){
   navigator.clipboard.writeText(text);
  }
  if(isTunnel){
   setCopiedTunnel(true);
   setTimeout(()=>setCopiedTunnel(false), 2500);
  }else{
   setCopiedLan(true);
   setTimeout(()=>setCopiedLan(false), 2500);
  }
 }

 const sys = hostConfig?.system || {};
 const localIpList = sys.localIps || [];
 const activeLanUrl = 'http://' + (hostConfig?.primaryIp || systemInfo?.primaryIp || '172.16.20.139') + ':' + (hostConfig?.port || 3080);
 const tunnelUrl = hostConfig?.publicTunnelUrl || 'https://neptunemonitor.com';

 return (
  <div className="settings">
   {/* Settings Header & Sub-Tabs */}
   <div className="settingsHeader">
    <div className="titleRow" style={{marginBottom:'16px'}}>
     <div>
      <h1 className="fleetMainTitle" style={{marginTop:'4px'}}>Farm Settings & Host Setup</h1>
      <p className="fleetSubtitle">Configure your 3D printers, Host network bridge, remote tunnel, and alert integrations.</p>
     </div>
    </div>

    {/* Sub Navigation Tabs */}
    <nav className="settingsSubTabs" aria-label="Settings sections">
     <button 
      className={'settingsSubTab ' + (settingsTab==='printers'?'active':'')}
      aria-current={settingsTab==='printers'?'page':undefined}
      onClick={()=>setSettingsTab('printers')}
     >
      <Printer size={15}/> <span>Printers ({items.length})</span>
     </button>
     <button 
      className={'settingsSubTab ' + (settingsTab==='users'?'active':'')}
      aria-current={settingsTab==='users'?'page':undefined}
      onClick={()=>setSettingsTab('users')}
     >
      <Users size={15}/> <span>Users & Guests</span>
     </button>
     <button 
      className={'settingsSubTab ' + (settingsTab==='host'?'active':'')}
      aria-current={settingsTab==='host'?'page':undefined}
      onClick={()=>setSettingsTab('host')}
     >
      <Server size={15}/> <span>Farm host</span>
      <span className="hostStatusDot active" title="Host bridge online"/>
     </button>
    </nav>
   </div>

   {settingsTab==='printers' ? (
    <>
     <div className="titleRow" style={{marginTop:'12px',marginBottom:'14px'}}>
      <div>
       <h2 className="settingsSectionTitle">3D Printer Fleet ({items.length} configured)</h2>
       <p style={{fontSize:'12.5px',color:'#8fa2bc',margin:'3px 0 0'}}>Neptune 4 uses port <b>80</b>; standard Klipper uses <b>7125</b>.</p>
      </div>
      <button className="outline" onClick={()=>setItems(a=>[...a,{id:'printer-'+Date.now(),name:'New Neptune 4',host:'172.16.20.xxx',port:80,enabled:true}])}>
       <Plus size={15}/> Add printer
      </button>
     </div>

     <div className="card settingCard">
      {items.map((p,i)=>(
       <div key={p.id} className="settingRow">
        <div className="settingNum">{String(i+1).padStart(2,'0')}</div>
        <label className="settingName">
         Printer name
         <input value={p.name} onChange={e=>edit(i,'name',e.target.value)} placeholder="e.g. P1 - Neptune 4 Max"/>
        </label>
        <label className="settingHost">
         IP / Host
         <input value={p.host} onChange={e=>edit(i,'host',e.target.value)} placeholder="e.g. 172.16.20.125"/>
        </label>
        <label className="settingPort">
         Port
         <input type="number" min="1" max="65535" value={p.port} onChange={e=>edit(i,'port',Number(e.target.value))}/>
        </label>
        <label className="settingEmail">
         Assigned Email
         <input 
          value={p.ownerEmail||''} 
          onChange={e=>edit(i,'ownerEmail',e.target.value)} 
          placeholder="e.g. guest@example.com"
          title="Guest user email assigned to this printer (or leave blank for all)"
         />
        </label>
        <label className="enabled">
         <input type="checkbox" checked={p.enabled} onChange={e=>edit(i,'enabled',e.target.checked)}/>
         Enabled
        </label>
        <button title="Remove printer" className="iconButton deleteBtn" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))}>
         <Trash2 size={16}/>
        </button>
       </div>
      ))}

      <div className="settingActions">
       <button className="primary" onClick={savePrinters} disabled={busy}>
        {busy ? 'Saving...' : 'Save Printer Changes'}
       </button>
       {message && <span className="settingsStatusMsg">{message}</span>}
      </div>
     </div>
    </>
   ) : settingsTab==='users' ? (
    <div style={{marginTop:'14px'}}>
     <UsersManager printers={items} currentUser={systemInfo?.user}/>
    </div>
   ) : (
    /* HOST SERVER SETUP TAB */
    <div className="hostSetupWrapper">
     {hostMsg && <div className="tgFeedback success" style={{marginBottom:'14px'}}>{hostMsg}</div>}
     {hostErr && <div className="tgFeedback error" style={{marginBottom:'14px'}}>{hostErr}</div>}

     <div className="hostSetupGrid">
      {/* 1. Host Identity & Network Configuration */}
      <div className="card settingCard hostCard">
       <div className="hostCardHead">
        <div className="hostCardIconBox"><Server size={18}/></div>
        <div>
         <h3>Farm Host & Network Bridge</h3>
         <p>Local IP configuration and telemetry polling rate</p>
        </div>
       </div>

       <div className="hostFormGroup">
        <label className="hostFieldLabel">Farm Display Name</label>
        <input 
         className="hostInput" 
         value={hostConfig?.farmName||''} 
         onChange={e=>setHostConfig(c=>({...c,farmName:e.target.value}))} 
         placeholder="Neptune Print Farm"
        />
       </div>

       <div className="hostFormGroup">
        <label className="hostFieldLabel">
         Primary Host Network Interface / IP
         <small style={{display:'block',color:'#64748b',fontWeight:400}}>Other devices on Wi-Fi use this address to connect</small>
        </label>
        <select 
         className="hostSelect" 
         value={hostConfig?.primaryIp||''} 
         onChange={e=>setHostConfig(c=>({...c,primaryIp:e.target.value}))}
        >
         {localIpList.length ? (
          localIpList.map((net, idx) => (
           <option key={idx} value={net.address}>
            {net.address} ({net.interface})
           </option>
          ))
         ) : (
          <option value="172.16.20.139">172.16.20.139 (Default LAN)</option>
         )}
        </select>
       </div>

       <div className="hostFormRow">
        <div className="hostFormGroup" style={{flex:1}}>
         <label className="hostFieldLabel">Server Port</label>
         <input className="hostInput" value={hostConfig?.port||3080} readOnly disabled style={{opacity:0.8}}/>
        </div>
        <div className="hostFormGroup" style={{flex:1.5}}>
         <label className="hostFieldLabel">Telemetry Polling Rate</label>
         <select 
          className="hostSelect" 
          value={hostConfig?.pollMs||5000} 
          onChange={e=>setHostConfig(c=>({...c,pollMs:Number(e.target.value)}))}
         >
          <option value={3000}>3 seconds (Fastest update)</option>
          <option value={5000}>5 seconds (Recommended)</option>
          <option value={10000}>10 seconds (Relaxed)</option>
         </select>
        </div>
       </div>

       <div className="settingActions" style={{marginTop:'18px'}}>
        <button className="primary" onClick={saveHost} disabled={hostBusy}>
         {hostBusy ? 'Saving...' : 'Save Host Settings'}
        </button>
       </div>
      </div>

      {/* 2. Remote Access & Cloudflare Tunnel */}
      <div className="card settingCard hostCard">
       <div className="hostCardHead">
        <div className="hostCardIconBox tunnel"><Globe size={18}/></div>
        <div>
         <h3>Live Access & Remote Tunnel</h3>
         <p>Monitor your print farm securely from outside the workshop</p>
        </div>
       </div>

       <div className="tunnelStatusBadgeRow">
        <span className="tunnelLiveBadge">
         <span className="liveDot green"/> Cloudflare Tunnel Active
        </span>
        <span className="tunnelPortBadge">Port {hostConfig?.port||3080}</span>
       </div>

       <div className="hostFormGroup">
        <label className="hostFieldLabel">Public HTTPS URL (Outside Workshop)</label>
        <div className="tunnelUrlRow">
         <input 
          className="hostInput mono" 
          value={tunnelUrl} 
          onChange={e=>setHostConfig(c=>({...c,publicTunnelUrl:e.target.value}))}
          placeholder="https://neptunemonitor.com"
         />
         <button 
          className="outline copyBtn" 
          onClick={()=>copyToClipboard(tunnelUrl, true)}
          title="Copy Public Link to Clipboard"
         >
          {copiedTunnel ? <Check size={14} style={{color:'#10b981'}}/> : <Copy size={14}/>}
          <span>{copiedTunnel ? 'Copied' : 'Copy'}</span>
         </button>
         <a 
          href={tunnelUrl} 
          target="_blank" 
          rel="noreferrer" 
          className="outline openBtn"
          title="Open in new window"
         >
          <ExternalLink size={14}/>
         </a>
        </div>
        <small style={{color:'#64748b',fontSize:'11px',marginTop:'4px',display:'block'}}>
         Open this HTTPS link on any phone or remote computer. Protected by your admin password.
        </small>
       </div>

       <div className="hostFormGroup" style={{marginTop:'14px'}}>
        <label className="hostFieldLabel">Local Wi-Fi / LAN URL (Inside Workshop)</label>
        <div className="tunnelUrlRow">
         <input className="hostInput mono" value={activeLanUrl} readOnly/>
         <button 
          className="outline copyBtn" 
          onClick={()=>copyToClipboard(activeLanUrl, false)}
          title="Copy Local LAN Link"
         >
          {copiedLan ? <Check size={14} style={{color:'#10b981'}}/> : <Copy size={14}/>}
          <span>{copiedLan ? 'Copied' : 'Copy'}</span>
         </button>
        </div>
       </div>

       <div className="settingActions" style={{marginTop:'16px'}}>
        <button className="primary" onClick={saveHost} disabled={hostBusy}>
         {hostBusy ? 'Saving...' : 'Save Tunnel Link'}
        </button>
       </div>
      </div>

      {/* 3. Telegram Notifications Setup */}
      <div className="card settingCard hostCard">
       <div className="hostCardHead">
        <div className="hostCardIconBox tg"><Bell size={18}/></div>
        <div>
         <h3>Telegram Notification Bot</h3>
         <p>Instant phone alerts when prints complete, material finishes, or heaters fault</p>
        </div>
       </div>

       <div className="hostFormGroup">
        <label className="enabledCheckbox">
         <input 
          type="checkbox" 
          checked={hostConfig?.telegramEnabled!==false} 
          onChange={e=>setHostConfig(c=>({...c,telegramEnabled:e.target.checked}))}
         />
         <strong>Enable Telegram Bot Alerts</strong>
        </label>
       </div>

       <div className="hostFormGroup">
        <label className="hostFieldLabel">Telegram Bot Token</label>
        <input 
         className="hostInput mono" 
         type="password"
         value={hostConfig?.telegramToken||''} 
         onChange={e=>setHostConfig(c=>({...c,telegramToken:e.target.value}))} 
         placeholder="e.g. 1234567890:ABCdefGHIjklMNOpqrSTUvwxyz"
        />
       </div>

       <div className="hostFormGroup">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
         <label className="hostFieldLabel" style={{margin:0}}>
          Connected Telegram Chats ({hostConfig?.telegramChats?.length || (hostConfig?.telegramChatId ? hostConfig.telegramChatId.split(',').filter(Boolean).length : 0)})
         </label>
         <span style={{fontSize:'11px',color:'#38bdf8',fontWeight:500}}>All connected chats receive alerts</span>
        </div>

        <div className="tgChatsContainer">
         {hostConfig?.telegramChats && hostConfig.telegramChats.length > 0 ? (
          <div className="tgChatList">
           {hostConfig.telegramChats.map((chat) => (
            <div key={chat.id} className="tgChatChip" title={`Chat ID: ${chat.id}`}>
             <span className="chipName">{chat.name || 'User'}</span>
             <span className="chipId">{chat.id}</span>
             <button
              type="button"
              className="chipRemove"
              onClick={() => removeTelegramChat(chat.id)}
              title="Remove this chat"
             >
              ×
             </button>
            </div>
           ))}
          </div>
         ) : (
          <div className="tgEmptyChats">No chats connected yet. Auto-detect or paste one below.</div>
         )}

         <div className="tgChatControls">
          <input
           className="hostInput mono"
           value={newChatInput}
           onChange={e => setNewChatInput(e.target.value)}
           onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTelegramChat(); } }}
           placeholder="Add Chat ID (e.g. 987654321, 1151934467)"
           style={{fontSize:'12px'}}
          />
          <button
           className="outline"
           type="button"
           onClick={() => addTelegramChat()}
           disabled={!newChatInput.trim()}
           style={{whiteSpace:'nowrap',fontSize:'11.5px',padding:'6px 12px',flexShrink:0}}
          >
           + Add Chat
          </button>
          <button
           className="outline"
           type="button"
           onClick={detectTelegramChat}
           disabled={tgDetecting}
           title="Detect all new chats who recently pressed START in @vijaydreamcast_bot"
           style={{whiteSpace:'nowrap',fontSize:'11.5px',padding:'6px 12px',flexShrink:0,borderColor:'rgba(56,189,248,0.5)',color:'#38bdf8'}}
          >
           {tgDetecting ? 'Detecting...' : '⚡ Auto-Detect All Chats'}
          </button>
         </div>
        </div>

        <small style={{color:'#64748b',fontSize:'11.5px',marginTop:'7px',display:'block',lineHeight:'1.5'}}>
         💡 <b>To Connect Multiple Users or Groups:</b> Each recipient should open <a href="https://t.me/vijaydreamcast_bot" target="_blank" rel="noreferrer" style={{color:'#38bdf8',textDecoration:'underline',fontWeight:600}}>@vijaydreamcast_bot</a> in Telegram and press <b>START</b> (or add the bot to a group and send a message), then click <b>Auto-Detect All Chats</b> above.
        </small>
       </div>

       <div className="hostFormGroup">
        <label className="hostFieldLabel" style={{marginBottom:'6px'}}>Alert Triggers</label>
        <div className="tgEventsGrid">
         {[
          {key:'completed',label:'Print Completed'},
          {key:'runout',label:'Filament Runout'},
          {key:'resumed',label:'Filament Reloaded & Resumed'},
          {key:'error',label:'Shutdown / Heater Error'},
          {key:'paused',label:'Print Paused'},
          {key:'cancelled',label:'Print Cancelled / Stopped'},
          {key:'offline',label:'Offline (>5 min)'}
         ].map(ev=>(
          <label key={ev.key} className="tgEventCheck">
           <input 
            type="checkbox" 
            checked={(hostConfig?.telegramEvents||[]).includes(ev.key)}
            onChange={e=>{
             const cur = hostConfig?.telegramEvents||[];
             const updated = e.target.checked ? [...cur, ev.key] : cur.filter(x=>x!==ev.key);
             setHostConfig(c=>({...c,telegramEvents:updated}));
            }}
           />
           <span>{ev.label}</span>
          </label>
         ))}
        </div>
       </div>

       {tgMsg && <div className="tgFeedback success">{tgMsg}</div>}
       {tgErr && <div className="tgFeedback error">{tgErr}</div>}

       <div className="settingActions" style={{marginTop:'16px'}}>
        <button className="primary" onClick={saveHost} disabled={hostBusy}>
         {hostBusy ? 'Saving...' : 'Save Telegram Config'}
        </button>
        <button className="outline" onClick={testTelegram} disabled={tgTesting}>
         <Bell size={14}/> {tgTesting ? 'Sending test...' : 'Send Test Notification to All Chats'}
        </button>
       </div>
      </div>

      {/* 4. Host Security & Admin Password */}
      <div className="card settingCard hostCard">
       <div className="hostCardHead">
        <div className="hostCardIconBox pwd"><Lock size={18}/></div>
        <div>
         <h3>Admin Security & Password</h3>
         <p>Update the dashboard login password</p>
        </div>
       </div>

       <form onSubmit={handlePasswordChange}>
        <div className="hostFormGroup">
         <label className="hostFieldLabel">Current Password</label>
         <input 
          className="hostInput" 
          type="password" 
          value={pwdCurrent} 
          onChange={e=>setPwdCurrent(e.target.value)} 
          placeholder="Enter current password" 
          required
         />
        </div>

        <div className="hostFormRow">
         <div className="hostFormGroup" style={{flex:1}}>
          <label className="hostFieldLabel">New Password</label>
          <input 
           className="hostInput" 
           type="password" 
           value={pwdNew} 
           onChange={e=>setPwdNew(e.target.value)} 
           placeholder="Min 6 characters" 
           required
          />
         </div>
         <div className="hostFormGroup" style={{flex:1}}>
          <label className="hostFieldLabel">Confirm New Password</label>
          <input 
           className="hostInput" 
           type="password" 
           value={pwdConfirm} 
           onChange={e=>setPwdConfirm(e.target.value)} 
           placeholder="Repeat new password" 
           required
          />
         </div>
        </div>

        {pwdMsg && <div className="tgFeedback success">{pwdMsg}</div>}
        {pwdErr && <div className="tgFeedback error">{pwdErr}</div>}

        <div className="settingActions" style={{marginTop:'16px'}}>
         <button className="primary" type="submit" disabled={pwdBusy}>
          {pwdBusy ? 'Updating...' : 'Update Password'}
         </button>
        </div>
       </form>
      </div>

      {/* 5. Host Diagnostics & System Stats */}
      
      {/* Phone Push Notifications Card */}
      <div className="card settingCard hostCard" style={{gridColumn:'1 / -1',borderColor:'rgba(56,189,248,.35)'}}>
       <div className="hostCardHead">
        <div className="hostCardIconBox" style={{background:'rgba(56,189,248,.15)',color:'#38bdf8'}}><Bell size={18}/></div>
        <div>
         <h3>Phone Push Notifications (PWA & Android App)</h3>
         <p>Receive instant phone alerts when prints complete, material runs out, or heater errors occur</p>
        </div>
       </div>

       <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',marginBottom:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
         <span className="liveDot green"/>
         <span style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
           ? 'Push notifications are ACTIVE on this device'
           : 'Push notifications are NOT enabled on this device yet'}
         </span>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
         <button 
          className="primary" 
          type="button" 
          onClick={async()=>{
           try {
            await subscribeToWebPush(true);
            alert('🎉 Phone push notifications activated! A test alert was sent to your phone notification shade.');
           } catch(e) {
            alert('Failed to enable push: ' + (e.message || e));
           }
          }}
         >
          <Bell size={14}/> Enable Phone Push Notifications
         </button>
         <button 
          className="outline" 
          type="button" 
          onClick={async()=>{
           try {
            await subscribeToWebPush(false).catch(()=>{});
            const res = await api('/push-test', { method:'POST' });
            alert(res.message || 'Test push notification sent to your phone!');
           } catch(e) {
            alert(e.message || 'Failed to send test push.');
           }
          }}
         >
          <Send size={14}/> Send Test Push to Phone
         </button>
        </div>
       </div>
       <small style={{color:'#7f93ad',fontSize:'11.5px',lineHeight:'1.5'}}>
        💡 <b>How it works:</b> Tap "Enable Phone Push Notifications" on your Android phone. When approved, alerts will pop up in your phone's notification shade with sound and vibration even when the screen is locked!
       </small>
      </div>

<div className="card settingCard hostCard" style={{gridColumn:'1 / -1'}}>
       <div className="hostCardHead">
        <div className="hostCardIconBox diag"><Cpu size={18}/></div>
        <div>
         <h3>Host Diagnostics & Hardware Environment</h3>
         <p>Operating system, uptime, and host machine specs</p>
        </div>
       </div>

       <div className="hostDiagGrid">
        <div className="hostDiagItem">
         <span className="diagLabel">Computer Hostname</span>
         <strong className="diagVal">{sys.hostname || 'Farm-Host'}</strong>
        </div>
        <div className="hostDiagItem">
         <span className="diagLabel">Operating System</span>
         <strong className="diagVal">{sys.platform} ({sys.release})</strong>
        </div>
        <div className="hostDiagItem">
         <span className="diagLabel">CPU Architecture</span>
         <strong className="diagVal">{sys.arch} ({sys.cpus || 4} logical cores)</strong>
        </div>
        <div className="hostDiagItem">
         <span className="diagLabel">Node.js Runtime</span>
         <strong className="diagVal">{sys.nodeVersion || 'v22'}</strong>
        </div>
        <div className="hostDiagItem">
         <span className="diagLabel">Server Process Uptime</span>
         <strong className="diagVal">{fmtDuration(sys.uptimeSec || 0)}</strong>
        </div>
        <div className="hostDiagItem">
         <span className="diagLabel">RAM Memory Consumption</span>
         <strong className="diagVal">{sys.processMemRss ? Math.round(sys.processMemRss / 1024 / 1024) + ' MB / ' + Math.round((sys.totalMemBytes || 16e9) / 1024 / 1024 / 1024) + ' GB' : '—'}</strong>
        </div>
       </div>

       {localIpList.length > 0 && (
        <div className="hostNetTableWrap">
         <div className="hostNetTableTitle">Detected Network Adapters on Host:</div>
         <div className="hostNetTags">
          {localIpList.map((net, i) => (
           <span key={i} className="hostNetTag">
            <b>{net.interface}</b>: {net.address}
           </span>
          ))}
         </div>
        </div>
       )}
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function AlertsPage({events}){
 const [filter,setFilter]=useState('all');
 const relevant=events.filter(event=>filter==='all'||(filter==='issue'?['error','offline','runout','paused','failed','shutdown'].includes(event.type):event.type===filter));
 return <section className="alertsPage">
  <div className="monitorTitle">
   <div><h1>Alerts</h1><p>Printer events and status changes</p></div>
   <select aria-label="Filter alerts" value={filter} onChange={e=>setFilter(e.target.value)}>
    <option value="all">All events</option><option value="issue">Printer issues</option><option value="completed">Completed</option>
   </select>
  </div>
  <div className="alertRecords">
   {relevant.map(event=>{
    const isIssue=['error','offline','runout','paused','failed','shutdown'].includes(event.type);
    const isComplete=event.type==='completed';
    const Icon=isIssue?AlertTriangle:isComplete?PackageCheck:Activity;
    const date=new Date(event.time);
    return <article key={event.id} className={'alertRecord '+(isIssue?'is-issue':isComplete?'is-complete':'')}>
     <span className="alertIcon"><Icon size={17}/></span>
     <div><strong>{event.message}</strong><small>{String(event.type||'event').replaceAll('_',' ')}{!Number.isNaN(date.getTime())&&' · '+date.toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small></div>
    </article>;
   })}
   {!relevant.length&&<p className="productionEmpty">{events.length?'No events match this filter.':'No printer events yet.'}</p>}
  </div>
 </section>;
}

const fleetViews = [
 ['auto','Auto'],['list','List'],['tiles','Tiles'],['large','Large'],['extra-large','Extra large']
];

function App(){
 const[authed,setAuthed]=useState(null),[currentUser,setCurrentUser]=useState(null),[page,setPage]=useState('overview'),[printers,setPrinters]=useState([]),[config,setConfig]=useState([]),[events,setEvents]=useState([]),[completed,setCompleted]=useState({jobs:[],summary:[]}),[systemInfo,setSystemInfo]=useState(null),[controlPrinter,setControlPrinter]=useState(null),[error,setError]=useState(''),[refreshed,setRefreshed]=useState(null);
 const[fleetFilter,setFleetFilter]=useState('all');
 const[fleetSearch,setFleetSearch]=useState('');
 const[fleetView,setFleetView]=useState(()=>{
  try{
   const saved=localStorage.getItem('farm_fleet_view');
   return fleetViews.some(([key])=>key===saved)?saved:'auto';
  }catch{
   return 'auto';
  }
 });
 function changeFleetView(view){
  setFleetView(view);
  try{localStorage.setItem('farm_fleet_view',view)}catch{}
 }
 const[pushActive,setPushActive]=useState(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
 const[showHostStatusModal,setShowHostStatusModal]=useState(false);
 const[showSetupGuideModal,setShowSetupGuideModal]=useState(false);
 const[showConnectionModal,setShowConnectionModal]=useState(false);
 const[showUsersModal,setShowUsersModal]=useState(false);

 useEffect(()=>{
  if(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator){
   subscribeToWebPush(false).then(()=>setPushActive(true)).catch(e=>console.debug('Push auto-sync:', e));
  }
 },[]);
 const[theme,setTheme]=useState(()=>{
  try{
   return localStorage.getItem('farm_theme')||'dark';
  }catch(e){
   return 'dark';
  }
 });

 useEffect(()=>{
  document.documentElement.setAttribute('data-theme',theme);
  try{
   localStorage.setItem('farm_theme',theme);
  }catch(e){}
 },[theme]);

 const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark');

 async function refresh(){
  try{
   const [p,e,c,s]=await Promise.all([api('/printers'),api('/events'),api('/completed-prints'),api('/system-info')]);
   setPrinters(p);setEvents(e);setCompleted(c);setSystemInfo(s);setError('');setRefreshed(new Date());
   setControlPrinter(curr=>curr?p.find(x=>x.id===curr.id)||null:null);
  }catch(e){
   if(e.message==='Login required')setAuthed(false);else setError(e.message);
  }
 }

 async function loadConfig(){try{setConfig(await api('/config'))}catch(e){setError(e.message)}}
 async function syncHistory(){await api('/completed-prints/sync',{method:'POST'});await refresh()}
 async function handleClearBed(printer){
  try{
   await api('/printers/' + printer.id + '/clear-completed', { method: 'POST' });
   await refresh();
  }catch(err){
   alert('Failed to clear bed: ' + (err.message || err));
  }
 }

 async function handleFirmwareRestart(printer){
  if(!confirm('Send FIRMWARE_RESTART to ' + (printer.name || 'printer') + '? This will reset the Klipper firmware.')) return;
  try{
   await api('/printers/' + printer.id + '/control', { method: 'POST', body: JSON.stringify({ action: 'firmware_restart' }) });
   await refresh();
  }catch(err){
   alert('Failed to restart firmware: ' + (err.message || err));
  }
 }

 useEffect(()=>{
  api('/me').then(res=>{
   setAuthed(true);
   setCurrentUser(res.user);
   setPage('overview');
  }).catch(()=>{
   setAuthed(false);
   setCurrentUser(null);
   setPage('overview');
  });
 },[]);
 useEffect(()=>{
  if(!authed)return;
  refresh();
  const timer=setInterval(refresh,5000);
  return()=>clearInterval(timer);
 },[authed]);
 useEffect(()=>{
  if(authed&&currentUser?.role==='admin')loadConfig();
 },[authed,currentUser?.role]);

 useEffect(()=>{
  // Force first page to 'overview' (Printer status) on any login or user change
  if (authed) {
   setPage('overview');
  }
 }, [authed, currentUser?.id]);

 const isAdmin = currentUser?.role === 'admin';

 useEffect(()=>{
  if (authed && !isAdmin && page === 'settings') {
   setPage('overview');
  }
 }, [authed, isAdmin, page]);

 if(authed===null)return <div className="boot">Loading Neptune Print Farm…</div>;
 if(!authed)return <Login theme={theme} toggleTheme={toggleTheme} done={u=>{setCurrentUser(u);setAuthed(true);setPage('overview');}}/>;

 const isLocal = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('172.16.') ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  (systemInfo?.primaryIp && window.location.hostname === systemInfo.primaryIp) ||
  systemInfo?.isLocalClient === true
 );

 const isPrinterRunout = (p) => Boolean(
  (p.status === 'runout' || (p.filamentRunout === true && (p.status === 'printing' || p.status === 'paused'))) &&
  Boolean(p.file) &&
  p.status !== 'cancelled' &&
  p.status !== 'idle' &&
  p.status !== 'standby' &&
  p.status !== 'leveling' &&
  p.status !== 'homing' &&
  !p.isShutdown
 );
 const isPrinting=p=>p.connected&&(p.status==='printing'||p.rawState==='printing')&&!isPrinterRunout(p)&&!p.isShutdown;
 const isComplete=p=>p.status==='completed'&&p.rawState!=='cancelled';
 const hasIssue=p=>!isComplete(p)&&(isPrinterRunout(p)||['paused','error'].includes(p.status)||p.isShutdown||p.shutdownReason||
  (p.connected&&p.error&&!/timeout|offline/i.test(p.error)));
 const total=printers.length;
 const online=printers.filter(p=>p.connected).length;
 const fleetMetrics=[
  {key:'all',label:'All printers',icon:LayoutGrid,count:total,matches:()=>true},
  {key:'printing',label:'Printing',icon:Printer,count:printers.filter(isPrinting).length,matches:isPrinting},
  {key:'complete',label:'Complete',icon:CircleCheckBig,count:printers.filter(isComplete).length,matches:isComplete},
  {key:'issues',label:'Issues',icon:TriangleAlert,count:printers.filter(hasIssue).length,matches:hasIssue},
  {key:'offline',label:'Offline',icon:WifiOff,count:printers.filter(p=>p.enabled&&!p.connected&&p.status!=='connecting').length,matches:p=>p.enabled&&!p.connected&&p.status!=='connecting'}
 ];
 const finishQueue=printers.filter(printer=>isPrinting(printer)&&Number.isFinite(Date.parse(printer.eta)))
  .sort((a,b)=>Date.parse(a.eta)-Date.parse(b.eta))
  .slice(0,5);
 const nextUp=finishQueue[0];
 const activeMetric=fleetMetrics.find(metric=>metric.key===fleetFilter);
 const printerQuery=fleetSearch.trim().toLowerCase();
 const sortedPrinters=printers.filter(printer=>activeMetric.matches(printer)&&
  (!printerQuery||[printer.name,printer.file].some(value=>value?.toLowerCase().includes(printerQuery))))
  .sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'}));

 return <div className={`layout theme-${theme}`}>
  <aside>
   <button className="fleetBrand" onClick={()=>{setFleetFilter('all');setPage('overview')}}>
    <span className="logoIconBox"><BrandMark/></span>
    <span>Neptune <strong>Farm</strong></span>
   </button>
   <button className={'nav '+(page==='overview'?'active':'')} onClick={()=>setPage('overview')}>
    <LayoutGrid size={17}/> <span>Printer status</span>
   </button>
   <button className={'nav '+(page==='completed'?'active':'')} onClick={()=>setPage('completed')}>
    <PackageCheck size={17}/> <span>Production</span>
   </button>
   <button className={'nav '+(page==='alerts'?'active':'')} onClick={()=>setPage('alerts')}>
    <Bell size={17}/> <span>Alerts & events</span>
   </button>
   {isAdmin && (
    <button className={'nav '+(page==='settings'?'active':'')} onClick={()=>setPage('settings')}>
     <Settings2 size={17}/> <span>Printer settings</span>
    </button>
   )}
   <div className="asideFoot">
    <button className="fleetHostShortcut" onClick={()=>setShowHostStatusModal(true)}>
     <Server size={17}/><span><strong>Farm host</strong><small>{error?'Update delayed':systemInfo?'Connected':'Connecting…'}</small></span>
     <i className={'hostConnectionDot '+(!error&&systemInfo?'connected':'')}/>
    </button>
   </div>
  </aside>

  <main className="main">
   <header className="monitorHeader">
    <span className="monitorBrand"><span><BrandMark/></span>Neptune Farm</span>
    <nav className="farmHeaderMenus" aria-label="Farm shortcuts" onClick={event=>{
     const action=event.target.closest('.farmMenuPanel button, .farmMenuPanel a');
     if(action) action.closest('details').open=false;
    }} onKeyDown={event=>{
     const menu=event.target.closest('details[open]');
     if(event.key==='Escape' && menu){
      menu.open=false;
      menu.querySelector('summary').focus();
     }
    }}>
     <details className="farmMenu" name="farm-header">
      <summary aria-label="Connection"><Wifi size={15}/> <span>Connection</span></summary>
      <div className="farmMenuPanel">
       <div className="farmMenuHeading"><span className="liveDot green"/>{isLocal?'Local LAN':'Remote access'}</div>
       <button onClick={()=>setShowConnectionModal(true)}><Radio size={15}/> Connection details</button>
       {isLocal ? (
        <a href={systemInfo?.remoteUrl || 'https://neptunemonitor.com'}><Globe size={15}/> Switch to Remote</a>
       ) : (
        <a href={systemInfo?.localUrl || `http://${systemInfo?.primaryIp||'172.16.20.139'}:${systemInfo?.port||3080}`}><Wifi size={15}/> Switch to Local LAN</a>
       )}
       <div className="farmMenuDivider"/>
       <button onClick={()=>setShowHostStatusModal(true)}><HardDrive size={15}/> Host status</button>
       <button onClick={()=>setShowSetupGuideModal(true)}><FileText size={15}/> Setup guide</button>
      </div>
     </details>
     <details className="farmMenu" name="farm-header">
      <summary aria-label="Preferences"><Sliders size={15}/> <span className="farmPreferencesLabel">Preferences</span></summary>
      <div className="farmMenuPanel">
       <button onClick={toggleTheme}>
        {theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} {theme==='dark'?'Use light mode':'Use dark mode'}
       </button>
       <button onClick={async()=>{
        try {
         await subscribeToWebPush(true);
         setPushActive(true);
         alert('Test push notification sent to your phone.');
        } catch(e) {
         alert('Push notification alert: ' + (e.message || e));
        }
       }}><Bell size={15}/> {pushActive?'Test push alerts':'Enable push alerts'}</button>
      </div>
     </details>
     <details className="farmMenu" name="farm-header">
      <summary aria-label="Account"><Users size={15}/> <span>Account</span></summary>
      <div className="farmMenuPanel">
       <div className="farmMenuIdentity">
        <strong>{currentUser?.name || currentUser?.email || 'User'}</strong>
        {currentUser?.name && currentUser?.email && <small>{currentUser.email}</small>}
        <span className={'roleBadge '+(isAdmin?'admin':'guest')}>{isAdmin?'Admin':'Guest'}</span>
       </div>
       <div className="farmMenuDivider"/>
       {isAdmin && <button onClick={()=>setShowUsersModal(true)}><Users size={15}/> Manage users & guests</button>}
       <button className="farmMenuSignOut" onClick={async()=>{await api('/logout',{method:'POST'});setAuthed(false);setCurrentUser(null);setPage('overview')}}><LogOut size={15}/> Sign out</button>
      </div>
     </details>
    </nav>
   </header>

   <div className="mobileNav">
    {[['overview','Printers',LayoutGrid],['completed','Production',PackageCheck],['alerts','Alerts',Bell],...(isAdmin?[['settings','Settings',Settings2]]:[])].map(([key,title,Icon])=>(
     <button key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={()=>setPage(key)}><Icon size={17}/>{title}</button>
    ))}
   </div>

   {error&&<div className="banner">{error}</div>}

   {(page==='overview' || (!isAdmin && page==='settings'))?(
    <>
     <section className="fleetHero">
      <div className="fleetHeroText">
       <h1>Printer fleet</h1>
       <p><span className={'hostConnectionDot '+(!error&&online?'connected':'')}/>{error?'Updates delayed':refreshed?`${online} of ${total} printers online`:'Connecting to farm…'}{!isAdmin?' · View only':''}</p>
      </div>
      <div className="fleetHeroActions">
       <button aria-label="Refresh printer status" title="Refresh printer status" onClick={refresh}><RefreshCw size={16}/></button>
       {nextUp ? (()=>{
        const left=Math.max(0,(Date.parse(nextUp.eta)-Date.now())/1000);
        const pct=Math.max(0,Math.min(100,Math.round(nextUp.progress??0)));
        const C=2*Math.PI*16;
        return <button type="button" className="nextCompleteChip" aria-label={`Next complete: ${nextUp.name} in ${fmtDuration(left)}, ${pct}% done`} onClick={()=>setControlPrinter(nextUp)}>
         <span className="nextRing" aria-hidden="true">
          <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" className="nextRingTrack"/><circle cx="20" cy="20" r="16" className="nextRingFill" strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}/></svg>
          <span>{pct}%</span>
         </span>
         <span className="nextCompleteText">
          <small>Next complete</small>
          <span><strong>{nextUp.name}</strong> · <b>{left<60?'<1m':fmtDuration(left)}</b></span>
         </span>
        </button>;
       })() : <span className="nextCompleteChip is-idle"><span className="nextCompleteText"><small>Next complete</small><span>No active prints</span></span></span>}
      </div>
     </section>
     <div className="fleetFilterRail" role="group" aria-label="Filter printers by status">
      {fleetMetrics.map(({key,label,icon:Icon,count})=>(
       <button key={key} className={'fleetFilter metric-'+key} aria-pressed={fleetFilter===key} onClick={()=>setFleetFilter(key)}>
        <span className="fleetFilterIcon"><Icon size={16}/></span><strong>{count}</strong><span className="fleetFilterLabel">{label}</span>
       </button>
      ))}
     </div>
     <div className="fleetWorkspace" data-view={fleetView}>
      <div className="fleetWorkspaceMain">
     <div className="monitorCaption fleetViewToolbar">
      <h2>{activeMetric.label}</h2>
      <div className="fleetViewActions">
       <label className={'fleetSearch'+(printerQuery?' has-query':'')}><Search size={15}/><input aria-label="Find a printer or file" type="search" placeholder="Find a printer or file" value={fleetSearch} onChange={e=>setFleetSearch(e.target.value)}/></label>
       <span className="fleetUpdateTime"><Radio size={13}/>{error?'Update failed':refreshed?'Updated '+refreshed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Connecting…'}</span>
       <label className="fleetViewPicker">
        <Layers size={14} aria-hidden="true"/>
        <select aria-label="Printer layout" value={fleetView} onChange={e=>changeFleetView(e.target.value)}>
         {fleetViews.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select>
       </label>
      </div>
     </div>
     <section className="monitorList" data-view={fleetView}>
      {!sortedPrinters.length && <p className="monitorEmpty">{!refreshed?'Waiting for printer status…':printerQuery?'No printers or files match your search.':fleetFilter==='all'?'No printers available.':'No printers match this status.'}</p>}
      {sortedPrinters.map(p=>(
       <PrinterCard 
        key={p.id} 
        p={p} 
        isLocal={isLocal} 
        systemInfo={systemInfo} 
        onOpenControl={setControlPrinter}
        onClearBed={handleClearBed}
        onFirmwareRestart={handleFirmwareRestart}
        isAdmin={isAdmin}
       />
      ))}
     </section>
      </div>
      <section className="fleetSchedule" aria-labelledby="fleet-schedule-title">
       <div className="fleetScheduleHeader">
        <span><Clock size={17}/></span>
        <div><h2 id="fleet-schedule-title">Next finishes</h2><p>Estimated from live jobs</p></div>
       </div>
       {finishQueue.length ? <div className="fleetScheduleList">
        {finishQueue.map((printer,index)=>(
         <button type="button" className="fleetScheduleItem" key={printer.id} onClick={()=>setControlPrinter(printer)}>
          <span className={'fleetScheduleDot '+(index===0?'is-next':'')} aria-hidden="true"/>
          <span className="fleetScheduleJob">
           <span><strong>{printer.name}</strong><span className="fleetScheduleTime">{formatFinishTime(printer.eta)}</span></span>
           <small title={printer.file}>{printer.file||'Active print job'}</small>
          </span>
         </button>
        ))}
       </div> : <p className="fleetScheduleEmpty">{error?'Printer status unavailable.':'No finish times available yet.'}</p>}
       <div className="fleetScheduleFoot"><Radio size={13}/>{error?'Waiting for a live update':refreshed?'Updated '+refreshed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Connecting…'}</div>
      </section>
     </div>
    </>
   ):page==='completed'?(
    <CompletedPage data={completed} onSync={syncHistory} isAdmin={isAdmin}/>
   ):(page==='settings' && isAdmin)?(
    <SettingsPage list={config} reload={async()=>{await loadConfig();await refresh()}} systemInfo={systemInfo}/>
   ):(
    <>
     <AlertsPage events={events}/>
    </>
   )}

   {controlPrinter&&(
    <RemoteControlModal 
     p={controlPrinter} 
     isLocal={isLocal} 
     systemInfo={systemInfo} 
     onClose={()=>setControlPrinter(null)} 
     onRefresh={refresh}
     isAdmin={isAdmin}
    />
   )}

   {showHostStatusModal&&(
    <HostStatusModal
     systemInfo={systemInfo}
     total={total}
     online={online}
     onClose={()=>setShowHostStatusModal(false)}
     onOpenGuide={()=>{setShowHostStatusModal(false);setShowSetupGuideModal(true);}}
     onRefresh={refresh}
    />
   )}

   {showSetupGuideModal&&(
    <HostSetupGuideModal
     onClose={()=>setShowSetupGuideModal(false)}
     onOpenStatus={()=>{setShowSetupGuideModal(false);setShowHostStatusModal(true);}}
    />
   )}

   {showConnectionModal&&(
    <ConnectionSwitcherModal
     isLocal={isLocal}
     systemInfo={systemInfo}
     onClose={()=>setShowConnectionModal(false)}
    />
   )}

   {showUsersModal&&(
    <UsersModal
     printers={printers}
     currentUser={currentUser}
     onClose={()=>setShowUsersModal(false)}
    />
   )}
  </main>
 </div>;
}

class ErrorBoundary extends React.Component {
 constructor(props) {
  super(props);
  this.state = { hasError: false, error: null };
 }
 static getDerivedStateFromError(error) {
  return { hasError: true, error };
 }
 componentDidCatch(error, info) {
  console.error('UI Crash caught by ErrorBoundary:', error, info);
 }
 render() {
  if (this.state.hasError) {
   return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0b101b',color:'#f8fafc',fontFamily:'system-ui,sans-serif',padding:'20px'}}>
     <div style={{maxWidth:'480px',width:'100%',background:'#141d2e',border:'1px solid #dc2626',borderRadius:'14px',padding:'24px',textAlign:'center',boxShadow:'0 20px 40px rgba(0,0,0,0.5)'}}>
      <div style={{fontSize:'32px',marginBottom:'12px'}}>⚠️</div>
      <h2 style={{fontSize:'18px',fontWeight:700,color:'#f87171',marginBottom:'8px'}}>Something went wrong</h2>
      <p style={{fontSize:'13px',color:'#94a3b8',marginBottom:'20px'}}>
       {this.state.error?.message || 'An unexpected error occurred while rendering the dashboard.'}
      </p>
      <button 
       onClick={()=>window.location.reload()} 
       style={{background:'#2563eb',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'13px'}}
      >
       Refresh Dashboard
      </button>
     </div>
    </div>
   );
  }
  return this.props.children;
 }
}

createRoot(document.getElementById('root')).render(
 <ErrorBoundary>
  <App/>
 </ErrorBoundary>
);
