import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app=express(),port=Number(process.env.PORT||3080),root=process.cwd();
const dataDir=path.join(root,'data'),configDir=path.join(root,'config');
fs.mkdirSync(dataDir,{recursive:true});
const configFile=path.join(configDir,'printers.json'),exampleFile=path.join(configDir,'printers.example.json'),historyFile=path.join(dataDir,'events.json'),completedFile=path.join(dataDir,'completed_prints.json'),jobsFile=path.join(dataDir,'print_jobs.json');
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
let printers=read(configFile,read(exampleFile,[])),events=read(historyFile,[]),allJobs=read(jobsFile,read(completedFile,[]));
const current=new Map(),last=new Map();
const secret=process.env.JWT_SECRET,password=process.env.ADMIN_PASSWORD;
if(!secret||secret.length<32||!password||password.startsWith('replace-with')||password.startsWith('change-this')){console.error('Set ADMIN_PASSWORD and a 32+ character JWT_SECRET in .env');process.exit(1)}
const passwordHash=bcrypt.hashSync(password,11);
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2),{mode:0o600});

async function telegram(message){
 const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chat)return;
 try{const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,text:'🖨 Neptune Print Farm\n'+message}),signal:AbortSignal.timeout(9000)});if(!r.ok)console.warn('Telegram HTTP',r.status)}
 catch(e){console.warn('Telegram:',e.message)}
}

function record(printerId,type,message){
 events.unshift({id:crypto.randomUUID(),printerId,type,message,time:new Date().toISOString()});
 events=events.slice(0,2000);save(historyFile,events);
 if(['completed','paused','error','runout','offline'].includes(type))void telegram(message);
}

const validHost=h=>typeof h==='string'&&h.length>0&&h.length<255&&/^[a-zA-Z0-9.-]+$/.test(h)&&!h.startsWith('-');
const metadataCache=new Map();

async function fetchMetadata(endpoint,filename){
 if(!filename)return null;
 const key=endpoint+':'+filename;
 if(metadataCache.has(key))return metadataCache.get(key);
 try{
  const res=await fetch(endpoint+'/server/files/metadata?filename='+encodeURIComponent(filename),{signal:AbortSignal.timeout(3000)});
  if(!res.ok)return null;
  const data=await res.json();
  const meta=data?.result||null;
  if(meta)metadataCache.set(key,meta);
  return meta;
 }catch{return null}
}

async function syncPrinterHistory(p){
 if(!p.enabled||!validHost(p.host)||!p.port)return;
 try{
  const r=await fetch('http://'+p.host+':'+p.port+'/server/history/list?limit=150',{signal:AbortSignal.timeout(4500)});
  if(!r.ok)return;
  const data=await r.json();
  const jobs=data?.result?.jobs||[];
  let updated=false;
  for(const j of jobs){
   if(j.status==='in_progress'||!j.filename)continue;
   const id=p.id+'_'+(j.job_id||j.start_time);
   const endSec=j.end_time||(j.start_time?(j.start_time+(j.print_duration||0)):null);
   const existingIdx=allJobs.findIndex(x=>x.id===id);
   const jobObj={
    id,
    jobId:j.job_id||null,
    printerId:p.id,
    printerName:p.name,
    file:j.filename,
    status:j.status||'unknown',
    isCompleted:j.status==='completed',
    isFailed:j.status!=='completed',
    completedAt:endSec?new Date(endSec*1000).toISOString():new Date().toISOString(),
    duration:Math.round(j.print_duration||j.total_duration||0),
    filamentUsed:Math.round(j.filament_used||0)
   };
   if(existingIdx===-1){
    allJobs.push(jobObj);
    updated=true;
   }else if(allJobs[existingIdx].status!==jobObj.status){
    allJobs[existingIdx]=jobObj;
    updated=true;
   }
  }
  if(updated){
   allJobs.sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
   if(allJobs.length>4000)allJobs=allJobs.slice(0,4000);
   save(jobsFile,allJobs);
   save(completedFile,allJobs.filter(x=>x.isCompleted));
  }
 }catch{}
}

async function syncAllHistory(){
 await Promise.all(printers.map(syncPrinterHistory));
}

