import 'dotenv/config';
import webpush from 'web-push';
import express from 'express';
import os from 'node:os';
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
const configFile=path.join(configDir,'printers.json'),exampleFile=path.join(configDir,'printers.example.json'),historyFile=path.join(dataDir,'events.json'),completedFile=path.join(dataDir,'completed_prints.json'),jobsFile=path.join(dataDir,'print_jobs.json'),clearedFile=path.join(dataDir,'cleared_prints.json'),hostSettingsFile=path.join(dataDir,'host_settings.json'),runoutFile=path.join(dataDir,'runout_state.json');
const defaultHostSettings = {
 farmName: 'Neptune Print Farm',
 primaryIp: '',
 port: Number(process.env.PORT||3080),
 pollMs: Number(process.env.POLL_MS||5000),
 telegramToken: process.env.TELEGRAM_BOT_TOKEN||'',
 telegramChatId: process.env.TELEGRAM_CHAT_ID||'',
 telegramChats: [],
 telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
 telegramEvents: ['completed', 'runout', 'resumed', 'error', 'paused', 'offline'],
 publicTunnelUrl: 'https://neptunemonitor.com'
};
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2),{mode:0o600});
let hostSettings = { ...defaultHostSettings, ...read(hostSettingsFile, {}) };
if (!Array.isArray(hostSettings.telegramChats) || !hostSettings.telegramChats.length) {
 const ids = parseTelegramChatIds(hostSettings.telegramChatId);
 if (ids.length) {
  hostSettings.telegramChats = ids.map(id => ({ id, name: 'Chat ' + id }));
 }
}
const vapidFile = path.join(dataDir, 'vapid.json');
const pushSubsFile = path.join(dataDir, 'push_subscriptions.json');
let vapidKeys = read(vapidFile, null);
if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
 vapidKeys = webpush.generateVAPIDKeys();
 save(vapidFile, vapidKeys);
}
try {
 webpush.setVapidDetails('mailto:support@neptunefarm.local', vapidKeys.publicKey, vapidKeys.privateKey);
} catch (e) {
 console.warn('VAPID setup:', e.message);
}
let pushSubscriptions = read(pushSubsFile, []);

async function sendPushToAll({ title, body, tag, url }) {
 if (!pushSubscriptions.length) return;
 const payload = JSON.stringify({
  title: title || 'Neptune Print Farm',
  body: body || '',
  tag: tag || 'farm-alert',
  url: url || '/'
 });
 const deadEndpoints = new Set();
 await Promise.all(
  pushSubscriptions.map(async (sub) => {
   try {
    await webpush.sendNotification(sub, payload);
   } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
     deadEndpoints.add(sub.endpoint);
    }
   }
  })
 );
 if (deadEndpoints.size > 0) {
  pushSubscriptions = pushSubscriptions.filter((s) => !deadEndpoints.has(s.endpoint));
  save(pushSubsFile, pushSubscriptions);
 }
}
let printers=read(configFile,read(exampleFile,[])),events=read(historyFile,[]),allJobs=read(jobsFile,read(completedFile,[])),clearedPrints=read(clearedFile,{}),runoutState=read(runoutFile,{});
const current=new Map(),last=new Map(),completedState=new Map(),progressSamples=new Map();
const offlineSince=new Map(),offlineAlertSent=new Map();
const secret=process.env.JWT_SECRET,password=process.env.ADMIN_PASSWORD;
if(!secret||secret.length<32||!password||password.startsWith('replace-with')||password.startsWith('change-this')){console.error('Set ADMIN_PASSWORD and a 32+ character JWT_SECRET in .env');process.exit(1)}
const passwordHash=bcrypt.hashSync(password,11);
let currentPasswordHash=hostSettings.passwordHash||passwordHash;

function parseTelegramChatIds(input, chatsList = []) {
 const ids = [];
 if (Array.isArray(chatsList)) {
  for (const c of chatsList) {
   const id = (typeof c === 'object' && c) ? c.id : c;
   if (id) ids.push(String(id).trim());
  }
 }
 if (Array.isArray(input)) {
  for (const item of input) {
   ids.push(...parseTelegramChatIds(item));
  }
 } else if (typeof input === 'string' && input.trim()) {
  const parts = input.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
  ids.push(...parts);
 } else if (input) {
  ids.push(String(input).trim());
 }
 return [...new Set(ids.filter(Boolean))];
}

async function telegram(message, type){
 const token = hostSettings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
 const enabled = hostSettings.telegramEnabled !== false;
 if(!token || !enabled) return;
 if(type && Array.isArray(hostSettings.telegramEvents) && !hostSettings.telegramEvents.includes(type)) return;

 const chatIds = parseTelegramChatIds(hostSettings.telegramChatId, hostSettings.telegramChats);
 if(!chatIds.length) return;

 const text = '🖨 ' + (hostSettings.farmName || 'Neptune Print Farm') + '\n' + message;

 await Promise.allSettled(chatIds.map(async (cid) => {
  try {
   const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: cid, text }),
    signal: AbortSignal.timeout(9000)
   });
   if(!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.warn(`Telegram HTTP ${r.status} for chat ${cid}:`, err.description || '');
   }
  } catch(e) {
   console.warn(`Telegram error for chat ${cid}:`, e.message);
  }
 }));
}

