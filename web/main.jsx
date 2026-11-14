
import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Printer,Settings,Activity,Sparkles,LogOut,RefreshCw,AlertTriangle,CheckCircle2,Thermometer,Clock,Layers,Plus,Trash2,Bell,ShieldCheck,WifiOff,PackageCheck,CheckCheck,Search,Calendar,Filter,XCircle,TrendingUp,ExternalLink,Wifi,Globe,Radio,Server,Terminal,Play,Pause,Square,Flame,RotateCcw,Send,X,Home,ShieldAlert,Sliders,Sun,Moon,Move,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronUp,ChevronDown,Wind,Gauge,Compass,Zap,Key,Lock,Copy,Check,Cpu,HardDrive}from'lucide-react';
import './style.css';

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

const api=async(url,options={})=>{const r=await fetch('/api'+url,{credentials:'same-origin',headers:{'content-type':'application/json'},...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Request failed');return data};
const fmtDuration=n=>{if(n==null)return'—';const s=Math.max(0,Math.round(n)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),remS=s%60;if(h>0)return `${h}h ${m}m`;if(m>0)return `${m}m ${remS}s`;return `${remS}s`;};
const temp=n=>typeof n==='number'?n.toFixed(1)+'°C':'—';
const color=s=>({printing:'green',completed:'purple',idle:'blue',paused:'amber',offline:'red',error:'red',disabled:'gray',connecting:'gray',cancelled:'gray',runout:'orange',filament_runout:'orange'})[s]||'gray';

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

function PrinterCard({p,isLocal,systemInfo,onOpenControl,onClearBed,onFirmwareRestart}){
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
 const hasRunout=(p.filamentDetected===false || p.filamentRunout===true || s==='runout') && !isDone && !isShutdown;
 const isError=(effectiveStatus==='error'||s==='offline'||isShutdown) && !hasRunout;
 const hasIssue=(isError||Boolean(p.error)||isShutdown) && !hasRunout;
 const isIdle=s==='idle' && !hasRunout && !isShutdown;
 const isPaused=s==='paused' && !hasRunout && !isShutdown;
 const isPrinting=s==='printing' && !hasRunout && !isShutdown;
 const progressVal=isDone?100:Math.max(0,Math.min(100,p.progress??0));

 return (
  <article className={`fleetCard state-${effectiveStatus} ${hasRunout?'has-runout':''} ${hasIssue?'has-issue':''} ${isPrinting?'is-printing':''} ${isShutdown?'is-shutdown':''}`}>
   {/* Transparent Battery Progress Fill Layer across entire printer bar */}
   {(isPrinting||isDone||(isPaused&&progressVal>0))&&(
    <div 
     className={`fleetCardProgressFill ${isDone?'completed':''} ${isPaused?'paused':''}`} 
     style={{width:`${progressVal}%`}}
    >
     <div className="batteryGlowEdge"/>
    </div>
   )}

   {/* Orange Alert Fill for Filament Runout */}
   {hasRunout&&(
    <div className="fleetCardRunoutFill"/>
   )}

   {/* Red Alert Fill for Disconnected / Error / Issue Printers */}
   {hasIssue&&(
    <div className="fleetCardIssueFill"/>
   )}

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
        {hasRunout ? 'Filament Runout' : isShutdown ? 'Printer Shutdown' : effectiveStatus==='completed'?'Print Completed':effectiveStatus==='offline'?'Offline':effectiveStatus==='error'?'Printer Shutdown':effectiveStatus==='printing'?'Printing':effectiveStatus==='paused'?'Paused':effectiveStatus==='idle'?'Idle':effectiveStatus}
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
      {isDone ? <Sparkles size={13} style={{flexShrink:0,color:'#c084fc'}}/> : <Activity size={13} style={{flexShrink:0,opacity:.8,color:isPrinting?'#38bdf8':'#64748b'}}/>}
      <span className="fleetJobName" title={p.file||(isDone?'Print Finished':'No active G-code job')}>
       {p.file||(isDone?'Print Finished':'No active G-code job')}
      </span>
     </div>
     <div className="fleetProgressWrap">
      <div className="fleetBar">
       <div 
        className={'fleetBarFill '+(hasRunout ? 'orange' : color(s))} 
        style={{width:`${p.progress??0}%`}} 
       />
      </div>
      <span className="fleetProgressPct">{p.progress??0}%</span>
     </div>
     <div className="fleetJobFoot">
      {hasRunout ? (
       <div className="fleetTimeRow">
        <span className="fleetTimeBadge runout" title="Filament sensor triggered — spool is empty">
         <AlertTriangle size={13} className="timeIcon"/>
         <span className="timeLabel">Filament Runout:</span>
         <strong className="timeValue">{p.runoutHoldSec ? `On hold for ${fmtDuration(p.runoutHoldSec)} · Load new spool` : 'Replace with new spool'}</strong>
        </span>
        {p.remainingTime != null && (
         <span className="fleetTimeBadge remaining" title="Estimated time left once resumed">
          <Clock size={13} className="timeIcon"/>
          <span className="timeLabel">Remaining:</span>
          <strong className="timeValue">{fmtDuration(p.remainingTime)}</strong>
         </span>
        )}
       </div>
      ) : isShutdown ? (
       <div className="fleetTimeRow">
        <span className="fleetTimeBadge shutdown" title={p.shutdownReason || p.error || 'Printer is shutdown'}>
         <AlertTriangle size={13} className="timeIcon"/>
         <span className="timeLabel">Klipper Error:</span>
         <strong className="timeValue">Printer is shutdown · FIRMWARE_RESTART required</strong>
        </span>
       </div>
      ) : isPrinting ? (
       <div className="fleetTimeRow">
        {p.startedAt && (
         <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
          <Play size={12} className="timeIcon"/>
          <span className="timeLabel">Started:</span>
          <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
         </span>
        )}

        <span className="fleetTimeBadge remaining" title="Estimated time left">
         <Clock size={13} className="timeIcon"/>
         <span className="timeLabel">Remaining:</span>
         <strong className="timeValue">{p.remainingTime != null ? fmtDuration(p.remainingTime) : '—'}</strong>
        </span>

        {p.eta && (
         <span className="fleetTimeBadge completedBy" title="Estimated completion time">
          <CheckCircle2 size={13} className="timeIcon"/>
          <span className="timeLabel">Completed by:</span>
          <strong className="timeValue">{formatFinishTime(p.eta)}</strong>
         </span>
        )}

        {p.jobHoldSec > 0 && (
         <span className="fleetTimeBadge holdTime" title={`Printer held for ${fmtDuration(p.jobHoldSec)} during filament reload`}>
          <Pause size={13} className="timeIcon"/>
          <span className="timeLabel">Hold:</span>
          <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
         </span>
        )}

        {p.speedFactor && p.speedFactor !== 1 && (
         <span className="fleetTimeBadge speedFactor" title={`Printing speed override: ${Math.round(p.speedFactor * 100)}%`}>
          <Zap size={13} className="timeIcon"/>
          <span className="timeLabel">Speed:</span>
          <strong className="timeValue">{Math.round(p.speedFactor * 100)}%</strong>
         </span>
        )}
       </div>
      ) : isDone ? (
       <div className="fleetTimeRow completedRow">
        <span className="fleetTimeBadge completed" title="Print completed successfully">
         <CheckCircle2 size={13} className="timeIcon"/>
         <span className="timeLabel">Print Completed ·</span>
         <strong className="timeValue">{p.duration ? fmtDuration(p.duration) + ' total' : 'Finished'}</strong>
        </span>
        {p.jobHoldSec > 0 && (
         <span className="fleetTimeBadge holdTime" title={`Filament runout hold duration: ${fmtDuration(p.jobHoldSec)}`}>
          <Pause size={13} className="timeIcon"/>
          <span className="timeLabel">Hold:</span>
          <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
         </span>
        )}
        <button 
         className="fleetClearBedBtn" 
         onClick={(e)=>{e.stopPropagation();onClearBed&&onClearBed(p);}}
         title="Mark model removed from bed and reset printer to Idle"
        >
         <CheckCircle2 size={13}/>
         <span>Clear Bed</span>
        </button>
       </div>
      ) : isIdle ? (
       <span className="fleetTimeBadge idle">
        <span>Ready for next job</span>
       </span>
      ) : isPaused ? (
       <div className="fleetTimeRow">
        {p.startedAt && (
         <span className="fleetTimeBadge startedAt" title={`Print job started at ${formatStartTime(p.startedAt)}`}>
          <Play size={12} className="timeIcon"/>
          <span className="timeLabel">Started:</span>
          <strong className="timeValue">{formatStartTime(p.startedAt)}</strong>
         </span>
        )}

        <span className="fleetTimeBadge paused">
         <Pause size={13} className="timeIcon"/>
         <span className="timeLabel">Paused ·</span>
         <strong className="timeValue">{p.remainingTime != null ? fmtDuration(p.remainingTime) : '—'} left</strong>
        </span>

        {p.eta && (
         <span className="fleetTimeBadge completedBy">
          <span className="timeLabel">Completed by:</span>
          <strong className="timeValue">{formatFinishTime(p.eta)}</strong>
         </span>
        )}

        {p.jobHoldSec > 0 && (
         <span className="fleetTimeBadge holdTime" title={`Filament runout hold duration: ${fmtDuration(p.jobHoldSec)}`}>
          <Pause size={13} className="timeIcon"/>
          <span className="timeLabel">Hold:</span>
          <strong className="timeValue">{fmtDuration(p.jobHoldSec)}</strong>
         </span>
        )}

        {p.speedFactor && p.speedFactor !== 1 && (
         <span className="fleetTimeBadge speedFactor" title={`Printing speed override: ${Math.round(p.speedFactor * 100)}%`}>
          <Zap size={13} className="timeIcon"/>
          <span className="timeLabel">Speed:</span>
          <strong className="timeValue">{Math.round(p.speedFactor * 100)}%</strong>
         </span>
        )}
       </div>
      ) : (
       <span className="fleetTimeBadge standby">Standby</span>
      )}
     </div>
    </div>

    {/* Col 3: Telemetry Metrics */}
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

    {/* Col 4: Badges & Action Buttons */}
    <div className="fleetCol actions">
     {isShutdown&&(
      <button 
       className="fleetBtn restart" 
       onClick={()=>onFirmwareRestart&&onFirmwareRestart(p)}
       title="Send FIRMWARE_RESTART to reset Klipper firmware"
      >
       <RotateCcw size={13}/>
       <span>Firmware Restart</span>
      </button>
     )}
     {isDone&&(
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
      <span className="fleetRunoutBadge orange" title={`Filament runout detected! ${p.runoutHoldSec ? `On hold for ${fmtDuration(p.runoutHoldSec)}` : ''}`}>{p.runoutHoldSec ? `HOLD ${fmtDuration(p.runoutHoldSec)} · LOAD SPOOL` : 'REPLACE FILAMENT'}</span>
     )}
     {p.enabled&&(
      <button 
       className="fleetBtn control" 
       onClick={()=>onOpenControl(p)}
       title="Remote controls, emergency actions & terminal console"
      >
       <Sliders size={13}/>
       <span>Control</span>
      </button>
     )}
     {printerUrl&&(
      isLocal ? (
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
      ) : (
       <button
        type="button"
        className="fleetBtn webui remote"
        onClick={()=>onOpenControl(p)}
        title={`Remote Access: Open ${p.name} live elements & controls (Fluidd direct link requires local farm Wi-Fi)`}
       >
        <Layers size={13}/>
        <span>Remote UI</span>
       </button>
      )
     )}
    </div>
   </div>

   {/* Filament Runout Banner with Step-by-Step Instructions */}
   {hasRunout&&(
    <div className="fleetFilamentBanner">
     <AlertTriangle size={16} className="fleetFilamentIcon"/>
     <div className="fleetFilamentContent" style={{flex:1}}>
      <strong>⚠️ Filament Runout Detected — Print Paused</strong>
      <span>
       {p.runoutHoldSec ? `Printer has been on hold for ${fmtDuration(p.runoutHoldSec)}. ` : ''}
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

   {/* Print Completed Banner */}
   {isDone&&(
    <div className="fleetCompletedBanner">
     <Sparkles size={16} className="fleetCompletedIcon"/>
     <div className="fleetCompletedContent">
      <strong>🎉 Print Finished Successfully! Ready to clear bed</strong>
      <span>
       {p.file ? `Model "${p.file}" has finished printing.` : 'Print job completed.'} Remove printed model from build plate and click <b>Clear Bed</b> when ready.
      </span>
     </div>
     <button 
      className="fleetClearBedBannerBtn"
      onClick={()=>onClearBed&&onClearBed(p)}
     >
      <CheckCircle2 size={14}/>
      <span>Clear Bed</span>
     </button>
    </div>
   )}

   {/* Error / Offline / Shutdown Banner */}
   {isError&&(
    <div className={`fleetErrorBanner ${isShutdown ? 'is-shutdown' : ''}`}>
     <AlertTriangle size={16} className="fleetErrorIcon"/>
     <div className="fleetErrorContent">
      <strong>{isShutdown ? '🚨 Printer is shutdown (Klipper Error)' : "Can't reach this printer"}</strong>
      <span className="fleetErrorMsg">
       {p.shutdownReason || p.error || `Connection timed out while contacting Moonraker at ${p.host}:${p.port}. Check the printer power, IP address, and Moonraker port.`}
      </span>
     </div>
     {isShutdown&&(
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

function RemoteControlModal({p,isLocal,systemInfo,onClose,onRefresh}){
 const hasRunout = Boolean(p.filamentDetected === false || p.filamentRunout === true || p.status === 'runout');
 const [logs,setLogs]=useState([]);
 const [cmd,setCmd]=useState('');
 const [sending,setSending]=useState(false);
 const [feedback,setFeedback]=useState(null);
 const [autoScroll,setAutoScroll]=useState(true);
 const [modalTab,setModalTab]=useState(()=>hasRunout ? 'fan' : 'jog'); // 'jog' | 'temp' | 'fan' | 'terminal'
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
   setTimeout(loadLogs,500);
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
    {/* Header */}
    <div className="modalHeader">
     <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
      <div className="printerIcon" style={{width:'40px',height:'40px',borderRadius:'10px',background:'#132238',display:'grid',placeItems:'center',color:'#38bdf8'}}>
       <Printer size={20}/>
      </div>
      <div>
       <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <h2 style={{fontSize:'18px',margin:0,color:'#fff',fontWeight:800}}>{p.name}</h2>
        <span className={'pill '+color(s)} style={{fontSize:'10px',padding:'2px 8px'}}><i/>{s}</span>
       </div>
       <div style={{fontSize:'11.5px',color:'#7f94b0',marginTop:'2px'}}>
        {p.host}:{p.port||80} · {isLocal?'Direct LAN Link':'Relayed via Farm Host'} · Fluidd / Klipper
       </div>
      </div>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      {printerUrl&&(
       <a href={printerUrl} target="_blank" rel="noreferrer" className="outline" style={{padding:'5px 10px',fontSize:'11.5px',gap:'5px'}} title="Open Fluidd Web Interface">
        <ExternalLink size={13}/> Web UI
       </a>
      )}
      <button className="iconButton" onClick={onClose} title="Close"><X size={18}/></button>
     </div>
    </div>

    {/* Live Telemetry Summary Strip */}
    <div className="controlStatsBar">
     <div>
      <span>Nozzle</span>
      <strong style={{color:'#f8fafc'}}>{temp(p.nozzle)}{p.nozzleTarget?` / ${p.nozzleTarget}°C`:' (Off)'}</strong>
     </div>
     <div>
      <span>Heatbed</span>
      <strong style={{color:'#f8fafc'}}>{temp(p.bed)}{p.bedTarget?` / ${p.bedTarget}°C`:' (Off)'}</strong>
     </div>
     <div>
      <span>Current Job</span>
      <strong title={p.file||'None'} style={{maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block'}}>
       {p.file||'No active job'}
      </strong>
     </div>
     <div>
      <span>Progress</span>
      <strong style={{color:'#34d399'}}>{p.progress??0}%</strong>
     </div>
     <div>
      <span>Remaining</span>
      <strong style={{color:'#38bdf8'}}>{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'}</strong>
     </div>
    </div>

    {/* Action Feedback Banner */}
    {feedback&&(
     <div className={'ctrlFeedback '+(feedback.type==='error'?'error':'success')}>
      {feedback.type==='error'?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}
      <span>{feedback.text}</span>
     </div>
    )}

    {/* Filament Runout Alert Banner inside Control Modal */}
    {hasRunout&&(
     <div style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:'10px',margin:'10px 18px 0',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
       <div style={{display:'flex',alignItems:'center',gap:'8px',color:'#fbbf24',fontWeight:700,fontSize:'13px'}}>
        <AlertTriangle size={16}/>
        <span>Filament Runout Active — Print Paused</span>
       </div>
       <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        <button 
         className="chipBtn" 
         disabled={sending} 
         onClick={()=>sendCommand('gcode','M104 S210')}
         style={{fontSize:'11px',padding:'4px 10px'}}
        >
         <Flame size={12} color="#fbbf24"/> Preheat 210°C
        </button>
        <button 
         className="ctrlBtn resume" 
         disabled={sending} 
         onClick={()=>sendCommand('resume')}
         style={{fontSize:'11px',padding:'4px 12px'}}
        >
         <Play size={12}/> Resume Print
        </button>
       </div>
      </div>
      <p style={{margin:0,fontSize:'11.5px',color:'#cbd5e1',lineHeight:1.5}}>
       Spool is empty. To replace: preheat nozzle, load fresh filament into sensor, purge nozzle in <b>Extruder & Fan</b> tab, then click Resume Print.
      </p>
     </div>
    )}

    {/* Modal Navigation Tabs */}
    <div className="ctrlTabsBar">
     <button className={'ctrlTabBtn '+(modalTab==='jog'?'active':'')} onClick={()=>setModalTab('jog')}>
      <Compass size={14}/> Jog & Motion
     </button>
     <button className={'ctrlTabBtn '+(modalTab==='temp'?'active':'')} onClick={()=>setModalTab('temp')}>
      <Flame size={14}/> Temperatures & Preheats
     </button>
     <button className={'ctrlTabBtn '+(modalTab==='fan'?'active':'')} onClick={()=>setModalTab('fan')}>
      <Wind size={14}/> Extruder & Fan
     </button>
     <button className={'ctrlTabBtn '+(modalTab==='terminal'?'active':'')} onClick={()=>setModalTab('terminal')}>
      <Terminal size={14}/> Console Terminal
     </button>
     <button className={'ctrlTabBtn '+(modalTab==='elements'?'active':'')} onClick={()=>setModalTab('elements')}>
      <Layers size={14}/> All Elements & Fluidd
     </button>
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

        {/* Quick Homing Chips */}
        <div className="homingChipsRow">
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 X')}>Home X</button>
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 Y')}>Home Y</button>
         <button className="chipBtn" disabled={sending} onClick={()=>sendCommand('gcode','G28 Z')}>Home Z</button>
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
       
       <ol style={{margin:'0 0 12px 0',paddingLeft:'18px',fontSize:'12.5px',color:'#cbd5e1',lineHeight:1.65,display:'flex',flexDirection:'column',gap:'6px'}}>
        <li>
         <strong style={{color:'#f8fafc'}}>Step 1: Preheat Nozzle</strong> — Ensure nozzle is heated above 180°C (PLA: 205°C–215°C, PETG: 230°C–240°C). Cold extrusion is blocked by firmware safety limits.
        </li>
        <li>
         <strong style={{color:'#f8fafc'}}>Step 2: Unload Old Filament</strong> — Press the extruder release tension lever and gently pull remaining filament strand out of the PTFE tube and runout sensor.
        </li>
        <li>
         <strong style={{color:'#f8fafc'}}>Step 3: Insert New Spool</strong> — Snip the new filament tip cleanly at a 45° angle. Feed through the runout sensor until it engages into the extruder drive gears.
        </li>
        <li>
         <strong style={{color:'#f8fafc'}}>Step 4: Purge Old Color</strong> — Click <b>Extrude 25mm</b> once or twice above until new filament flows cleanly from the nozzle tip with consistent solid color.
        </li>
        <li>
         <strong style={{color:'#f8fafc'}}>Step 5: Resume Printing</strong> — Remove any purged plastic from the nozzle tip and click <b>Resume Print</b> to seamlessly continue your print job!
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

    {/* TAB 4: TERMINAL CONSOLE */}
    {modalTab==='terminal'&&(
     <div className="ctrlTabContent" style={{padding:'0 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'12px 0 6px'}}>
       <span style={{fontSize:'12px',fontWeight:700,color:'#cbd5e1'}}>Live Moonraker G-Code Console</span>
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
        placeholder="Type custom G-code (e.g. G28, M104 S210, M117 Printing)..." 
        value={cmd} 
        onChange={e=>setCmd(e.target.value)} 
        disabled={sending}
       />
       <button type="submit" className="primary" disabled={sending||!cmd.trim()}>
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
        <span className="elementLabel"><CheckCircle2 size={13}/> Estimated Completion</span>
        <strong className="elementVal">{p.eta ? formatFinishTime(p.eta) : '—'}</strong>
        <small className="elementSub">{p.remainingTime != null ? `${fmtDuration(p.remainingTime)} remaining` : 'No ETA available'}</small>
       </div>
       <div className="elementCard">
        <span className="elementLabel"><Pause size={13}/> Filament Hold Duration</span>
        <strong className="elementVal" style={{color: p.jobHoldSec > 0 ? '#fbbf24' : '#94a3b8'}}>
         {p.jobHoldSec > 0 ? fmtDuration(p.jobHoldSec) : '0s (No hold)'}
        </strong>
        <small className="elementSub">{p.jobHoldSec > 0 ? 'Total runout pause time during this print' : 'No filament runouts occurred'}</small>
       </div>
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
        <strong className="elementVal" style={{color: p.filamentDetected !== false ? '#34d399' : '#f97316'}}>
         {p.filamentDetected !== false ? 'Filament Detected (OK)' : 'Runout Detected (Empty)'}
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
         {printerUrl && (
          <a href={printerUrl} target="_blank" rel="noreferrer" className="primary" style={{padding:'5px 14px',fontSize:'12px',display:'inline-flex',alignItems:'center',gap:'6px'}}>
           <ExternalLink size={13}/> Open Native Fluidd Web UI
          </a>
         )}
        </div>
       ) : (
        <div style={{fontSize:'12px',color:'#cbd5e1',lineHeight:1.6,marginTop:'6px',background:'rgba(15,23,42,0.6)',padding:'10px 12px',borderRadius:'8px',border:'1px solid #1e293b'}}>
         <span>🔒 <b>Remote Internet Access:</b> When accessing the farm remotely over <code>https://neptunemonitor.com</code>, all Klipper elements, telemetry, axis controls, temperatures, filament commands, and console terminal logs are relayed live through this dashboard. Native Fluidd direct links require opening your browser on the local farm Wi-Fi network.</span>
        </div>
       )}
      </div>
     </div>
    )}

    {/* Persistent Print & Safety Action Bar */}
    <div className="modalFooterActions">
     <div className="actionGroupLeft">
      <button className="ctrlBtn pause" disabled={sending} onClick={()=>sendCommand('pause')}>
       <Pause size={14}/> Pause
      </button>
      <button className="ctrlBtn resume" disabled={sending} onClick={()=>sendCommand('resume')}>
       <Play size={14}/> Resume
      </button>
      <button className="ctrlBtn cancel" disabled={sending} onClick={()=>sendCommand('cancel',null,`Are you sure you want to CANCEL the print on ${p.name}?`)}>
       <Square size={14}/> Cancel Print
      </button>
     </div>
     <div className="actionGroupRight">
      <button className="ctrlBtn emergency" disabled={sending} onClick={()=>sendCommand('emergency_stop',null,`EMERGENCY STOP (M112): Immediately halt all motors and heaters on ${p.name}. Confirm?`)}>
       <ShieldAlert size={15}/> EMERGENCY STOP (M112)
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}

function CompletedPage({data, onSync, printers=[]}){
 const [search, setSearch] = useState('');
 const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'last7' | 'custom'
 const [customDate, setCustomDate] = useState('');
 const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'failed'
 const [viewTab, setViewTab] = useState('by_file'); // 'by_file' | 'log'
 const [syncing, setSyncing] = useState(false);

 const allJobs = data?.jobs || [];
 const todayStr = getLocalDateStr(new Date());
 const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
 const yesterdayStr = getLocalDateStr(yDate);
 const last7Date = new Date(); last7Date.setDate(last7Date.getDate() - 7);
 const last7Str = getLocalDateStr(last7Date);

 // Top Summary Metrics (Unmistakable piece counts!)
 const todayJobs = allJobs.filter(j => j.isCompleted && getLocalDateStr(j.completedAt) === todayStr);
 const todayPieces = todayJobs.length;

 const yesterdayJobs = allJobs.filter(j => j.isCompleted && getLocalDateStr(j.completedAt) === yesterdayStr);
 const yesterdayPieces = yesterdayJobs.length;

 const last7Jobs = allJobs.filter(j => j.isCompleted && getLocalDateStr(j.completedAt) >= last7Str);
 const last7Pieces = last7Jobs.length;

 const totalCompletedPieces = allJobs.filter(j => j.isCompleted).length;
 const totalFailedJobs = allJobs.filter(j => j.isFailed).length;
 const totalProductionSec = allJobs.filter(j => j.isCompleted).reduce((sum, j) => sum + (j.duration || 0), 0);

 // Filtered Jobs based on user selections
 const filteredJobs = allJobs.filter(j => {
  const dStr = getLocalDateStr(j.completedAt);
  if (datePreset === 'today' && dStr !== todayStr) return false;
  if (datePreset === 'yesterday' && dStr !== yesterdayStr) return false;
  if (datePreset === 'last7' && dStr < last7Str) return false;
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
    completionTimestamps: []
   });
  }
  const item = fileSummaryMap.get(fn);
  if (j.isCompleted) {
   item.completedPieces += 1;
   item.totalDuration += (j.duration || 0);
   if (!item.lastCompletedAt || new Date(j.completedAt) > new Date(item.lastCompletedAt)) {
    item.lastCompletedAt = j.completedAt;
   }
   item.completionTimestamps.push(j.completedAt);
  } else {
   item.failedPieces += 1;
  }
  if (j.printerName) item.printers.add(j.printerName);
 }

 const fileSummaryList = Array.from(fileSummaryMap.values()).map(x => ({
  ...x,
  printers: Array.from(x.printers),
  avgDuration: x.completedPieces > 0 ? Math.round(x.totalDuration / x.completedPieces) : 0,
  completionTimestamps: x.completionTimestamps.sort((a,b) => new Date(b) - new Date(a))
 })).sort((a,b) => b.completedPieces - a.completedPieces || b.totalDuration - a.totalDuration);

 async function triggerSync(){
  setSyncing(true);
  try { await onSync(); } finally { setSyncing(false); }
 }

 function resetFilters(){
  setDatePreset('all');
  setCustomDate('');
  setStatusFilter('all');
  setSearch('');
 }

 return (
  <div className="completedPage">
   {/* Header */}
   <div className="fleetPageHeader">
    <div className="fleetTitleWrap">
     <span className="fleetCategoryTag">PRODUCTION MANAGEMENT</span>
     <h1 className="fleetMainTitle">Production & Completed Prints</h1>
     <p className="fleetSubtitle">
      Track completed pieces, exact completion times, and output quantity by G-code file.
     </p>
    </div>
    <div className="fleetHeaderActions">
     <button className="fleetRefreshBtn" onClick={triggerSync} disabled={syncing} title="Sync printer history from Moonraker">
      <RefreshCw size={15} className={syncing ? 'spin' : ''}/> {syncing ? 'Syncing…' : 'Sync History'}
     </button>
    </div>
   </div>

   {/* 4 Clean, High-Impact Summary KPI Cards */}
   <div className="prodSummaryStrip">
    <div className="prodSummaryCard today">
     <div className="summaryCardIcon"><PackageCheck size={24}/></div>
     <div className="summaryCardBody">
      <span className="summaryCardLabel">TODAY'S OUTPUT</span>
      <strong className="summaryCardValue">{todayPieces} <span className="unit">pieces</span></strong>
      <small className="summaryCardSub">Finished today ({formatLocalDate(todayStr)})</small>
     </div>
    </div>

    <div className="prodSummaryCard yesterday">
     <div className="summaryCardIcon"><Calendar size={24}/></div>
     <div className="summaryCardBody">
      <span className="summaryCardLabel">YESTERDAY</span>
      <strong className="summaryCardValue">{yesterdayPieces} <span className="unit">pieces</span></strong>
      <small className="summaryCardSub">Finished yesterday</small>
     </div>
    </div>

    <div className="prodSummaryCard total">
     <div className="summaryCardIcon"><CheckCircle2 size={24}/></div>
     <div className="summaryCardBody">
      <span className="summaryCardLabel">TOTAL COMPLETED</span>
      <strong className="summaryCardValue">{totalCompletedPieces} <span className="unit">pieces</span></strong>
      <small className="summaryCardSub">{totalFailedJobs > 0 ? `${totalFailedJobs} failed / cancelled` : 'All prints successful'}</small>
     </div>
    </div>

    <div className="prodSummaryCard time">
     <div className="summaryCardIcon"><Gauge size={24}/></div>
     <div className="summaryCardBody">
      <span className="summaryCardLabel">TOTAL MACHINE RUNTIME</span>
      <strong className="summaryCardValue">{fmtDuration(totalProductionSec)}</strong>
      <small className="summaryCardSub">Active successful print duration</small>
     </div>
    </div>
   </div>

   {/* Filter & View Mode Controls Bar */}
   <div className="prodControlCard card">
    <div className="prodControlRow">
     {/* View Toggle */}
     <div className="prodViewToggle">
      <button 
       className={'prodViewBtn ' + (viewTab === 'by_file' ? 'active' : '')} 
       onClick={() => setViewTab('by_file')}
       title="View total completed pieces summarized by each G-code file"
      >
       <Layers size={15}/>
       <span>Pieces by File ({fileSummaryList.length})</span>
      </button>
      <button 
       className={'prodViewBtn ' + (viewTab === 'log' ? 'active' : '')} 
       onClick={() => setViewTab('log')}
       title="Chronological timeline of all completed jobs with exact date and time"
      >
       <Clock size={15}/>
       <span>Completed Log ({filteredJobs.length})</span>
      </button>
     </div>

     {/* Search Box */}
     <div className="prodSearchBox">
      <Search size={15}/>
      <input 
       type="text" 
       placeholder="Search G-code file name…" 
       value={search} 
       onChange={e => setSearch(e.target.value)}
      />
      {search && (
       <button className="prodClearInputBtn" onClick={() => setSearch('')} title="Clear search">
        <X size={13}/>
       </button>
      )}
     </div>
    </div>

    {/* Date & Status Filter Pills */}
    <div className="prodFilterPillsRow">
     <div className="filterGroup">
      <span className="filterGroupLabel"><Calendar size={13}/> Period:</span>
      <button 
       className={'filterPill ' + (datePreset === 'all' && !customDate ? 'active' : '')} 
       onClick={() => { setDatePreset('all'); setCustomDate(''); }}
      >
       All Time ({totalCompletedPieces})
      </button>
      <button 
       className={'filterPill ' + (datePreset === 'today' ? 'active' : '')} 
       onClick={() => { setDatePreset('today'); setCustomDate(''); }}
      >
       Today ({todayPieces})
      </button>
      <button 
       className={'filterPill ' + (datePreset === 'yesterday' ? 'active' : '')} 
       onClick={() => { setDatePreset('yesterday'); setCustomDate(''); }}
      >
       Yesterday ({yesterdayPieces})
      </button>
      <button 
       className={'filterPill ' + (datePreset === 'last7' ? 'active' : '')} 
       onClick={() => { setDatePreset('last7'); setCustomDate(''); }}
      >
       Last 7 Days ({last7Pieces})
      </button>
      <input
       type="date"
       className="prodDateInput"
       value={customDate}
       onChange={e => {
        if(e.target.value){
         setCustomDate(e.target.value);
         setDatePreset('custom');
        } else {
         setDatePreset('all');
         setCustomDate('');
        }
       }}
       title="Pick specific date"
      />
     </div>

     <div className="filterGroup statusGroup">
      <span className="filterGroupLabel">Status:</span>
      <button 
       className={'filterPill ' + (statusFilter === 'all' ? 'active' : '')} 
       onClick={() => setStatusFilter('all')}
      >
       All
      </button>
      <button 
       className={'filterPill success ' + (statusFilter === 'completed' ? 'active' : '')} 
       onClick={() => setStatusFilter('completed')}
      >
       Completed ({allJobs.filter(j=>j.isCompleted).length})
      </button>
      {totalFailedJobs > 0 && (
       <button 
        className={'filterPill danger ' + (statusFilter === 'failed' ? 'active' : '')} 
        onClick={() => setStatusFilter('failed')}
       >
        Failed ({totalFailedJobs})
       </button>
      )}
      {(datePreset !== 'all' || customDate || statusFilter !== 'all' || search) && (
       <button className="prodResetBtn" onClick={resetFilters}>
        <RotateCcw size={12}/> Reset Filters
       </button>
      )}
     </div>
    </div>
   </div>

   {/* Active Filter Summary Bar */}
   {(datePreset !== 'all' || customDate || statusFilter !== 'all' || search) && (
    <div className="prodActiveNotice">
     <span>
      Filtered Output: <b>{filteredCompletedCount} pieces completed</b>
      {filteredFailedCount > 0 && <span style={{color:'#f87171'}}> · {filteredFailedCount} failed</span>}
      {' '}for <b>
       {datePreset === 'today' ? `Today (${formatLocalDate(todayStr)})` :
        datePreset === 'yesterday' ? `Yesterday (${formatLocalDate(yesterdayStr)})` :
        datePreset === 'last7' ? 'Last 7 Days' :
        customDate ? formatLocalDate(customDate) : 'Selected Criteria'}
      </b>
     </span>
     <button className="prodClearLink" onClick={resetFilters}>Show All Time</button>
    </div>
   )}

   {/* VIEW 1: PIECES BY FILE */}
   {viewTab === 'by_file' && (
    <div className="card prodTableCard">
     <div className="prodTableHeader">
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
       <Layers size={17} style={{color:'#38bdf8'}}/>
       <h3 style={{margin:0,fontSize:'15px',fontWeight:800,color:'#f8fafc'}}>
        Pieces Completed by File Name
       </h3>
      </div>
      <span style={{fontSize:'12px',color:'#7f94b0'}}>
       Total distinct G-code models: <b>{fileSummaryList.length}</b> · Completed: <b>{filteredCompletedCount} pcs</b>
      </span>
     </div>

     <div className="tableWrapper">
      <table className="prodCleanTable">
       <thead>
        <tr>
         <th style={{minWidth:'260px'}}>G-Code File Name</th>
         <th style={{textAlign:'center',width:'140px'}}>Pieces Completed</th>
         <th style={{minWidth:'170px'}}>When Completed (Last Finished)</th>
         <th style={{minWidth:'120px'}}>Avg Time / Piece</th>
         <th style={{minWidth:'130px'}}>Total Machine Time</th>
         <th style={{minWidth:'160px'}}>Printers Used</th>
         <th style={{textAlign:'center',width:'100px'}}>Status</th>
        </tr>
       </thead>
       <tbody>
        {fileSummaryList.length > 0 ? fileSummaryList.map(item => (
         <tr key={item.file}>
          {/* File Name */}
          <td>
           <div className="prodFileNameWrap">
            <span className="prodFileIcon">📄</span>
            <strong className="prodFileName" title={item.file}>{item.file}</strong>
           </div>
          </td>

          {/* Pieces Completed */}
          <td style={{textAlign:'center'}}>
           {item.completedPieces > 0 ? (
            <span className="prodPiecePill">
             <CheckCircle2 size={13}/>
             <strong>{item.completedPieces} pcs</strong>
            </span>
           ) : (
            <span style={{color:'#64748b'}}>0 pcs</span>
           )}
          </td>

          {/* When Completed */}
          <td>
           {item.lastCompletedAt ? (
            <div>
             <span className="prodFinishTime">
              {new Date(item.lastCompletedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
             </span>
             {item.completionTimestamps.length > 1 && (
              <small className="prodFinishSub">
               ({item.completionTimestamps.length} total batches finished)
              </small>
             )}
            </div>
           ) : (
            <span style={{color:'#64748b'}}>—</span>
           )}
          </td>

          {/* Avg Duration */}
          <td>
           <span className="prodTimeVal">{item.avgDuration > 0 ? fmtDuration(item.avgDuration) : '—'}</span>
          </td>

          {/* Total Duration */}
          <td>
           <span className="prodTimeVal bold">{fmtDuration(item.totalDuration)}</span>
          </td>

          {/* Printers Used */}
          <td>
           <div className="prodPrinterPillsWrap">
            {item.printers.map(pr => (
             <span key={pr} className="prodPrinterBadge">{pr}</span>
            ))}
           </div>
          </td>

          {/* Result / Failure */}
          <td style={{textAlign:'center'}}>
           {item.failedPieces > 0 ? (
            <span className="prodFailTag">{item.failedPieces} failed</span>
           ) : (
            <span className="prodSuccessTag">100% OK</span>
           )}
          </td>
         </tr>
        )) : (
         <tr>
          <td colSpan="7" className="prodEmptyCell">
           <PackageCheck size={28} style={{color:'#475569',margin:'0 auto 8px',display:'block'}}/>
           <strong>No completed prints found matching your filter.</strong>
           <span>Try selecting "All Time" or resetting the search filter.</span>
          </td>
         </tr>
        )}
       </tbody>
      </table>
     </div>
    </div>
   )}

   {/* VIEW 2: COMPLETED PRINTS TIMELINE LOG */}
   {viewTab === 'log' && (
    <div className="card prodTableCard">
     <div className="prodTableHeader">
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
       <Clock size={17} style={{color:'#34d399'}}/>
       <h3 style={{margin:0,fontSize:'15px',fontWeight:800,color:'#f8fafc'}}>
        Completed Prints Chronological Log
       </h3>
      </div>
      <span style={{fontSize:'12px',color:'#7f94b0'}}>
       Showing <b>{filteredJobs.length}</b> print events in chronological order
      </span>
     </div>

     <div className="tableWrapper">
      <table className="prodCleanTable">
       <thead>
        <tr>
         <th style={{minWidth:'170px'}}>Completed Date & Time</th>
         <th style={{minWidth:'240px'}}>File Name</th>
         <th style={{minWidth:'150px'}}>Printer</th>
         <th style={{minWidth:'120px'}}>Duration</th>
         <th style={{minWidth:'110px'}}>Filament</th>
         <th style={{textAlign:'center',width:'110px'}}>Result</th>
        </tr>
       </thead>
       <tbody>
        {filteredJobs.length > 0 ? filteredJobs.map((j, idx) => (
         <tr key={j.id || idx}>
          {/* Completed Timestamp */}
          <td>
           <div className="prodLogTimeWrap">
            <Calendar size={13} style={{color:'#60a5fa',flexShrink:0}}/>
            <strong className="prodLogTime">
             {new Date(j.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </strong>
           </div>
          </td>

          {/* File Name */}
          <td>
           <strong className="prodFileName" title={j.file}>{j.file}</strong>
          </td>

          {/* Printer */}
          <td>
           <span className="prodPrinterBadge">{j.printerName || 'Printer'}</span>
          </td>

          {/* Duration */}
          <td>
           <span className="prodTimeVal">{fmtDuration(j.duration)}</span>
          </td>

          {/* Filament */}
          <td>
           <span style={{color:'#94a3b8',fontSize:'12.5px'}}>
            {j.filamentUsed ? `${Math.round(j.filamentUsed)} mm` : '—'}
           </span>
          </td>

          {/* Status */}
          <td style={{textAlign:'center'}}>
           {j.isCompleted ? (
            <span className="prodStatusPill completed">
             <CheckCircle2 size={12}/> Completed
            </span>
           ) : (
            <span className="prodStatusPill failed">
             <XCircle size={12}/> {statusLabel(j.status)}
            </span>
           )}
          </td>
         </tr>
        )) : (
         <tr>
          <td colSpan="6" className="prodEmptyCell">
           <Clock size={28} style={{color:'#475569',margin:'0 auto 8px',display:'block'}}/>
           <strong>No log events recorded for this period.</strong>
          </td>
         </tr>
        )}
       </tbody>
      </table>
     </div>
    </div>
   )}
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
      <span className="fleetCategoryTag">CONFIGURATION & SYSTEM</span>
      <h1 className="fleetMainTitle" style={{marginTop:'4px'}}>Farm Settings & Host Setup</h1>
      <p className="fleetSubtitle">Configure your 3D printers, Host network bridge, remote tunnel, and alert integrations.</p>
     </div>
    </div>

    {/* Sub Navigation Tabs */}
    <div className="settingsSubTabs">
     <button 
      className={'settingsSubTab ' + (settingsTab==='printers'?'active':'')}
      onClick={()=>setSettingsTab('printers')}
     >
      <Printer size={15}/> <span>Printer Fleet ({items.length})</span>
     </button>
     <button 
      className={'settingsSubTab ' + (settingsTab==='host'?'active':'')}
      onClick={()=>setSettingsTab('host')}
     >
      <Server size={15}/> <span>Farm Host Setup</span>
      <span className="hostStatusDot active" title="Host bridge online"/>
     </button>
    </div>
   </div>

   {settingsTab==='printers' ? (
    <>
     <div className="titleRow" style={{marginTop:'12px',marginBottom:'14px'}}>
      <div>
       <h2 style={{fontSize:'16px',fontWeight:700,color:'#f8fafc',margin:0}}>3D Printer Fleet ({items.length} configured)</h2>
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
        <label>
         Printer name
         <input value={p.name} onChange={e=>edit(i,'name',e.target.value)} placeholder="e.g. P1 - Neptune 4 Max"/>
        </label>
        <label>
         IP / Host
         <input value={p.host} onChange={e=>edit(i,'host',e.target.value)} placeholder="e.g. 172.16.20.125"/>
        </label>
        <label>
         Port
         <input type="number" min="1" max="65535" value={p.port} onChange={e=>edit(i,'port',Number(e.target.value))}/>
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

         <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
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

function App(){
 const[authed,setAuthed]=useState(null),[page,setPage]=useState('overview'),[printers,setPrinters]=useState([]),[config,setConfig]=useState([]),[events,setEvents]=useState([]),[completed,setCompleted]=useState({jobs:[],summary:[]}),[systemInfo,setSystemInfo]=useState(null),[controlPrinter,setControlPrinter]=useState(null),[error,setError]=useState(''),[refreshed,setRefreshed]=useState(null);
 const[pushActive,setPushActive]=useState(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
 const[showHostStatusModal,setShowHostStatusModal]=useState(false);
 const[showSetupGuideModal,setShowSetupGuideModal]=useState(false);

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
   setControlPrinter(curr=>curr?p.find(x=>x.id===curr.id)||curr:null);
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

 const total=printers.length;
 const online=printers.filter(p=>p.connected).length;
 const printing=printers.filter(p=>p.connected&&(p.status==='printing'||p.rawState==='printing')&&p.filamentDetected!==false&&!p.isShutdown).length;
 const completedPrinters=printers.filter(p=>p.status==='completed'||p.isDone).length;
 const issues=printers.filter(p=>(
  p.filamentDetected===false||
  p.filamentRunout===true||
  p.status==='runout'||
  p.status==='paused'||
  p.status==='error'||
  p.isShutdown||
  p.shutdownReason||
  (p.connected&&p.error&&!p.error.toLowerCase().includes('timeout')&&!p.error.toLowerCase().includes('offline'))
 )&&p.status!=='completed').length;
 const offline=Math.max(0,total-online);
 const sortedPrinters=[...printers].sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'}));

 return <div className={`layout theme-${theme}`}>
  <aside>
   <div className="logo">
    <div className="logoIconBox"><Printer size={20}/></div>
    <div className="logoTitle">NEPTUNE <span>FARM</span></div>
   </div>
   <div className="asideLabel">FARM</div>
   <button className={'nav '+(page==='overview'?'active':'')} onClick={()=>setPage('overview')}>
    <Activity size={17}/> <span>Printer status</span>
   </button>
   <button className={'nav '+(page==='completed'?'active':'')} onClick={()=>setPage('completed')}>
    <CheckCheck size={17}/> <span>Production</span>
   </button>
   <button className={'nav '+(page==='alerts'?'active':'')} onClick={()=>setPage('alerts')}>
    <Bell size={17}/> <span>Alerts & events</span>
    {events.length>0&&<span className="asideBadge">{events.length>9?'9+':events.length}</span>}
   </button>
   <button className={'nav '+(page==='settings'?'active':'')} onClick={()=>setPage('settings')}>
    <Settings size={17}/> <span>Printer settings</span>
   </button>
   <div className="asideFoot">
    <div className="hostStatusBox" onClick={()=>setShowHostStatusModal(true)} style={{cursor:'pointer'}} title="Click to view Host System Status">
     <div className="hostStatusHead">
      <span className="liveDot green"/>
      <span>Farm host connected</span>
     </div>
     <div className="hostStatusSub">HOST: {systemInfo?.primaryIp||'172.16.20.139'}</div>
    </div>
    <button className="nav signout" onClick={async()=>{await api('/logout',{method:'POST'});setAuthed(false)}}>
     <LogOut size={16}/> <span>Sign out</span>
    </button>
   </div>
  </aside>

  <main className="main">
   <header>
    <div className="headerLeftGroup">
     <div className={'netBadge '+(isLocal?'local':'remote')} title={isLocal?`Connected via Local Farm LAN (${systemInfo?.primaryIp||'172.16.20.139'})`:`Remote Access: Telemetry is continuously relayed from Farm Host PC (${systemInfo?.primaryIp||'172.16.20.139'})`}>
      <span className="liveDot green"/>
      <span>{isLocal?'LAN connected':'Remote connected'}</span>
     </div>
     <span className="headerTime">Updated {refreshed?refreshed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true}):'--:--'}</span>
     <button 
      className="pushHeaderBtn" 
      onClick={async()=>{
       try {
        await subscribeToWebPush(true);
        setPushActive(true);
        alert('🔔 Test push notification sent to your phone!');
       } catch(e) {
        alert('Push notification alert: ' + (e.message || e));
       }
      }}
      title="Enable or test real-time phone push notifications"
     >
      <Bell size={13}/> <span>{pushActive ? 'Push Active (Test)' : 'Enable Alerts'}</span>
     </button>
     <button className="themeToggleBtn" onClick={()=>setShowHostStatusModal(true)} title="Host PC Status">
      <HardDrive size={13}/> Host Status
     </button>
     <button className="themeToggleBtn" onClick={()=>setShowSetupGuideModal(true)} title="How to Setup Neptune Farm">
      <Sparkles size={13}/> How to Setup
     </button>
     <button className="themeToggleBtn" onClick={toggleTheme} title={`Switch to ${theme==='dark'?'Light':'Dark'} mode`}>
      {theme==='dark'?(
       <><Sun size={13}/> Light</>
      ):(
       <><Moon size={13}/> Dark</>
      )}
     </button>
     <button className="iconButton" title="Refresh telemetry" onClick={refresh}>
      <RefreshCw size={15}/>
     </button>
    </div>
   </header>

   <div className="mobileNav">
    <button onClick={()=>setPage('overview')}>Printer status</button>
    <button onClick={()=>setPage('completed')}>Production</button>
    <button onClick={()=>setPage('alerts')}>Alerts</button>
    <button onClick={()=>setPage('settings')}>Settings</button>
   </div>

   {error&&<div className="banner">{error}</div>}

   {page==='overview'?(
    <>
     {/* PRINTER FLEET Page Title Header */}
     <div className="fleetPageHeader">
      <div className="fleetTitleWrap">
       <span className="fleetCategoryTag">PRINTER FLEET</span>
       <h1 className="fleetMainTitle">Printer Status</h1>
       <p className="fleetSubtitle">Monitor real-time printer status, jobs, and connection health.</p>
      </div>
      <div className="fleetHeaderActions">
       <button className="fleetAddBtn" onClick={()=>setPage('settings')}>
        <Plus size={15}/> Add printer
       </button>
       <button className="fleetRefreshBtn" onClick={refresh} title="Refresh telemetry">
        <RefreshCw size={14}/> Refresh
       </button>
      </div>
     </div>

     {/* Chrome Remote Desktop Style Host Remote Status Bar */}
     <div className="hostRemoteBar">
      <div className="hostRemoteLeft">
       <div className="hostDeviceIcon">
        <HardDrive size={22}/>
       </div>
       <div className="hostDeviceInfo">
        <div className="hostDeviceTitle">
         <strong>{systemInfo?.hostname || 'Host PC (DESKTOP-7K68NSL)'}</strong>
         <span className={`hostLivePill ${systemInfo ? 'online' : 'offline'}`}>
          <span className="liveDot green"/> {systemInfo ? 'Online • 24/7 Watchdog Active' : 'Connecting...'}
         </span>
        </div>
        <div className="hostDeviceSub">
         LAN: <span className="mono">{systemInfo?.primaryIp ? `${systemInfo.primaryIp}:${systemInfo.port || 3080}` : '172.16.20.139:3080'}</span> • Remote: <span className="mono">neptunemonitor.com</span> • Printers linked: <strong style={{color:'#38bdf8'}}>{online}/{total} Online</strong>
        </div>
       </div>
      </div>
      <div className="hostRemoteActions">
       <button className="hostSetupBtn" onClick={()=>setShowHostStatusModal(true)} title="View Host machine IP, cloud domain, and 24/7 background status">
        <HardDrive size={13}/> Host Status
       </button>
       <button className="hostGuideBtn" onClick={()=>setShowSetupGuideModal(true)} title="Step-by-step setup guide for remote access & adding printers">
        <Sparkles size={13}/> How to Setup
       </button>
      </div>
     </div>

     {/* 6 Fleet Stat Cards */}
     <section className="fleetStatsGrid">
      <div className="fleetStatCard total" title="Total registered 3D printers in farm">
       <div className="fleetStatIconBox total"><Printer size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Total printers</span>
        <strong className="fleetStatVal">{total}</strong>
       </div>
      </div>

      <div className="fleetStatCard online" title="Printers currently connected to LAN">
       <div className="fleetStatIconBox online"><CheckCircle2 size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Online</span>
        <strong className="fleetStatVal">{online}</strong>
       </div>
      </div>

      <div className="fleetStatCard printing" title="Printers actively running print jobs">
       <div className="fleetStatIconBox printing"><Play size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Printing</span>
        <strong className="fleetStatVal">{printing}</strong>
       </div>
      </div>

      <div className="fleetStatCard completed" title="Printers with completed print jobs (ready to clear bed)">
       <div className="fleetStatIconBox completed"><CheckCheck size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Complete</span>
        <strong className="fleetStatVal">{completedPrinters}</strong>
       </div>
      </div>

      <div className="fleetStatCard attention" title="Printers with filament runout, pause, shutdown or errors">
       <div className="fleetStatIconBox attention"><AlertTriangle size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Issue with printer</span>
        <strong className="fleetStatVal">{issues}</strong>
       </div>
      </div>

      <div className="fleetStatCard offline" title="Printers currently offline or disconnected">
       <div className="fleetStatIconBox offline"><WifiOff size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Offline / errors</span>
        <strong className="fleetStatVal">{offline}</strong>
       </div>
      </div>
     </section>

     {/* Printer status subheader */}
     <div className="fleetStatusSubBar">
      <div className="fleetStatusLeft">
       <strong>Printer status</strong>
       <span className="fleetStatusCount">{online} of {total} printers connected</span>
      </div>
      <div className="fleetStatusRight">
       <span className="livePulseDot"/>
       <span>Live updates: every 5 sec</span>
      </div>
     </div>

     {/* Horizontal Fleet Cards List (Sorted Alphabetically A to Z) */}
     <section className="fleetList">
      {sortedPrinters.map(p=>(
       <PrinterCard 
        key={p.id} 
        p={p} 
        isLocal={isLocal} 
        systemInfo={systemInfo} 
        onOpenControl={setControlPrinter}
        onClearBed={handleClearBed}
        onFirmwareRestart={handleFirmwareRestart}
       />
      ))}
     </section>
    </>
   ):page==='completed'?(
    <CompletedPage data={completed} printers={printers} onSync={syncHistory}/>
   ):page==='settings'?(
    <SettingsPage list={config} reload={async()=>{await loadConfig();await refresh()}} systemInfo={systemInfo}/>
   ):(
    <>
     <div className="titleRow"><div><h1>Alerts and event history</h1><p>Changes observed while this monitor was running.</p></div></div>
     <div className="card activity">
      {events.length?events.map(e=><div className="event" key={e.id}><span className={'dot '+(e.type==='completed'?'purple':(e.type==='resumed'?'green':(e.type==='error'||e.type==='offline'?'red':(e.type==='runout'?'orange':'amber'))))}/><div>{e.message}<small>{new Date(e.time).toLocaleString()} · {e.type}</small></div></div>):<div className="empty"><WifiOff size={22}/> No events recorded yet.</div>}
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