function normalize(p,body,meta){
 const s=body?.result?.status||{},ps=s.print_stats||{},sd=s.virtual_sdcard||{},gm=s.gcode_move||{};
 const sensed=Object.entries(s).filter(([k])=>k.startsWith('filament_switch_sensor ')||k.startsWith('filament_motion_sensor '));
 const enabled=sensed.filter(([,v])=>v.enabled!==0);
 const filament=enabled.length?enabled.every(([,v])=>v.filament_detected===true):null;
 const state=ps.state||'unknown';
 const statuses={printing:'printing',paused:'paused',complete:'completed',error:'error',cancelled:'cancelled',standby:'idle'};
 const currentZ=(Array.isArray(gm.gcode_position)&&typeof gm.gcode_position[2]==='number')?Number(gm.gcode_position[2].toFixed(3)):null;
 let layer=ps.info?.current_layer??null,totalLayers=ps.info?.total_layer??null;
 if(layer==null&&meta?.layer_count){
  totalLayers=meta.layer_count;
  const lh=meta.layer_height||0.2,flh=meta.first_layer_height||lh;
  if(currentZ!=null&&currentZ>0){
   layer=Math.max(1,Math.min(totalLayers,currentZ<=flh?1:Math.round((currentZ-flh)/lh)+1));
  }else if(sd.progress>0){
   layer=Math.max(1,Math.min(totalLayers,Math.round(sd.progress*totalLayers)));
  }
 }else if(layer==null&&currentZ!=null&&currentZ>0){
  const lh=meta?.layer_height||0.2;
  layer=Math.max(1,Math.round(currentZ/lh));
  if(meta?.object_height){totalLayers=Math.max(layer,Math.round(meta.object_height/lh))}
 }

 let totalDuration=null,remainingTime=null,eta=null;
 const duration=Math.round(ps.print_duration||0),progressRatio=sd.progress||0;
 if(state==='printing'||state==='paused'){
  const slicerEst=(typeof meta?.estimated_time==='number'&&meta.estimated_time>0)?meta.estimated_time:null;
  if(slicerEst){
   totalDuration=Math.round(slicerEst);
   if(progressRatio>0.03&&duration>60){
    const progressEst=duration/progressRatio;
    if(progressEst>slicerEst*0.4&&progressEst<slicerEst*2.5){
     totalDuration=Math.round(slicerEst*(1-progressRatio)+progressEst*progressRatio);
    }
   }
   remainingTime=Math.max(0,Math.round(totalDuration-duration));
  }else if(progressRatio>0.01&&duration>20){
   totalDuration=Math.round(duration/progressRatio);
   remainingTime=Math.max(0,Math.round(totalDuration-duration));
  }
  if(remainingTime!=null&&remainingTime>0){
   eta=new Date(Date.now()+remainingTime*1000).toISOString();
  }
 }

 return {...p,connected:true,status:statuses[state]||'unknown',rawState:state,file:ps.filename||'',progress:Math.max(0,Math.min(100,Math.round((sd.progress||0)*100))),duration,totalDuration,remainingTime,eta,filamentUsed:ps.filament_used||0,layer,totalLayers,z:currentZ,nozzle:s.extruder?.temperature??null,nozzleTarget:s.extruder?.target??null,bed:s.heater_bed?.temperature??null,bedTarget:s.heater_bed?.target??null,filamentDetected:filament,filamentSensors:sensed.map(([name])=>name),updatedAt:new Date().toISOString()};
}

async function scan(p){
 if(!p.enabled){current.set(p.id,{...p,status:'disabled',connected:false});return}
 if(!validHost(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535){current.set(p.id,{...p,status:'error',connected:false,error:'Invalid host or port'});return}
 try{
  const endpoint='http://'+p.host+':'+p.port;
  const discovery=await fetch(endpoint+'/printer/objects/list',{signal:AbortSignal.timeout(3500)});
  if(!discovery.ok)throw Error('Discovery HTTP '+discovery.status);
  const obj=await discovery.json();if(obj.error)throw Error(obj.error.message||'Moonraker discovery error');
  const names=(obj.result?.objects||[]).filter(x=>x.startsWith('filament_switch_sensor ')||x.startsWith('filament_motion_sensor '));
  const query=['print_stats','virtual_sdcard','extruder','heater_bed','gcode_move',...names].map(encodeURIComponent).join('&');
  const response=await fetch(endpoint+'/printer/objects/query?'+query,{signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('Status HTTP '+response.status);
  const body=await response.json();if(body.error)throw Error(body.error.message||'Moonraker status error');
  const filename=body?.result?.status?.print_stats?.filename;
  const meta=filename?await fetchMetadata(endpoint,filename):null;
  const next=normalize(p,body,meta),prev=last.get(p.id);
  current.set(p.id,next);last.set(p.id,next);
  if(prev?.connected&&prev.status!==next.status){
   if(['completed','paused','error'].includes(next.status)){
    record(p.id,next.status,p.name+': '+next.status.toUpperCase()+' — '+(next.file||'No filename'));
   }
   if(next.status==='completed'&&next.file){
    const liveId=p.id+'_live_'+Date.now();
    allJobs.unshift({
     id:liveId,
     jobId:null,
     printerId:p.id,
     printerName:p.name,
     file:next.file,
     status:'completed',
     isCompleted:true,
     isFailed:false,
     completedAt:new Date().toISOString(),
     duration:next.duration||0,
     filamentUsed:next.filamentUsed||0
    });
    if(allJobs.length>4000)allJobs=allJobs.slice(0,4000);
    save(jobsFile,allJobs);
    save(completedFile,allJobs.filter(x=>x.isCompleted));
    void syncPrinterHistory(p);
   }else if(['error','cancelled'].includes(next.status)&&(next.file||prev.file)){
    const liveId=p.id+'_live_fail_'+Date.now();
    allJobs.unshift({
     id:liveId,
     jobId:null,
     printerId:p.id,
     printerName:p.name,
     file:next.file||prev.file,
     status:next.status==='error'?'error':'cancelled',
     isCompleted:false,
     isFailed:true,
     completedAt:new Date().toISOString(),
     duration:next.duration||prev.duration||0,
     filamentUsed:next.filamentUsed||prev.filamentUsed||0
    });
    if(allJobs.length>4000)allJobs=allJobs.slice(0,4000);
    save(jobsFile,allJobs);
    void syncPrinterHistory(p);
   }
   if(prev.filamentDetected!==false&&next.filamentDetected===false)record(p.id,'runout',p.name+': filament runout detected');
  }
 }catch(e){
  const previous=last.get(p.id),next={...p,connected:false,status:'offline',error:e.message,updatedAt:previous?.updatedAt||null,progress:previous?.progress||0,file:previous?.file||''};
  current.set(p.id,next);last.set(p.id,next);
  if(previous?.connected)record(p.id,'offline',p.name+': offline ('+e.message+')');
 }
}

let running=false;
async function poll(){if(running)return;running=true;try{await Promise.all(printers.map(scan))}finally{running=false}}
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'40kb'}));app.use(cookieParser());
const limitLogin=rateLimit({windowMs:900000,limit:12,standardHeaders:'draft-7',legacyHeaders:false});