function formatHoldDuration(seconds) {
 const s = Math.max(0, Math.round(seconds || 0));
 const h = Math.floor(s / 3600);
 const m = Math.floor((s % 3600) / 60);
 const remS = s % 60;
 if (h > 0) return `${h}h ${m}m ${remS}s`;
 if (m > 0) return `${m}m ${remS}s`;
 return `${remS}s`;
}

function record(printerId,type,message){
 events.unshift({id:crypto.randomUUID(),printerId,type,message,time:new Date().toISOString()});
 events=events.slice(0,2000);save(historyFile,events);
 if(['completed','paused','error','runout','offline','resumed'].includes(type)){
  const tgType = (type === 'offline' && !hostSettings.telegramEvents?.includes('offline')) ? 'error' : ((type === 'resumed' && !hostSettings.telegramEvents?.includes('resumed')) ? 'runout' : type);
  void telegram(message, tgType);
  let title = '🖨 Neptune Farm Alert';
  if (type === 'completed') title = '🎉 Print Finished!';
  else if (type === 'runout') title = '⚠️ Filament Runout Detected!';
  else if (type === 'resumed') title = '▶️ Filament Reloaded & Resumed';
  else if (type === 'error') title = '🚨 Printer Error / Shutdown!';
  else if (type === 'paused') title = '⏸️ Print Paused';
  else if (type === 'offline') title = '⚠️ Printer Offline (>5 min)';
  void sendPushToAll({
   title,
   body: message,
   tag: 'farm-' + type,
   url: '/'
  });
 }
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

function normalize(p,body,meta,compInfo,isKlippyShutdown,shutdownReason){
 const s=body?.result?.status||{},ps=s.print_stats||{},sd=s.virtual_sdcard||{},gm=s.gcode_move||{},wh=s.webhooks||{};
 const sensed=Object.entries(s).filter(([k])=>k.startsWith('filament_switch_sensor ')||k.startsWith('filament_motion_sensor ')||k.startsWith('filament_sensor')||k.includes('filament'));
 const enabled=sensed.filter(([,v])=>v && v.enabled!==0 && v.enabled!==false);
 const filament=enabled.length?enabled.every(([,v])=>v.filament_detected===true||v.filament_detected===1):null;
 const state=ps.state||'unknown';
 const statuses={printing:'printing',paused:'paused',complete:'completed',error:'error',cancelled:'cancelled',standby:'idle'};
 const isShutdown = Boolean(
  isKlippyShutdown ||
  wh.state === 'shutdown' ||
  wh.state === 'error' ||
  state === 'error' ||
  (typeof wh.state_message === 'string' && (wh.state_message.includes('shutdown') || wh.state_message.includes('Printer is shutdown') || wh.state_message.includes('not heating at expected rate') || wh.state_message.includes('verify_heater'))) ||
  (typeof ps.message === 'string' && (ps.message.includes('shutdown') || ps.message.includes('Printer is shutdown')))
 );
 const activeShutdownReason = (shutdownReason || wh.state_message || ps.message || (isShutdown ? 'Printer is shutdown' : null));
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
 const duration=Math.round(ps.print_duration||0),progressRatio=Math.max(0,Math.min(1,sd.progress||0));
 const speedFactor=(typeof gm?.speed_factor==='number'&&gm.speed_factor>0.05&&gm.speed_factor<10)
  ?Number(gm.speed_factor.toFixed(2))
  :1.0;

 if((state==='printing'||state==='paused')&&!isShutdown){
  if(progressRatio>=0.999){
   remainingTime=0;
   totalDuration=duration;
   eta=new Date().toISOString();
  }else{
   const remainingRatio=Math.max(0,1-progressRatio);
   const slicerEst=(typeof meta?.estimated_time==='number'&&meta.estimated_time>0)?meta.estimated_time:null;

   // 1. Slicer remaining adjusted immediately by current real-time speed factor
   let slicerRemaining=null;
   if(slicerEst){
    slicerRemaining=Math.max(0,Math.round((slicerEst*remainingRatio)/speedFactor));
   }

   // 2. Rolling velocity from recent samples (last 20-90 seconds)
   const now=Date.now();
   let samples=progressSamples.get(p.id)||[];
   if(samples.length&&(samples[samples.length-1].file!==ps.filename||progressRatio<samples[samples.length-1].progress-0.05)){
    samples=[];
   }
   samples.push({time:now,progress:progressRatio,duration,file:ps.filename});
   samples=samples.filter(s=>now-s.time<=90000);
   progressSamples.set(p.id,samples);

   let rollingRemaining=null;
   if(samples.length>=3){
    const oldest=samples[0];
    const deltaTime=(now-oldest.time)/1000;
    const deltaProgress=progressRatio-oldest.progress;
    if(deltaTime>=15&&deltaProgress>0.0002){
     const progressPerSec=deltaProgress/deltaTime;
     if(progressPerSec>0){
      rollingRemaining=Math.max(0,Math.round(remainingRatio/progressPerSec));
     }
    }
   }

   // 3. Cumulative progress estimate (adjusted by speed factor)
   let cumulativeRemaining=null;
   if(progressRatio>0.01&&duration>20){
    const secPerRatio=duration/progressRatio;
    cumulativeRemaining=Math.max(0,Math.round((secPerRatio*remainingRatio)/speedFactor));
   }

   // 4. Blend to compute accurate remainingTime
   if(slicerRemaining!=null){
    if(rollingRemaining!=null&&rollingRemaining>15&&rollingRemaining<slicerRemaining*2.5&&rollingRemaining>slicerRemaining*0.35){
     const weight=Math.min(0.65,0.3+progressRatio*0.35);
     remainingTime=Math.round(slicerRemaining*(1-weight)+rollingRemaining*weight);
    }else{
     remainingTime=slicerRemaining;
    }
   }else if(rollingRemaining!=null&&rollingRemaining>15){
    remainingTime=rollingRemaining;
   }else if(cumulativeRemaining!=null){
    remainingTime=cumulativeRemaining;
   }

   if(remainingTime!=null&&remainingTime>=0){
    totalDuration=Math.round(duration+remainingTime);
    eta=new Date(now+remainingTime*1000).toISOString();
   }
  }
 }

  let computedStatus = statuses[state]||'unknown';
 if(isShutdown){
  computedStatus = 'error';
 }else if(compInfo && state!=='printing'){
  computedStatus='completed';
 }else if(state==='complete'||(state==='standby'&&sd.progress>=0.98&&ps.filename&&duration>30)){
  computedStatus='completed';
 }
 const isRunout = (filament === false && computedStatus !== 'completed' && !isShutdown);
 if(isRunout && (computedStatus === 'idle' || computedStatus === 'unknown' || computedStatus === 'standby' || computedStatus === 'paused')){
  computedStatus = 'runout';
 }
 const finalProgress=computedStatus==='completed'?100:Math.max(0,Math.min(100,Math.round((sd.progress||0)*100)));
 const finalFile=computedStatus==='completed'?(compInfo?.file||ps.filename||''):(ps.filename||'');
 const finalDuration=computedStatus==='completed'?(compInfo?.duration||duration):duration;
 const finalFilament=computedStatus==='completed'?(compInfo?.filamentUsed||ps.filament_used||0):(ps.filament_used||0);

 return {
  ...p,
  connected:true,
  status:computedStatus,
  rawState:isShutdown ? 'shutdown' : state,
  isShutdown:Boolean(isShutdown),
  shutdownReason:isShutdown ? activeShutdownReason : null,
  error:isShutdown ? activeShutdownReason : null,
  file:finalFile,
  progress:finalProgress,
  duration:finalDuration,
  totalDuration,
  remainingTime:computedStatus==='completed'?null:remainingTime,
  eta:computedStatus==='completed'?null:eta,
  speedFactor,
  filamentUsed:finalFilament,
  layer,
  totalLayers,
  z:currentZ,
  nozzle:s.extruder?.temperature??null,
  nozzleTarget:s.extruder?.target??null,
  bed:s.heater_bed?.temperature??null,
  bedTarget:s.heater_bed?.target??null,
  filamentDetected:filament,
  filamentRunout:isRunout,
  filamentSensors:sensed.map(([name])=>name),
  runoutHoldSec: runoutState[p.id] ? Math.max(0, Math.round((Date.now() - (runoutState[p.id].startTime || new Date(runoutState[p.id].startedAt).getTime())) / 1000)) : null,
  runoutStartedAt: runoutState[p.id]?.startedAt || null,
  completedAt:compInfo?.completedAt||null,
  updatedAt:new Date().toISOString()
 };
}

async function scan(p){
 if(!p.enabled){current.set(p.id,{...p,status:'disabled',connected:false});return}
 if(!validHost(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535){current.set(p.id,{...p,status:'error',connected:false,error:'Invalid host or port'});return}
 try{
  const endpoint='http://'+p.host+':'+p.port;
  const discovery=await fetch(endpoint+'/printer/objects/list',{signal:AbortSignal.timeout(4500)});
  if(!discovery.ok)throw Error('Discovery HTTP '+discovery.status);
  const obj=await discovery.json();if(obj.error)throw Error(obj.error.message||'Moonraker discovery error');
  const names=(obj.result?.objects||[]).filter(x=>x.startsWith('filament_switch_sensor ')||x.startsWith('filament_motion_sensor ')||x.startsWith('filament_sensor')||x.includes('filament'));
  const query=['print_stats','virtual_sdcard','extruder','heater_bed','gcode_move','webhooks',...names].map(encodeURIComponent).join('&');
  
  const [response, gcodeRes, histRes, infoRes] = await Promise.all([
   fetch(endpoint+'/printer/objects/query?'+query,{signal:AbortSignal.timeout(5500)}),
   fetch(endpoint+'/server/gcode_store?count=30',{signal:AbortSignal.timeout(4500)}).catch(()=>null),
   fetch(endpoint+'/server/history/list?limit=1',{signal:AbortSignal.timeout(4500)}).catch(()=>null),
   fetch(endpoint+'/printer/info',{signal:AbortSignal.timeout(4500)}).catch(()=>null)
  ]);
  if(!response.ok)throw Error('Status HTTP '+response.status);
  const body=await response.json();if(body.error)throw Error(body.error.message||'Moonraker status error');
  
  const gcodeData=gcodeRes&&gcodeRes.ok?await gcodeRes.json().catch(()=>null):null;
  const histData=histRes&&histRes.ok?await histRes.json().catch(()=>null):null;
  const infoData=infoRes&&infoRes.ok?await infoRes.json().catch(()=>null):null;
  const wh=body?.result?.status?.webhooks||{};
  const info=infoData?.result||{};
  const whState=wh.state||info.state||'';
  const whMsg=(wh.state_message||info.state_message||'').trim();
  
  const isKlippyShutdown=Boolean(
   whState==='shutdown' ||
   whState==='error' ||
   body?.result?.status?.print_stats?.state==='error' ||
   whMsg.includes('shutdown') ||
   whMsg.includes('Printer is shutdown') ||
   whMsg.includes('not heating at expected rate') ||
   whMsg.includes('verify_heater') ||
   whMsg.includes('FIRMWARE_RESTART')
  );
  const shutdownReason=isKlippyShutdown?(whMsg||'Printer is shutdown'):null;
  const gcodeLogs=(gcodeData?.result?.gcode_store||[]).map(x=>x.message||'');
  const hasCompletionLog=gcodeLogs.some(m=>
   m.includes('Done printing file')||
   m.includes('Command {clear_plr} finished')||
   m.includes('Running Command {clear_plr}')||
   m.includes('clear_plr')
  );
  
  const latestJob=histData?.result?.jobs?.[0]||null;
  const isJobCompleted=(latestJob?.status==='completed');
  const isCleared=latestJob&&clearedPrints[p.id]?.jobId===latestJob.job_id;
  const prev=last.get(p.id);
  const rawState=body?.result?.status?.print_stats?.state||'unknown';
  const duration=Math.round(body?.result?.status?.print_stats?.print_duration||0);
  const progressRatio=body?.result?.status?.virtual_sdcard?.progress||0;

  if(isKlippyShutdown){
   completedState.delete(p.id);
  }else if(rawState==='printing'){
   completedState.delete(p.id);
   if(latestJob?.job_id&&clearedPrints[p.id]?.jobId!==latestJob.job_id){
    clearedPrints[p.id]={jobId:latestJob.job_id,startedAt:new Date().toISOString()};
    save(clearedFile,clearedPrints);
   }
  }else{
   const shouldBeCompleted = (
    rawState==='complete' ||
    completedState.has(p.id) ||
    (isJobCompleted && !isCleared) ||
    (hasCompletionLog && (!clearedPrints[p.id] || clearedPrints[p.id]?.jobId!==latestJob?.job_id)) ||
    ((prev?.status==='printing'||prev?.status==='paused') && rawState==='standby' && (prev?.progress>=92 || duration>60 || progressRatio>=0.95))
   );

   if(shouldBeCompleted){
    const existingComp=completedState.get(p.id);
    const compFile=latestJob?.filename||existingComp?.file||prev?.file||body?.result?.status?.print_stats?.filename||'Completed Model';
    const compDuration=(latestJob?.print_duration&&latestJob.print_duration>0)?Math.round(latestJob.print_duration):(existingComp?.duration||prev?.duration||duration||0);
    const compFilament=latestJob?.filament_used||existingComp?.filamentUsed||prev?.filamentUsed||0;
    const compCompletedAt=existingComp?.completedAt||(latestJob?.end_time?new Date(latestJob.end_time*1000).toISOString():new Date().toISOString());
    const compJobId=latestJob?.job_id||existingComp?.jobId||null;

    completedState.set(p.id,{
     file:compFile,
     duration:compDuration,
     filamentUsed:compFilament,
     completedAt:compCompletedAt,
     jobId:compJobId
    });
   }
  }

  const compInfo=completedState.get(p.id)||null;
  const filename=compInfo?.file||body?.result?.status?.print_stats?.filename;
  const meta=filename?await fetchMetadata(endpoint,filename):null;
  const next=normalize(p,body,meta,compInfo,isKlippyShutdown,shutdownReason);
  current.set(p.id,next);last.set(p.id,next);

  // If printer was previously offline, handle reconnect & clear alert tracking
  if(offlineSince.has(p.id)){
   const wasAlerted=offlineAlertSent.get(p.id);
   offlineSince.delete(p.id);
   offlineAlertSent.delete(p.id);
   if(wasAlerted){
    record(p.id,'offline',`${p.name}: Back ONLINE (reconnected)`);
   }
  }

  // 1. Filament Runout tracking & notification
  const isNowRunout = Boolean(next.filamentRunout || next.filamentDetected === false || next.status === 'runout');
  if (isNowRunout && !isKlippyShutdown) {
   if (!runoutState[p.id]) {
    runoutState[p.id] = {
     startedAt: new Date().toISOString(),
     startTime: Date.now(),
     file: next.file || prev?.file || ''
    };
    save(runoutFile, runoutState);
    record(p.id, 'runout', `${p.name}: Filament runout detected! Print paused waiting for reload`);
   }
  }

  // 2. Filament Reloaded & Print Resumed notification with exact hold duration
  if (runoutState[p.id]) {
   const isResumed = (next.status === 'printing' || next.rawState === 'printing') && next.filamentDetected !== false;
   if (isResumed) {
    const startMs = runoutState[p.id].startTime || (runoutState[p.id].startedAt ? new Date(runoutState[p.id].startedAt).getTime() : Date.now());
    const holdSec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    const holdStr = formatHoldDuration(holdSec);
    const resumeMsg = `${p.name}: Filament reloaded & print resumed! Printer hold time: ${holdStr}`;
    record(p.id, 'resumed', resumeMsg);
    delete runoutState[p.id];
    save(runoutFile, runoutState);
   } else if (next.status === 'cancelled' || next.status === 'completed' || (next.status === 'idle' && !next.file)) {
    delete runoutState[p.id];
    save(runoutFile, runoutState);
   }
  }

  if(prev?.connected&&prev.status!==next.status){
   if(['completed','error'].includes(next.status) || (next.status==='paused' && !isNowRunout)){
    record(p.id,next.status,p.name+': '+next.status.toUpperCase()+' — '+(next.file||'No filename'));
   }
   if(next.status==='completed'&&next.file){
    const liveId=p.id+'_live_'+Date.now();
    const existing=allJobs.find(x=>x.printerId===p.id&&x.file===next.file&&Math.abs(new Date(x.completedAt)-new Date(next.completedAt||Date.now()))<60000);
    if(!existing){
     allJobs.unshift({
      id:liveId,
      jobId:compInfo?.jobId||null,
      printerId:p.id,
      printerName:p.name,
      file:next.file,
      status:'completed',
      isCompleted:true,
      isFailed:false,
      completedAt:next.completedAt||new Date().toISOString(),
      duration:next.duration||0,
      filamentUsed:next.filamentUsed||0
     });
     if(allJobs.length>4000)allJobs=allJobs.slice(0,4000);
     save(jobsFile,allJobs);
     save(completedFile,allJobs.filter(x=>x.isCompleted));
     void syncPrinterHistory(p);
    }
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
  }
 }catch(e){
  const previous=last.get(p.id);
  const errMsg=e.message||'Unknown error';
  let isShutdown=errMsg.includes('shutdown')||errMsg.includes('Printer is shutdown')||errMsg.includes('not heating at expected rate')||errMsg.includes('verify_heater')||errMsg.includes('FIRMWARE_RESTART');
  let shutdownReason=null;
  try{
   const infoCheck=await fetch('http://'+p.host+':'+p.port+'/printer/info',{signal:AbortSignal.timeout(2000)});
   if(infoCheck.ok){
    const infoBody=await infoCheck.json();
    if(infoBody.result?.state==='shutdown'||infoBody.result?.state==='error'||(typeof infoBody.result?.state_message==='string'&&infoBody.result.state_message.includes('shutdown'))){
     isShutdown=true;
     shutdownReason=(infoBody.result?.state_message||'Printer is shutdown').trim();
    }
   }
  }catch{}

  if(!offlineSince.has(p.id)){
   offlineSince.set(p.id,Date.now());
  }
  const elapsedMs=Date.now()-offlineSince.get(p.id);
  const FIVE_MINUTES_MS=5*60*1000;

  // Brief network jitter smoothing (under 15s) when previously printing so dashboard doesn't flicker
  const isBriefNetworkGlitch=!isShutdown && elapsedMs<15000 && previous?.connected && previous?.status==='printing';

  const next={
   ...p,
   connected: isShutdown ? false : (isBriefNetworkGlitch ? true : false),
   status: isShutdown ? 'error' : (isBriefNetworkGlitch ? previous.status : 'offline'),
   rawState: isShutdown ? 'shutdown' : 'offline',
   isShutdown,
   shutdownReason: shutdownReason || (isShutdown ? errMsg : null),
   error: shutdownReason || errMsg,
   updatedAt: previous?.updatedAt || null,
   progress: previous?.progress || 0,
   file: previous?.file || '',
   duration: previous?.duration || 0,
   offlineSince: offlineSince.get(p.id)
  };
  current.set(p.id,next);last.set(p.id,next);

  if(isShutdown){
   // Real Klipper hardware shutdown (e.g. bed verify heater error) -> Alert immediately
   if(previous?.connected && !previous?.isShutdown){
    record(p.id,'error',p.name+': SHUTDOWN ('+(shutdownReason||errMsg)+')');
   }
  }else{
   // Network / Moonraker timeout -> Only send notification if printer has been offline continuously for > 5 minutes!
   if(elapsedMs>=FIVE_MINUTES_MS && !offlineAlertSent.get(p.id)){
    offlineAlertSent.set(p.id,true);
    const mins=Math.round(elapsedMs/60000);
    record(p.id,'offline',`${p.name}: OFFLINE for >${mins} min (${shutdownReason||errMsg})`);
   }
  }
 }
}

let running=false;
async function poll(){if(running)return;running=true;try{await Promise.all(printers.map(scan))}finally{running=false}}
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'40kb'}));app.use(cookieParser());
const limitLogin=rateLimit({windowMs:900000,limit:12,standardHeaders:'draft-7',legacyHeaders:false});

