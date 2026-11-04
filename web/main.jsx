import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Printer,Settings,Activity,LogOut,RefreshCw,AlertTriangle,CheckCircle2,Thermometer,Clock,Layers,Plus,Trash2,Bell,ShieldCheck,WifiOff,PackageCheck,CheckCheck,Search,Calendar,Filter,XCircle,TrendingUp,ExternalLink,Wifi,Globe,Radio,Server,Terminal,Play,Pause,Square,Flame,RotateCcw,Send,X,Home,ShieldAlert,Sliders,Sun,Moon,Move,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronUp,ChevronDown,Wind,Gauge,Compass,Zap}from'lucide-react';
import './style.css';

const api=async(url,options={})=>{const r=await fetch('/api'+url,{credentials:'same-origin',headers:{'content-type':'application/json'},...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Request failed');return data};
const fmtDuration=n=>n==null?'—':Math.floor(n/3600)+'h '+Math.floor(n%3600/60)+'m';
const temp=n=>typeof n==='number'?n.toFixed(1)+'°C':'—';
const color=s=>({printing:'green',completed:'teal',idle:'blue',paused:'amber',offline:'red',error:'red',disabled:'gray',connecting:'gray',cancelled:'gray',runout:'orange',filament_runout:'orange'})[s]||'gray';

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
 const hasRunout=(p.filamentDetected===false || p.filamentRunout===true || s==='runout') && !isDone;
 const isError=(s==='error'||s==='offline') && !hasRunout;
 const hasIssue=(isError||Boolean(p.error)) && !hasRunout;
 const isIdle=s==='idle' && !hasRunout;
 const isPaused=s==='paused' && !hasRunout;
 const isPrinting=s==='printing' && !hasRunout;
 const progressVal=isDone?100:Math.max(0,Math.min(100,p.progress??0));

 return (
  <article className={`fleetCard state-${s} ${hasRunout?'has-runout':''} ${hasIssue?'has-issue':''} ${isPrinting?'is-printing':''}`}>
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
       <span className={'fleetPill '+(hasRunout ? 'orange' : color(s))}>
        <i/>
        {hasRunout ? 'Filament Runout' : s==='completed'?'Completed':s==='offline'?'Offline':s==='printing'?'Printing':s==='paused'?'Paused':s==='idle'?'Idle':s}
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
      <Activity size={13} style={{flexShrink:0,opacity:.8,color:isPrinting?'#38bdf8':'#64748b'}}/>
      <span className="fleetJobName" title={p.file||'No active G-code job'}>
       {p.file||'No active G-code job'}
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
        <span className="fleetTimeBadge runout" title="Filament sensor triggered">
         <AlertTriangle size={13} className="timeIcon"/>
         <span className="timeLabel">Filament khatam ho gaya:</span>
         <strong className="timeValue">Replace with new filament</strong>
        </span>
        {p.remainingTime != null && (
         <span className="fleetTimeBadge remaining" title="Estimated time left once resumed">
          <Clock size={13} className="timeIcon"/>
          <span className="timeLabel">Remaining:</span>
          <strong className="timeValue">{fmtDuration(p.remainingTime)}</strong>
         </span>
        )}
       </div>
      ) : isPrinting ? (
       <div className="fleetTimeRow">
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
       </div>
      ) : isDone ? (
       <span className="fleetTimeBadge done">
        <CheckCircle2 size={13} className="timeIcon"/>
        <strong className="timeValue">Print completed · Ready to clear</strong>
       </span>
      ) : isIdle ? (
       <span className="fleetTimeBadge idle">
        <span>Ready for next job</span>
       </span>
      ) : isPaused ? (
       <div className="fleetTimeRow">
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
     {hasRunout&&(
      <span className="fleetRunoutBadge orange" title="Filament runout detected! Please replace spool">REPLACE FILAMENT</span>
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
      <a 
       href={printerUrl} 
       target="_blank" 
       rel="noreferrer" 
       className={'fleetBtn webui '+(isLocal?'':'remote')}
       title={isLocal?`Open ${p.name} Fluidd interface directly`: `Direct LAN IP ${p.host} (requires farm Wi-Fi)`}
      >
       <ExternalLink size={13}/>
       <span>Web UI</span>
      </a>
     )}
    </div>
   </div>

   {/* Error / Offline Banner */}
   {isError&&(
    <div className="fleetErrorBanner">
     <AlertTriangle size={15} className="fleetErrorIcon"/>
     <div className="fleetErrorContent">
      <strong>Can't reach this printer</strong>
      <span>
       {p.error||`Connection timed out while contacting Moonraker at ${p.host}:${p.port}. Check the printer power, IP address, and Moonraker port.`}
      </span>
     </div>
    </div>
   )}
  </article>
 );
}

function RemoteControlModal({p,isLocal,systemInfo,onClose,onRefresh}){
 const [logs,setLogs]=useState([]);
 const [cmd,setCmd]=useState('');
 const [sending,setSending]=useState(false);
 const [feedback,setFeedback]=useState(null);
 const [autoScroll,setAutoScroll]=useState(true);
 const [modalTab,setModalTab]=useState('jog'); // 'jog' | 'temp' | 'fan' | 'terminal'
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

function CompletedPage({data,onSync,printers=[]}){
 const[search,setSearch]=useState('');
 const[tab,setTab]=useState('summary'); // 'summary' | 'days' | 'jobs'
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

 // Find all actively printing / in-progress farm printers right now!
 const activePrints=(printers||[]).filter(p=>(p.status==='printing'||p.status==='paused'||p.status==='runout')&&p.file);

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

 // File quantities tracker (Completed vs In-Progress/Baaki)
 const fileSummaryMap=new Map();

 // 1. Seed with active prints so in-progress files are immediately tracked
 for(const ap of activePrints){
  const fn=ap.file||'Unknown';
  if(!fileSummaryMap.has(fn)){
   fileSummaryMap.set(fn,{file:fn,quantity:0,failedCount:0,inProgressCount:0,totalJobs:0,totalDuration:0,failedDuration:0,lastCompletedAt:null,lastFailedAt:null,printers:new Set(),activePrinters:new Set(),completionTimes:[],failureTimes:[]});
  }
  const item=fileSummaryMap.get(fn);
  item.inProgressCount+=1;
  item.activePrinters.add(ap.name);
  if(ap.name)item.printers.add(ap.name);
 }

 // 2. Add completed and failed history
 for(const j of filteredJobs){
  const fn=j.file||'Unknown';
  if(!fileSummaryMap.has(fn)){
   fileSummaryMap.set(fn,{file:fn,quantity:0,failedCount:0,inProgressCount:0,totalJobs:0,totalDuration:0,failedDuration:0,lastCompletedAt:null,lastFailedAt:null,printers:new Set(),activePrinters:new Set(),completionTimes:[],failureTimes:[]});
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
  totalTarget:x.quantity+x.inProgressCount,
  printers:Array.from(x.printers),
  activePrinters:Array.from(x.activePrinters),
  avgDuration:x.quantity?Math.round(x.totalDuration/x.quantity):0,
  successRate:x.totalJobs?Math.round((x.quantity/x.totalJobs)*100):100,
  completionTimes:x.completionTimes.sort((a,b)=>new Date(b)-new Date(a)),
  failureTimes:x.failureTimes.sort((a,b)=>new Date(b.time)-new Date(a.time))
 })).sort((a,b)=>(b.inProgressCount*1000+b.quantity)-(a.inProgressCount*1000+a.quantity));

 const filteredCompletedCount=filteredJobs.filter(j=>j.isCompleted).length;
 const filteredFailedCount=filteredJobs.filter(j=>j.isFailed).length;
 const totalDuration=filteredJobs.filter(j=>j.isCompleted).reduce((a,b)=>a+(b.duration||0),0);
 const wastedDuration=filteredJobs.filter(j=>j.isFailed).reduce((a,b)=>a+(b.duration||0),0);
 const successRate=filteredJobs.length?Math.round((filteredCompletedCount/filteredJobs.length)*100):100;

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
   day.fileMap.set(fn,{file:fn,completedCount:0,failedCount:0,printers:new Set(),times:[],failedTimes:[]});
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

 return (
  <div className="completedPage">
   {/* Title & Actions */}
   <div className="fleetPageHeader">
    <div className="fleetTitleWrap">
     <span className="fleetCategoryTag">PRODUCTION & AUDIT</span>
     <h1 className="fleetMainTitle">Production & Completed Prints</h1>
     <p className="fleetSubtitle">
      Real-time farm output tracking: kitne prints complete hue, kitne abhi chal rahe hain (baaki), aur total piece summary.
     </p>
    </div>
    <div className="fleetHeaderActions">
     <button className="fleetRefreshBtn" onClick={triggerSync} disabled={syncing} title="Sync printer history from Moonraker">
      <RefreshCw size={15} className={syncing?'spin':''}/> {syncing?'Syncing…':'Sync Moonraker History'}
     </button>
    </div>
   </div>

   {/* Top KPI Cards (Complete vs In-Progress/Baaki vs Failed) */}
   <div className="prodKpiGrid">
    <div className="prodKpiCard completed">
     <div className="kpiIconBox completed"><PackageCheck size={22}/></div>
     <div className="kpiContent">
      <span className="kpiLabel">Completed Pieces (Ban Chuke)</span>
      <strong className="kpiValue">{filteredCompletedCount} pcs</strong>
      <small className="kpiSub">{datePreset==='today'?'Completed Today':datePreset==='yesterday'?'Completed Yesterday':'Selected Period'}</small>
     </div>
    </div>

    <div className="prodKpiCard inProgress">
     <div className="kpiIconBox inProgress"><Clock size={22}/></div>
     <div className="kpiContent">
      <span className="kpiLabel">Currently Printing (Baaki Hain)</span>
      <strong className="kpiValue">{activePrints.length} active</strong>
      <small className="kpiSub">{activePrints.length?`${activePrints.length} printers currently running`:'All printers idle'}</small>
     </div>
    </div>

    <div className="prodKpiCard failed">
     <div className="kpiIconBox failed"><XCircle size={22}/></div>
     <div className="kpiContent">
      <span className="kpiLabel">Failed / Cancelled</span>
      <strong className="kpiValue">{filteredFailedCount} pcs</strong>
      <small className="kpiSub">{wastedDuration>0?`Wasted: ${fmtDuration(wastedDuration)}`:'No print waste'}</small>
     </div>
    </div>

    <div className="prodKpiCard rate">
     <div className="kpiIconBox rate"><TrendingUp size={22}/></div>
     <div className="kpiContent">
      <span className="kpiLabel">Success Rate</span>
      <strong className="kpiValue">{successRate}%</strong>
      <small className="kpiSub">{filteredCompletedCount} of {filteredCompletedCount + filteredFailedCount} jobs passed</small>
     </div>
    </div>

    <div className="prodKpiCard time">
     <div className="kpiIconBox time"><Gauge size={22}/></div>
     <div className="kpiContent">
      <span className="kpiLabel">Total Machine Time</span>
      <strong className="kpiValue">{fmtDuration(totalDuration)}</strong>
      <small className="kpiSub">Successful production time</small>
     </div>
    </div>
   </div>

   {/* SECTION 1: LIVE IN-PROGRESS ACTIVE PRINTS (ABHI KITNE BAAKI HAIN) */}
   <div className="liveProdSection">
    <div className="liveProdHeader">
     <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <span className="liveDot green"/>
      <h3 style={{margin:0,fontSize:'15px',fontWeight:800,color:'#f8fafc'}}>
       ⚡ Active In-Progress Farm Prints ({activePrints.length} Baaki Hain)
      </h3>
     </div>
     <span style={{fontSize:'12px',color:'#7f94b0'}}>
      Live real-time printing status across the farm
     </span>
    </div>

    {activePrints.length > 0 ? (
     <div className="liveProdGrid">
      {activePrints.map(p=>(
       <div className="liveProdCard" key={p.id}>
        <div className="liveProdHead">
         <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Printer size={15} style={{color:'#60a5fa'}}/>
          <strong style={{color:'#f8fafc',fontSize:'13.5px'}}>{p.name}</strong>
         </div>
         <span className={'fleetPill '+(p.status==='runout'?'orange':color(p.status))} style={{fontSize:'10px',padding:'2px 8px'}}>
          <i/> {p.status==='runout'?'Runout':p.status}
         </span>
        </div>

        <div className="liveProdFile" title={p.file}>
         <Activity size={13} style={{color:'#38bdf8',flexShrink:0}}/>
         <span>{p.file}</span>
        </div>

        {/* Progress Bar */}
        <div className="liveProdProgressWrap">
         <div className="liveProdBar">
          <div className={'liveProdBarFill '+color(p.status)} style={{width:`${p.progress??0}%`}}/>
         </div>
         <span className="liveProdPct">{p.progress??0}%</span>
        </div>

        {/* Remaining & Completion Time */}
        <div className="liveProdFoot">
         <span className="timeBadge remaining" style={{fontSize:'11.5px',padding:'3px 8px'}}>
          <Clock size={12}/> Remaining: <strong>{p.remainingTime!=null?fmtDuration(p.remainingTime):'—'}</strong>
         </span>
         {p.eta&&(
          <span className="timeBadge completedBy" style={{fontSize:'11.5px',padding:'3px 8px'}}>
           <CheckCircle2 size={12}/> Complete by: <strong>{formatFinishTime(p.eta)}</strong>
          </span>
         )}
        </div>
       </div>
      ))}
     </div>
    ) : (
     <div className="liveProdEmpty">
      <CheckCircle2 size={20} style={{color:'#10b981'}}/>
      <div>
       <strong>All farm printers are currently idle (0 prints in-progress right now).</strong>
       <span>Ready to slice and start the next production batch!</span>
      </div>
     </div>
    )}
   </div>

   {/* Filters Bar */}
   <div className="card prodFilterCard">
    {/* Status Filters */}
    <div className="statusFilterRow">
     <span className="filterTagLabel">STATUS:</span>
     <button className={'statusFilterBtn '+(statusFilter==='all'?'active all':'')} onClick={()=>setStatusFilter('all')}>
      All Output ({allJobs.length})
     </button>
     <button className={'statusFilterBtn '+(statusFilter==='completed'?'active completed':'')} onClick={()=>setStatusFilter('completed')}>
      <CheckCircle2 size={14}/> Completed ({totalCompletedAll} pcs)
     </button>
     <button className={'statusFilterBtn '+(statusFilter==='failed'?'active failed':'')} onClick={()=>setStatusFilter('failed')}>
      <XCircle size={14}/> Failed ({totalFailedAll})
     </button>
    </div>

    {/* Date Filters */}
    <div className="dateFilterRow">
     <span className="filterTagLabel"><Calendar size={13}/> DATE:</span>
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
      {(datePreset!=='all'||statusFilter!=='all'||search)&&<button className="clearBtn" onClick={clearFilter}>Reset filters</button>}
     </div>
    </div>
   </div>

   {/* Active Filter Notice Banner */}
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

   {/* Tabs and Search Bar */}
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}>
    <div className="subTabs">
     <button className={'subTabBtn '+(tab==='summary'?'active':'')} onClick={()=>setTab('summary')}>
      📊 Quantities by File ({fileSummary.length} G-Codes)
     </button>
     <button className={'subTabBtn '+(tab==='days'?'active':'')} onClick={()=>setTab('days')}>
      📅 Daily Production ({dailyList.length} Days)
     </button>
     <button className={'subTabBtn '+(tab==='jobs'?'active':'')} onClick={()=>setTab('jobs')}>
      📋 Detailed Job Log ({filteredJobs.length} Jobs)
     </button>
    </div>

    <div className="searchBox">
     <Search size={16}/>
     <input type="text" placeholder="Search G-code filename…" value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
   </div>

   {/* TAB 1: QUANTITIES BY FILE (COMPLETE VS BAAKI TRACKER) */}
   {tab==='summary'&&(
    <div className="card" style={{overflow:'hidden'}}>
     <div className="tableWrapper">
      <table className="prodTable">
       <thead>
        <tr>
         <th>G-Code File Name</th>
         <th style={{textAlign:'center'}}>Completed Pieces (Ban Chuke)</th>
         <th style={{textAlign:'center'}}>In Progress (Baaki Hain)</th>
         <th style={{textAlign:'center'}}>Total Target / Runs</th>
         <th style={{textAlign:'center'}}>Success Rate</th>
         <th>Avg Print Time</th>
         <th>Completion Timeline</th>
         <th>Printers Used</th>
        </tr>
       </thead>
       <tbody>
        {fileSummary.length?fileSummary.map(s=>(
         <tr key={s.file}>
          <td style={{maxWidth:'300px'}}>
           <strong style={{color:'#fff',fontSize:'13.5px',display:'block',wordBreak:'break-all'}}>{s.file}</strong>
           {s.lastCompletedAt&&<small style={{color:'#7d93ae',display:'block',marginTop:'3px'}}>Last finished: {new Date(s.lastCompletedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small>}
           {s.lastFailedAt&&<small style={{color:'#dd7883',display:'block',marginTop:'2px'}}>Last failed: {new Date(s.lastFailedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small>}
          </td>

          {/* Completed Pieces */}
          <td style={{textAlign:'center'}}>
           {s.quantity>0?(
            <span className="qtyBadge" style={{fontSize:'12px',padding:'4px 10px'}}>
             <CheckCircle2 size={13}/> {s.quantity} pcs
            </span>
           ):<span style={{color:'#667b96'}}>0 pcs</span>}
          </td>

          {/* In-Progress (Baaki Hain) */}
          <td style={{textAlign:'center'}}>
           {s.inProgressCount>0?(
            <span className="inProgressBadge">
             <Clock size={12}/> {s.inProgressCount} printing
            </span>
           ):<span style={{color:'#64748b'}}>—</span>}
          </td>

          {/* Total Planned / Target */}
          <td style={{textAlign:'center'}}>
           <span className="totalTargetBadge">
            📦 {s.totalTarget} total
           </span>
          </td>

          {/* Success Rate */}
          <td style={{textAlign:'center'}}>
           <span style={{fontWeight:800,color:s.successRate>=80?'#4eedb8':s.successRate>=50?'#f1a94e':'#ff7d89'}}>
            {s.totalJobs?`${s.successRate}%`:'100%'}
           </span>
          </td>

          {/* Average Duration */}
          <td className="timePill">{fmtDuration(s.avgDuration)}</td>

          {/* Completion & Failure Timestamps */}
          <td>
           <div style={{display:'flex',flexWrap:'wrap',gap:'4px',maxWidth:'320px'}}>
            {s.completionTimes.slice(0,5).map((t,idx)=>(
             <span key={idx} className="timeBadge" title={`Completed at ${new Date(t).toLocaleString()}`}>{formatTime(t)}</span>
            ))}
            {s.failureTimes.slice(0,3).map((ft,idx)=>(
             <span key={'f'+idx} className="timeBadge failed" title={`Failed (${statusLabel(ft.status)}) at ${new Date(ft.time).toLocaleString()}`}>
              {formatTime(ft.time)}
             </span>
            ))}
            {(s.completionTimes.length>5||s.failureTimes.length>3)&&<small style={{color:'#7e96b3'}}>+more</small>}
           </div>
          </td>

          {/* Printers */}
          <td>
           {s.printers.map(p=>(
            <span key={p} className={'printerTag '+(s.activePrinters.includes(p)?'activePrinter':'')}>
             {p} {s.activePrinters.includes(p)?'(Printing now)':''}
            </span>
           ))}
          </td>
         </tr>
        )):<tr><td colSpan="8" style={{textAlign:'center',padding:'36px',color:'#7f93ad'}}>No production records found matching your filter.</td></tr>}
       </tbody>
      </table>
     </div>
    </div>
   )}

   {/* TAB 2: DAYS-WISE BREAKDOWN */}
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
           <div style={{color:'#fff',fontWeight:700,fontSize:'13px'}}>{f.file}</div>
           <div style={{marginTop:'5px',display:'flex',alignItems:'center',flexWrap:'wrap',gap:'4px'}}>
            {f.times.length>0&&<>
             <span style={{color:'#7b90aa',fontSize:'11px',marginRight:'2px'}}>Completed:</span>
             {f.times.map((t,idx)=>(
              <span key={idx} className="timeBadge">{formatTime(t)}</span>
             ))}
            </>}
            {f.failedTimes.length>0&&<>
             <span style={{color:'#e37681',fontSize:'11px',marginLeft:'6px',marginRight:'2px'}}>Failed:</span>
             {f.failedTimes.map((ft,idx)=>(
              <span key={idx} className="timeBadge failed" title={`${statusLabel(ft.status)} after ${fmtDuration(ft.duration)}`}>
               {formatTime(ft.time)}
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

   {/* TAB 3: DETAILED JOB LOG */}
   {tab==='jobs'&&(
    <div className="card" style={{overflow:'hidden'}}>
     <div className="tableWrapper">
      <table className="prodTable">
       <thead>
        <tr>
         <th>Status</th>
         <th>File Name</th>
         <th>Printer</th>
         <th>Completed At</th>
         <th>Duration</th>
         <th>Filament Used</th>
        </tr>
       </thead>
       <tbody>
        {filteredJobs.length?filteredJobs.map((j,idx)=>(
         <tr key={idx}>
          <td>
           <span className={'statusBadge '+(j.isCompleted?'completed':'failed')}>
            {j.isCompleted?<CheckCircle2 size={12}/>:<XCircle size={12}/>}
            {j.isCompleted?'Completed':statusLabel(j.status)}
           </span>
          </td>
          <td><strong style={{color:'#f8fafc',fontSize:'13px'}}>{j.file}</strong></td>
          <td><span className="printerTag">{j.printerName||'Printer'}</span></td>
          <td className="timePill">{new Date(j.completedAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</td>
          <td>{fmtDuration(j.duration)}</td>
          <td>{j.filamentUsed?Math.round(j.filamentUsed)+' mm':'—'}</td>
         </tr>
        )):<tr><td colSpan="6" style={{textAlign:'center',padding:'32px',color:'#7f93ad'}}>No individual print jobs found.</td></tr>}
       </tbody>
      </table>
     </div>
    </div>
   )}
  </div>
 );
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
 const sortedPrinters=[...printers].sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'}));

 return <div className={`layout theme-${theme}`}>
  <aside>
   <div className="logo">
    <div className="logoIconBox"><Printer size={20}/></div>
    <div className="logoTitle">NEPTUNE <span>FARM</span></div>
   </div>
   <div className="asideLabel">FARM</div>
   <button className={'nav '+(page==='overview'?'active':'')} onClick={()=>setPage('overview')}>
    <Activity size={17}/> <span>Fleet overview</span>
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
    <div className="hostStatusBox">
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
    <button onClick={()=>setPage('overview')}>Fleet overview</button>
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
       <h1 className="fleetMainTitle">Fleet Overview</h1>
       <p className="fleetSubtitle">Monitor your printers, jobs, and connection health.</p>
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

     {/* 4 Fleet Stat Cards */}
     <section className="fleetStatsGrid">
      <div className="fleetStatCard total">
       <div className="fleetStatIconBox total"><Printer size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Total printers</span>
        <strong className="fleetStatVal">{total}</strong>
       </div>
      </div>

      <div className="fleetStatCard online">
       <div className="fleetStatIconBox online"><CheckCircle2 size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Online</span>
        <strong className="fleetStatVal">{online}</strong>
       </div>
      </div>

      <div className="fleetStatCard attention">
       <div className="fleetStatIconBox attention"><AlertTriangle size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Needs attention</span>
        <strong className="fleetStatVal">{issues + paused}</strong>
       </div>
      </div>

      <div className="fleetStatCard offline">
       <div className="fleetStatIconBox offline"><WifiOff size={18}/></div>
       <div className="fleetStatInfo">
        <span className="fleetStatLabel">Offline / errors</span>
        <strong className="fleetStatVal">{Math.max(0, total - online)}</strong>
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