app.post('/api/login',limitLogin,async(req,res)=>{
 if(typeof req.body?.password!=='string'||!(await bcrypt.compare(req.body.password,passwordHash)))return res.status(401).json({error:'Invalid password'});
 const token=jwt.sign({role:'admin'},secret,{expiresIn:'12h'});
 res.cookie('farm_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',maxAge:43200000});
 res.json({ok:true});
});
app.post('/api/logout',(_req,res)=>{res.clearCookie('farm_session');res.json({ok:true})});

function auth(req,res,next){try{if(jwt.verify(req.cookies.farm_session,secret).role!=='admin')throw Error('Denied');next()}catch{res.status(401).json({error:'Login required'})}}

app.get('/api/me',auth,(_req,res)=>res.json({ok:true}));
app.get('/api/printers',auth,(_req,res)=>res.json(printers.map(p=>current.get(p.id)||{...p,status:'connecting',connected:false})));
app.get('/api/events',auth,(_req,res)=>res.json(events.slice(0,200)));
app.get('/api/config',auth,(_req,res)=>res.json(printers));

app.get('/api/completed-prints',auth,(_req,res)=>{
 const summaryMap=new Map();
 for(const j of allJobs){
  const fn=j.file||'Unknown';
  if(!summaryMap.has(fn)){
   summaryMap.set(fn,{file:fn,quantity:0,failedCount:0,totalJobs:0,totalDuration:0,failedDuration:0,lastCompletedAt:null,lastFailedAt:null,printers:new Set()});
  }
  const s=summaryMap.get(fn);
  s.totalJobs+=1;
  if(j.isCompleted){
   s.quantity+=1;
   s.totalDuration+=(j.duration||0);
   if(!s.lastCompletedAt||new Date(j.completedAt)>new Date(s.lastCompletedAt)){s.lastCompletedAt=j.completedAt}
  }else{
   s.failedCount+=1;
   s.failedDuration+=(j.duration||0);
   if(!s.lastFailedAt||new Date(j.completedAt)>new Date(s.lastFailedAt)){s.lastFailedAt=j.completedAt}
  }
  if(j.printerName)s.printers.add(j.printerName);
 }
 const summary=Array.from(summaryMap.values()).map(x=>({
  ...x,
  printers:Array.from(x.printers),
  avgDuration:x.quantity?Math.round(x.totalDuration/x.quantity):0,
  successRate:x.totalJobs?Math.round((x.quantity/x.totalJobs)*100):0
 })).sort((a,b)=>b.quantity-a.quantity||b.totalJobs-a.totalJobs);

 res.json({jobs:allJobs.slice(0,3000),summary});
});

app.post('/api/completed-prints/sync',auth,async(_req,res)=>{
 await syncAllHistory();
 res.json({ok:true});
});

app.put('/api/config',auth,(req,res)=>{
 const incoming=req.body;if(!Array.isArray(incoming)||incoming.length>100)return res.status(400).json({error:'Expected up to 100 printers'});
 const ids=new Set();
 for(const p of incoming){if(!p||typeof p.id!=='string'||!/^[-_a-z0-9]{1,48}$/i.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!validHost(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535||typeof p.enabled!=='boolean')return res.status(400).json({error:'Invalid printer configuration'});ids.add(p.id)}
 printers=incoming.map(({id,name,host,port,enabled})=>({id,name,host,port,enabled}));
 save(configFile,printers);current.clear();last.clear();metadataCache.clear();void poll();void syncAllHistory();res.json({ok:true});
});

app.post('/api/test-telegram',auth,(_req,res)=>{void telegram('Test notification from Neptune Print Farm');res.json({ok:true,note:'Delivery attempted; check your Telegram bot chat'})});
const dist=path.join(root,'dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')))}

app.listen(port,'0.0.0.0',()=>console.log('Neptune Print Farm listening on port '+port));
void poll();
setInterval(()=>void poll(),Math.max(2500,Number(process.env.POLL_MS)||5000));
void syncAllHistory();
setInterval(()=>void syncAllHistory(),60000);