app.post('/api/login',limitLogin,async(req,res)=>{
 if(typeof req.body?.password!=='string'||!(await bcrypt.compare(req.body.password,currentPasswordHash)))return res.status(401).json({error:'Invalid password'});
 const token=jwt.sign({role:'admin'},secret,{expiresIn:'12h'});
 res.cookie('farm_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',maxAge:43200000});
 res.json({ok:true});
});
app.post('/api/logout',(_req,res)=>{res.clearCookie('farm_session');res.json({ok:true})});

function auth(req,res,next){try{if(jwt.verify(req.cookies.farm_session,secret).role!=='admin')throw Error('Denied');next()}catch{res.status(401).json({error:'Login required'})}}

function getNetworkInfo(req){
 const nets=os.networkInterfaces();
 const localIps=[];
 for(const name of Object.keys(nets)){
  for(const net of nets[name]||[]){
   if(net.family==='IPv4'&&!net.internal){
    localIps.push({interface:name,address:net.address,netmask:net.netmask});
   }
  }
 }
 const primaryIp=(hostSettings.primaryIp&&hostSettings.primaryIp.trim())||localIps[0]?.address||'127.0.0.1';
 const forwarded=req?.headers['x-forwarded-for'];
 const clientIp=(typeof forwarded==='string'?forwarded.split(',')[0].trim():'')||req?.socket?.remoteAddress||'';
 const isLocalClient=(
  !clientIp||
  clientIp.includes('127.0.0.1')||
  clientIp.includes('::1')||
  clientIp.startsWith('172.16.')||
  clientIp.startsWith('192.168.')||
  clientIp.startsWith('10.')||
  localIps.some(x=>x.address===clientIp)
 );
 return {
  hostname:os.hostname(),
  port,
  primaryIp,
  localIps,
  clientIp,
  isLocalClient,
  serverTime:new Date().toISOString(),
  uptimeSec:Math.round(process.uptime()),
  totalPrinters:printers.length,
  onlinePrinters:printers.filter(p=>current.get(p.id)?.connected).length
 };
}

app.get('/api/system-info',(req,res)=>{
 const net=getNetworkInfo(req);
 let authed=false;
 try{
  if(req.cookies.farm_session&&jwt.verify(req.cookies.farm_session,secret).role==='admin')authed=true;
 }catch{}
 res.json({...net,authenticated:authed});
});

app.all('/api/printers/:id/proxy/*',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 const subpath=req.params[0]||'';
 const queryString=req.url.includes('?')?'?'+req.url.split('?')[1]:'';
 const targetUrl='http://'+p.host+':'+p.port+'/'+subpath+queryString;
 try{
  const options={
   method:req.method,
   headers:{
    'accept':req.headers['accept']||'*/*',
    'content-type':req.headers['content-type']||'application/json'
   },
   signal:AbortSignal.timeout(12000)
  };
  if(['POST','PUT','PATCH'].includes(req.method)&&req.body&&Object.keys(req.body).length>0){
   options.body=JSON.stringify(req.body);
  }
  const proxied=await fetch(targetUrl,options);
  res.status(proxied.status);
  const ct=proxied.headers.get('content-type');
  if(ct)res.setHeader('content-type',ct);
  const buf=await proxied.arrayBuffer();
  res.send(Buffer.from(buf));
 }catch(err){
  res.status(502).json({error:'Failed to proxy to printer '+p.host+': '+err.message});
 }
});

app.post('/api/printers/:id/command',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 const {action,gcode}=req.body||{};
 let targetPath='',payload=null;
 if(action==='pause')targetPath='/printer/print/pause';
 else if(action==='resume')targetPath='/printer/print/resume';
 else if(action==='cancel')targetPath='/printer/print/cancel';
 else if(action==='emergency_stop')targetPath='/printer/emergency_stop';
 else if(action==='firmware_restart')targetPath='/printer/firmware_restart';
 else if(action==='cooldown'){targetPath='/printer/gcode/script';payload={script:'M104 S0\nM140 S0\nM106 S0'}}
 else if(action==='home'){targetPath='/printer/gcode/script';payload={script:'G28'}}
 else if(action==='gcode'||typeof gcode==='string'){
  const script=(gcode||'').trim();
  if(!script)return res.status(400).json({error:'Empty G-code command'});
  targetPath='/printer/gcode/script';
  payload={script};
 }else{
  return res.status(400).json({error:'Unknown action: '+action});
 }

 try{
  const endpoint='http://'+p.host+':'+p.port+targetPath;
  const r=await fetch(endpoint,{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:payload?JSON.stringify(payload):undefined,
   signal:AbortSignal.timeout(9000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   const errMsg=data?.error?.message||`Moonraker HTTP ${r.status}`;
   return res.status(400).json({error:errMsg});
  }
  const cmdDesc=action==='gcode'?(gcode||'G-code'):(action||'command');
  record(p.id,'command',`${p.name}: Remote command [${cmdDesc}] executed`);
  void poll();
  res.json({ok:true,result:data?.result||'ok'});
 }catch(err){
  res.status(502).json({error:'Failed to communicate with printer '+p.host+': '+err.message});
 }
});

app.get('/api/printers/:id/console',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 try{
  const count=Math.min(100,Math.max(10,Number(req.query.count)||50));
  const r=await fetch(`http://${p.host}:${p.port}/server/gcode_store?count=${count}`,{signal:AbortSignal.timeout(4500)});
  if(!r.ok)return res.status(r.status).json({error:'Moonraker error '+r.status});
  const data=await r.json();
  res.json({ok:true,logs:data?.result?.gcode_store||[]});
 }catch(err){
  res.status(502).json({error:'Failed to fetch printer console: '+err.message});
 }
});

app.post('/api/printers/:id/clear-completed',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p)return res.status(404).json({error:'Printer not found'});
 const comp=completedState.get(p.id);
 completedState.delete(p.id);
 const jobId=comp?.jobId||'cleared_'+Date.now();
 clearedPrints[p.id]={jobId,clearedAt:new Date().toISOString(),filename:comp?.file||''};
 save(clearedFile,clearedPrints);
 const cur=current.get(p.id);
 if(cur){
  const updated={...cur,status:cur.rawState==='printing'?'printing':'idle',progress:cur.rawState==='printing'?cur.progress:0};
  current.set(p.id,updated);last.set(p.id,updated);
 }
 record(p.id,'cleared',`${p.name}: Bed cleared, printer ready for next job`);
 res.json({ok:true});
});

app.get('/api/me',auth,(_req,res)=>res.json({ok:true}));
app.get('/api/printers',auth,(_req,res)=>{
 const list=printers.map(p=>current.get(p.id)||{...p,status:'connecting',connected:false});
 list.sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'}));
 res.json(list);
});
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

app.get('/api/host-settings', auth, (req, res) => {
 const net = getNetworkInfo(req);
 const memory = process.memoryUsage();
 const totalMem = os.totalmem();
 const freeMem = os.freemem();
 res.json({
  farmName: hostSettings.farmName || 'Neptune Print Farm',
  primaryIp: hostSettings.primaryIp || net.primaryIp,
  port: hostSettings.port || port,
  pollMs: hostSettings.pollMs || 5000,
  telegramToken: hostSettings.telegramToken || '',
  telegramChatId: hostSettings.telegramChatId || '',
  telegramChats: hostSettings.telegramChats || [],
  telegramEnabled: hostSettings.telegramEnabled !== false,
  telegramEvents: hostSettings.telegramEvents || ['completed', 'runout', 'resumed', 'error', 'paused', 'offline'],
  publicTunnelUrl: hostSettings.publicTunnelUrl || 'https://neptunemonitor.com',
  system: {
   hostname: os.hostname(),
   platform: os.platform(),
   release: os.release(),
   arch: os.arch(),
   cpus: os.cpus().length,
   nodeVersion: process.version,
   uptimeSec: Math.round(process.uptime()),
   systemUptimeSec: Math.round(os.uptime()),
   totalMemBytes: totalMem,
   freeMemBytes: freeMem,
   usedMemBytes: totalMem - freeMem,
   processMemRss: memory.rss,
   localIps: net.localIps,
   clientIp: net.clientIp,
   isLocalClient: net.isLocalClient
  }
 });
});

app.put('/api/host-settings', auth, (req, res) => {
 const incoming = req.body || {};
 if (typeof incoming.farmName === 'string') {
  hostSettings.farmName = incoming.farmName.trim().slice(0, 60) || 'Neptune Print Farm';
 }
 if (typeof incoming.primaryIp === 'string') {
  hostSettings.primaryIp = incoming.primaryIp.trim().slice(0, 45);
 }
 if (Number.isInteger(incoming.pollMs) && incoming.pollMs >= 2000 && incoming.pollMs <= 60000) {
  hostSettings.pollMs = incoming.pollMs;
 }
 if (typeof incoming.telegramToken === 'string') {
  hostSettings.telegramToken = incoming.telegramToken.trim();
 }
 if (Array.isArray(incoming.telegramChats)) {
  const cleanChats = [];
  const seen = new Set();
  for (const c of incoming.telegramChats) {
   const id = String((typeof c === 'object' && c) ? (c.id || '') : (c || '')).trim();
   const name = String((typeof c === 'object' && c) ? (c.name || '') : '').trim();
   if (id && !seen.has(id)) {
    seen.add(id);
    cleanChats.push({ id, name: name || ('Chat ' + id) });
   }
  }
  hostSettings.telegramChats = cleanChats;
  hostSettings.telegramChatId = cleanChats.map(c => c.id).join(', ');
 } else if (typeof incoming.telegramChatId === 'string') {
  hostSettings.telegramChatId = incoming.telegramChatId.trim();
  const ids = parseTelegramChatIds(hostSettings.telegramChatId);
  const existingMap = new Map((hostSettings.telegramChats || []).map(c => [c.id, c.name]));
  hostSettings.telegramChats = ids.map(id => ({ id, name: existingMap.get(id) || ('Chat ' + id) }));
 }
 if (typeof incoming.telegramEnabled === 'boolean') {
  hostSettings.telegramEnabled = incoming.telegramEnabled;
 }
 if (Array.isArray(incoming.telegramEvents)) {
  hostSettings.telegramEvents = incoming.telegramEvents.filter(x => ['completed', 'runout', 'resumed', 'error', 'paused', 'offline'].includes(x));
 }
 if (typeof incoming.publicTunnelUrl === 'string') {
  hostSettings.publicTunnelUrl = incoming.publicTunnelUrl.trim();
 }
 save(hostSettingsFile, hostSettings);
 res.json({ ok: true, message: 'Host settings updated successfully' });
});

app.post('/api/host-settings/password', auth, async (req, res) => {
 const { currentPassword, newPassword } = req.body || {};
 if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
 if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
 const valid = await bcrypt.compare(currentPassword, currentPasswordHash);
 if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
 currentPasswordHash = bcrypt.hashSync(newPassword, 11);
 hostSettings.passwordHash = currentPasswordHash;
 save(hostSettingsFile, hostSettings);
 res.json({ ok: true, message: 'Admin password updated successfully' });
});

app.post('/api/host-settings/test-telegram', auth, async (req, res) => {
 const token = req.body?.token || hostSettings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
 const targetChat = req.body?.chatId;
 const chatIds = targetChat ? parseTelegramChatIds(targetChat, req.body?.chats) : parseTelegramChatIds(hostSettings.telegramChatId, hostSettings.telegramChats);
 if (!token || !chatIds.length) return res.status(400).json({ error: 'Telegram Bot Token and at least one Chat ID are required' });
 try {
  const text = '🔔 Test alert from ' + (hostSettings.farmName || 'Neptune Print Farm') + ' Host!\nHost bridge telemetry is operational on multiple chat IDs.';
  const successful = [];
  const failures = [];
  await Promise.all(chatIds.map(async (cid) => {
   try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ chat_id: cid, text }),
     signal: AbortSignal.timeout(9000)
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
     successful.push(cid);
    } else {
     failures.push(`${cid} (${data.description || ('HTTP ' + r.status)})`);
    }
   } catch(e) {
    failures.push(`${cid} (${e.message})`);
   }
  }));

  if (!successful.length) {
   return res.status(400).json({ error: 'Failed to deliver to any chat: ' + failures.join(', ') });
  }

  let msg = `Delivered to ${successful.length} chat(s) [${successful.join(', ')}]!`;
  if (failures.length) {
   msg += ` Failed for: ${failures.join(', ')}`;
  }
  res.json({ ok: true, message: msg, delivered: successful, failed: failures });
 } catch(e) {
  res.status(500).json({ error: 'Failed to contact Telegram API: ' + e.message });
 }
});


app.get('/api/push-vapid-key', (_req, res) => {
 res.json({ publicKey: vapidKeys.publicKey });
});

app.get('/api/push-status', auth, (_req, res) => {
 res.json({ count: pushSubscriptions.length, devices: pushSubscriptions.map(s => ({ createdAt: s.createdAt, userAgent: s.userAgent })) });
});

app.post('/api/push-subscribe', auth, (req, res) => {
 const sub = req.body;
 if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
  return res.status(400).json({ error: 'Invalid push subscription' });
 }
 const idx = pushSubscriptions.findIndex((s) => s.endpoint === sub.endpoint);
 if (idx >= 0) {
  pushSubscriptions[idx] = {
   ...sub,
   updatedAt: new Date().toISOString(),
   userAgent: req.headers['user-agent'] || ''
  };
 } else {
  pushSubscriptions.push({
   ...sub,
   createdAt: new Date().toISOString(),
   userAgent: req.headers['user-agent'] || ''
  });
 }
 save(pushSubsFile, pushSubscriptions);
 res.json({ ok: true, count: pushSubscriptions.length });
});

app.post('/api/push-test', auth, async (_req, res) => {
 if (!pushSubscriptions.length) {
  return res.status(400).json({
   error: 'No phone or browser is subscribed yet. Tap "Enable Push Notifications" in your phone app first!'
  });
 }
 await sendPushToAll({
  title: '🔔 Neptune Farm Test Alert',
  body: 'Push notifications are working live on your Android phone!',
  tag: 'test'
 });
 res.json({ ok: true, message: 'Notification sent to ' + pushSubscriptions.length + ' registered device(s)!' });
});

app.post('/api/host-settings/detect-telegram-chat', auth, async (req, res) => {
 const token = req.body?.token || hostSettings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
 if (!token) return res.status(400).json({ error: 'Telegram Bot Token is required' });
 try {
  const r = await fetch('https://api.telegram.org/bot' + token + '/getUpdates', { signal: AbortSignal.timeout(9000) });
  const data = await r.json();
  if (!r.ok) return res.status(400).json({ error: data.description || 'Failed to query Telegram' });
  const updates = data.result || [];
  if (!updates.length) {
   return res.status(404).json({
    error: 'No messages found yet! Please ask each user/group to open @vijaydreamcast_bot in Telegram, press START (or send "hi"), then click Auto-Detect again.'
   });
  }

  const detectedMap = new Map();
  for (const u of updates) {
   const msg = u.message || u.channel_post || u.my_chat_member || u.callback_query?.message;
   const chat = msg?.chat;
   if (chat?.id) {
    const idStr = String(chat.id);
    const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || ('Chat ' + idStr);
    detectedMap.set(idStr, { id: idStr, name, type: chat.type || 'private' });
   }
  }
  const detectedList = Array.from(detectedMap.values());
  if (!detectedList.length) {
   return res.status(404).json({ error: 'Could not extract any Chat IDs from recent updates' });
  }

  const existingList = Array.isArray(hostSettings.telegramChats) ? hostSettings.telegramChats : [];
  const mergedMap = new Map();
  for (const c of existingList) {
   if (c?.id) mergedMap.set(String(c.id), c);
  }
  for (const c of detectedList) {
   mergedMap.set(c.id, c);
  }

  const allMerged = Array.from(mergedMap.values());
  hostSettings.telegramChats = allMerged;
  hostSettings.telegramChatId = allMerged.map(c => c.id).join(', ');
  save(hostSettingsFile, hostSettings);

  res.json({
   ok: true,
   chats: detectedList,
   allChats: allMerged,
   chatId: hostSettings.telegramChatId,
   message: `Successfully connected ${allMerged.length} Telegram chat(s): ${allMerged.map(c => `${c.name} (${c.id})`).join(', ')}`
  });
 } catch(e) {
  res.status(500).json({ error: 'Failed to reach Telegram API: ' + e.message });
 }
});

app.post('/api/test-telegram',auth,(_req,res)=>{void telegram('Test notification from Neptune Print Farm');res.json({ok:true,note:'Delivery attempted; check your Telegram bot chat'})});
const dist=path.join(root,'dist');
if(fs.existsSync(dist)){
 app.use(express.static(dist,{
  setHeaders:(res,filePath)=>{
   if(filePath.endsWith('.html'))res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  }
 }));
 app.get('*',(_req,res)=>{
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(dist,'index.html'));
 });
}

app.listen(port,'0.0.0.0',()=>console.log('Neptune Print Farm listening on port '+port));
void poll();
setInterval(()=>void poll(),Math.max(2500,Number(process.env.POLL_MS)||5000));
void syncAllHistory();
setInterval(()=>void syncAllHistory(),60000);
