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

process.on('uncaughtException', (err) => {
 console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
 console.error('Unhandled Rejection:', reason);
});
const app=express(),port=Number(process.env.PORT||3080),root=process.cwd();
app.set('trust proxy', 1);
const dataDir=path.join(root,'data'),configDir=path.join(root,'config');
fs.mkdirSync(dataDir,{recursive:true});
const configFile=path.join(configDir,'printers.json'),exampleFile=path.join(configDir,'printers.example.json'),historyFile=path.join(dataDir,'events.json'),completedFile=path.join(dataDir,'completed_prints.json'),jobsFile=path.join(dataDir,'print_jobs.json'),clearedFile=path.join(dataDir,'cleared_prints.json'),hostSettingsFile=path.join(dataDir,'host_settings.json'),runoutFile=path.join(dataDir,'runout_state.json'),jobHoldFile=path.join(dataDir,'job_holds.json'),jobStartsFile=path.join(dataDir,'job_starts.json'),usersFile=path.join(dataDir,'users.json');
const defaultHostSettings = {
 farmName: 'Neptune Print Farm',
 primaryIp: '',
 port: Number(process.env.PORT||3080),
 pollMs: Number(process.env.POLL_MS||5000),
 telegramToken: process.env.TELEGRAM_BOT_TOKEN||'',
 telegramChatId: process.env.TELEGRAM_CHAT_ID||'',
 telegramChats: [],
 telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
 telegramEvents: ['started', 'completed', 'runout', 'resumed', 'error', 'paused', 'offline', 'cancelled', 'lowfilament'],
 publicTunnelUrl: 'https://neptunemonitor.com'
};
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2),{mode:0o600});
let hostSettings = { ...defaultHostSettings, ...read(hostSettingsFile, {}) };
// Print-start alerts were added later: switch them on once for existing setups
if (!hostSettings.startedAlertAdded) {
 if (Array.isArray(hostSettings.telegramEvents) && !hostSettings.telegramEvents.includes('started')) hostSettings.telegramEvents = ['started', ...hostSettings.telegramEvents];
 hostSettings.startedAlertAdded = true;
 try { save(hostSettingsFile, hostSettings); } catch {}
}
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
let printers=read(configFile,read(exampleFile,[])),events=read(historyFile,[]),allJobs=read(jobsFile,read(completedFile,[])),clearedPrints=read(clearedFile,{}),runoutState=read(runoutFile,{}),jobHoldStats=read(jobHoldFile,{}),jobStartTimes=read(jobStartsFile,{}),users=read(usersFile,[]);
// Last file each printer finished, so a new job with the same file is reported as a reprint
const lastFilesFile=path.join(dataDir,'last_files.json');
const lastFinishedFile=new Map(Object.entries(read(lastFilesFile,{})));
function rememberLastFile(id){const f=jobStartTimes?.[id]?.file;if(!f)return;lastFinishedFile.set(id,f);try{save(lastFilesFile,Object.fromEntries(lastFinishedFile))}catch{}}
const current=new Map(),last=new Map(),completedState=new Map(),progressSamples=new Map(),recentCommands=new Map(),pendingStops=new Map(),consoleSeen=new Map(),consoleAlertAt=new Map(),recentCancelCmd=new Map();
const offlineSince=new Map(),offlineAlertSent=new Map();
const idleSince=new Map(),errorSince=new Map(),pauseSince=new Map();
const etaSmoothed=new Map();
const secret=process.env.JWT_SECRET,password=process.env.ADMIN_PASSWORD;
if(!secret||secret.length<32||!password||password.startsWith('replace-with')||password.startsWith('change-this')){console.error('Set ADMIN_PASSWORD and a 32+ character JWT_SECRET in .env');process.exit(1)}
const passwordHash=bcrypt.hashSync(password,11);
let currentPasswordHash=hostSettings.passwordHash||passwordHash;
if (!Array.isArray(users) || !users.length || users[0].passwordHash?.includes('00M9yL')) {
 users = [{
  id: 'user_admin',
  email: 'admin@neptunemonitor.com',
  name: 'Farm Admin',
  passwordHash: currentPasswordHash,
  role: 'admin',
  assignedPrinters: ['*'],
  createdAt: new Date().toISOString()
 }];
 save(usersFile, users);
}

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
 if(['started','completed','paused','error','runout','offline','resumed','cancelled','lowfilament'].includes(type)){
  const tgType = (type === 'lowfilament' && !hostSettings.telegramEvents?.includes('lowfilament')) ? 'runout' : (type === 'offline' && !hostSettings.telegramEvents?.includes('offline')) ? 'error' : ((type === 'resumed' && !hostSettings.telegramEvents?.includes('resumed')) ? 'runout' : type);
  void telegram(message, tgType);
  let title = '🖨 Neptune Farm Alert';
  if (type === 'started') title = /reprint/i.test(message) ? '🔁 Reprint Started' : '▶️ New Print Started';
  else if (type === 'completed') title = '🎉 Print Finished!';
  else if (type === 'runout') title = '⚠️ Filament Runout Detected!';
  else if (type === 'lowfilament') title = '🧵 Low Filament on Spool';
  else if (type === 'resumed') title = '▶️ Filament Reloaded & Resumed';
  else if (type === 'error') title = '🚨 Printer Error / Shutdown!';
  else if (type === 'paused') title = '⏸️ Print Paused';
  else if (type === 'cancelled') title = '🛑 Print Cancelled / Stopped';
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

// Only Moonraker history confirms a production completion. Older live entries
// were inferred from standby, progress, or console messages.
const isConfirmedCompletion=job=>job.status==='completed'&&!String(job.id||'').startsWith(job.printerId+'_live_');

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
   const startSec=j.start_time||null;
   const dur=Math.round(j.print_duration||j.total_duration||0);
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
    startedAt:startSec?new Date(startSec*1000).toISOString():(endSec?new Date((endSec-dur)*1000).toISOString():null),
    completedAt:endSec?new Date(endSec*1000).toISOString():new Date().toISOString(),
    duration:dur,
    totalDuration:dur,
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
   save(completedFile,allJobs.filter(isConfirmedCompletion));
  }
 }catch{}
}

async function syncAllHistory(){
 await Promise.all(printers.map(syncPrinterHistory));
}


// ---- Printer console watcher -------------------------------------------------
// Reads new Klipper console lines each poll and turns the important ones into
// alerts. Rules come from what these Neptune 4 printers actually print.
const CONSOLE_RULES=[
 {id:'mcu',type:'error',re:/Lost communication with MCU|Klipper state: Disconnect|Got EOF when reading|Timer too close/i,
  msg:(n,l)=>`${n}: Printer board disconnected / MCU error — ${l}`},
 {id:'heater',type:'error',re:/not heating at expected rate|Heater \w+ not heating|ADC out of range|thermal runaway/i,
  msg:(n,l)=>`${n}: HEATER FAULT — ${l}`},
 {id:'runout',type:'runout',re:/Filament detection is triggered|filament runout/i,
  msg:n=>`${n}: Filament sensor triggered — check filament`},
 {id:'idle-cool',type:'paused',re:/Extruder powered down on idle timeout/i,
  msg:n=>`${n}: Heaters turned OFF by idle timeout — nozzle is cooling. Reheat before resuming.`},
 {id:'klipper-err',type:'error',re:/^!!\s*(.+)/,
  msg:(n,l)=>`${n}: Printer error — ${l.replace(/^!!\s*/,'')}`},
];
// Harmless noise on these printers (slicer/firmware quirks) - never alert.
const CONSOLE_IGNORE=/Unknown command:"(T0|SAVE_VARIABLE|RUN_SHELL_COMMAND|CLEAR_LAST_FILE)"|EXCLUDE_OBJECT_END .* does not match/i;

function watchConsole(p,entries,prevStatus,nowStatus){
 if(!Array.isArray(entries)||!entries.length)return;
 const newest=Math.max(...entries.map(e=>e.time||0));
 const seen=consoleSeen.get(p.id);
 consoleSeen.set(p.id,Math.max(newest,seen||0));
 if(seen==null)return; // first poll after start: don't replay old lines
 for(const e of entries){
  if(!(e.time>seen))continue;
  const line=String(e.message||'').trim();
  if(!line||CONSOLE_IGNORE.test(line))continue;
  if(e.type==='command'){
   if(/^CANCEL_PRINT\b/i.test(line))recentCancelCmd.set(p.id,Date.now());
   if(/^(FIRMWARE_RESTART|RESTART)\b/i.test(line))recentCancelCmd.set(p.id+':restart',Date.now());
   continue;
  }
  const rule=CONSOLE_RULES.find(r=>r.re.test(line));
  if(!rule)continue;
  // Shutdowns are already alerted (with reason) by the status tracker
  if(nowStatus==='error'&&['mcu','heater','klipper-err'].includes(rule.id))continue;
  // Runout & idle-cool only matter around an active/paused job
  if(rule.id==='runout'&&(runoutState[p.id]||!['printing','paused','runout'].includes(prevStatus)))continue;
  if(rule.id==='idle-cool'&&!['paused','runout'].includes(prevStatus))continue;
  // A disconnect right after a user-issued (firmware) restart is expected
  if(rule.id==='mcu'&&Date.now()-(recentCancelCmd.get(p.id+':restart')||0)<3*60*1000)continue;
  const key=p.id+':'+rule.id,lastAt=consoleAlertAt.get(key)||0;
  if(Date.now()-lastAt<10*60*1000)continue; // one alert per rule per 10 min
  consoleAlertAt.set(key,Date.now());
  record(p.id,rule.type,rule.msg(p.name,line.replace(/^(\/\/|!!)\s*/,'').slice(0,160)));
 }
}

// ---- Spool tracking ----------------------------------------------------------
// Each printer has one spool. We add up the filament every job pulls (Moonraker
// reports filament_used in mm per job) since the spool was loaded. A new spool is
// assumed automatically after a filament runout is reloaded, or set by hand.
const MM_PER_GRAM=335; // 1.75 mm PLA: a 1 kg spool is about 335 m
const DEFAULT_SPOOL_G=1000;
const spoolFile=path.join(dataDir,'spools.json');
const spools=read(spoolFile,{});
let spoolSaveTimer=null;
const saveSpools=()=>{if(spoolSaveTimer)return;spoolSaveTimer=setTimeout(()=>{spoolSaveTimer=null;try{save(spoolFile,spools)}catch{}},3000)};
function loadSpool(id,{capacityG=null,remainingG=null,source='manual'}={}){
 const prevSpool=spools[id]||{};
 const cap=Math.max(1,Math.round(Number(capacityG)||prevSpool.capacityG||DEFAULT_SPOOL_G));
 const left=remainingG==null?cap:Math.max(0,Math.min(cap,Math.round(Number(remainingG))));
 spools[id]={capacityG:cap,usedMm:Math.round((cap-left)*MM_PER_GRAM),loadedAt:new Date().toISOString(),source,
  // keep the running job's position so only filament used from now on is counted
  lastJobKey:prevSpool.lastJobKey||null,lastJobFile:prevSpool.lastJobFile,lastJobMm:prevSpool.lastJobMm||0,lowAlerted:false,emptyAlerted:false,empty:false};
 save(spoolFile,spools);
 return spools[id];
}
// Runout sensor fired: the spool is empty, whatever the count said
function markSpoolEmpty(id){
 const sp=spools[id]||(spools[id]={capacityG:DEFAULT_SPOOL_G,usedMm:0,loadedAt:new Date().toISOString(),source:'runout',lastJobKey:null,lastJobMm:0});
 sp.usedMm=Math.round(sp.capacityG*MM_PER_GRAM);sp.empty=true;sp.emptyAlerted=true;sp.lowAlerted=sp.lastJobKey;
 save(spoolFile,spools);
}
function trackSpool(p,next,latestJob){
 const sp=spools[p.id];
 if(!sp)return;
 const active=['printing','paused','runout'].includes(next.status)&&next.file;
 // Follow the job by file name and the live filament counter from print_stats.
 // (Earlier this keyed on the history job id, which disappears whenever the
 // history request times out - every flip re-added the whole job.)
 const file=next.file||'';
 const mm=Number(next.filamentUsed||0);
 if(file&&mm>=0){
  if(sp.lastJobFile===undefined){
   // first run after upgrading: start counting from the current position
   sp.lastJobFile=file;sp.lastJobMm=mm;saveSpools();
  }else if(!active&&file!==sp.lastJobFile){
   // an idle printer still showing a finished job we didn't see run: never count it
  }else if(file!==sp.lastJobFile||(active&&mm+2000<sp.lastJobMm)){
   // a new job (different file, or the counter restarted = reprint)
   const startedAt=Date.parse(jobStartTimes[p.id]?.startedAt||'')||(latestJob?.filename===file&&latestJob.start_time?latestJob.start_time*1000:Date.now());
   const counted=startedAt>=Date.parse(sp.loadedAt)-60000?mm:0;
   if(active||counted>0)sp.usedMm+=Math.max(0,Math.min(counted,400000));
   sp.lastJobFile=file;sp.lastJobMm=mm;saveSpools();
  }else if(mm>sp.lastJobMm){
   sp.usedMm+=Math.min(mm-sp.lastJobMm,50000);sp.lastJobMm=mm;saveSpools();
  }
 }
 sp.lastJobKey=file||sp.lastJobKey;
 // Warn once per spool when it won't last
 const pub=publicSpool(p.id,next);
 if(active&&pub.known){
  if(pub.needG>0&&pub.remainingG<pub.needG&&sp.lowAlerted!==sp.lastJobKey){
   sp.lowAlerted=sp.lastJobKey;saveSpools();
   record(p.id,'lowfilament',`${p.name}: Low filament — about ${pub.remainingG} g left on the spool, but this print needs ~${pub.needG} g more (${next.file})`);
  }else if(pub.remainingG<=50&&!sp.emptyAlerted){
   sp.emptyAlerted=true;saveSpools();
   record(p.id,'lowfilament',`${p.name}: Spool almost empty — about ${pub.remainingG} g left`);
  }
 }
}
function publicSpool(id,cur){
 const sp=spools[id];
 if(!sp)return {known:false};
 const usedG=Math.round(sp.usedMm/MM_PER_GRAM);
 const remainingG=Math.max(0,sp.capacityG-usedG);
 const active=cur&&['printing','paused','runout'].includes(cur.status);
 const needG=active&&cur.filamentTotal>0?Math.max(0,Math.round((cur.filamentTotal-(cur.filamentUsed||0))/MM_PER_GRAM)):0;
 return {known:true,empty:Boolean(sp.empty)||remainingG<=0,capacityG:sp.capacityG,usedG,remainingG,remainingM:Math.round(remainingG*MM_PER_GRAM/1000),
  pct:Math.round(remainingG/sp.capacityG*100),loadedAt:sp.loadedAt,source:sp.source,needG,enoughForJob:needG?remainingG>=needG:null};
}

function normalize(p,body,meta,compInfo,isKlippyShutdown,shutdownReason,latestJob,gcodeLogs=[],recentCmd=null){
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
 const duration=Math.round(ps.total_duration||ps.print_duration||0),progressRatio=Math.max(0,Math.min(1,sd.progress||0));
 const speedFactor=(typeof gm?.speed_factor==='number'&&gm.speed_factor>0.05&&gm.speed_factor<10)
  ?Number(gm.speed_factor.toFixed(2))
  :1.0;

  let computedStatus = statuses[state]||'unknown';
  if(isShutdown){
   computedStatus = 'error';
  }else if(compInfo){
   computedStatus='completed';
  }else if(state==='complete'){
   computedStatus='idle';
  }

  const finalProgress=computedStatus==='completed'?100:Math.max(0,Math.min(100,Math.round((sd.progress||0)*100)));
  const finalFile=computedStatus==='completed'?(compInfo?.file||ps.filename||''):(ps.filename||'');
  const finalDuration=computedStatus==='completed'?(compInfo?.duration||duration):duration;
  const finalFilament=computedStatus==='completed'?(compInfo?.filamentUsed||ps.filament_used||0):(ps.filament_used||0);

  // Check if bed leveling or homing is active
  const msgText = (((ps.message || '') + ' ' + (wh.state_message || ''))).toLowerCase();
  const recentGcode = (gcodeLogs || []).slice(0, 10).join(' ').toLowerCase();
  const isLevelingActive = (state === 'standby' || state === 'idle') && (
   msgText.includes('level') ||
   msgText.includes('mesh') ||
   msgText.includes('probe') ||
   recentGcode.includes('bed_mesh_calibrate') ||
   recentGcode.includes('bed_mesh') ||
   recentGcode.includes('g29') ||
   recentGcode.includes('probe_calibrate') ||
   (recentCmd && (Date.now() - recentCmd.time < 60000) && (recentCmd.action === 'level' || recentCmd.action === 'bed_mesh' || (recentCmd.gcode && recentCmd.gcode.toLowerCase().includes('mesh'))))
  );

  const isHomingActive = (state === 'standby' || state === 'idle') && !isLevelingActive && (
   msgText.includes('homing') ||
   msgText.includes('moving home') ||
   recentGcode.includes('g28') ||
   (recentCmd && (Date.now() - recentCmd.time < 20000) && (recentCmd.action === 'home' || (recentCmd.gcode && recentCmd.gcode.includes('G28'))))
  );

  if (!isShutdown && computedStatus !== 'completed' && state !== 'printing' && state !== 'paused' && state !== 'cancelled') {
   if (isLevelingActive) {
    computedStatus = 'leveling';
   } else if (isHomingActive) {
    computedStatus = 'homing';
   }
  }

  // Filament Runout is ONLY valid when actively printing or paused during a print with a file
  const isActivelyPrinting = Boolean(finalFile) && (state === 'printing' || state === 'paused') && state !== 'cancelled';
  const isRunout = Boolean(filament === false && isActivelyPrinting && computedStatus !== 'completed' && !isShutdown);

  if (isRunout && (computedStatus === 'paused' || computedStatus === 'printing')) {
   computedStatus = 'runout';
  }

 const nowMs = Date.now();
 // State duration tracking: idle, error, pause
 if (computedStatus === 'idle' || computedStatus === 'standby') {
  if (!idleSince.has(p.id)) idleSince.set(p.id, nowMs);
  errorSince.delete(p.id);
  pauseSince.delete(p.id);
 } else {
  idleSince.delete(p.id);
 }

 if (computedStatus === 'error' || isShutdown) {
  if (!errorSince.has(p.id)) errorSince.set(p.id, nowMs);
  idleSince.delete(p.id);
  pauseSince.delete(p.id);
 } else {
  errorSince.delete(p.id);
 }

 if (computedStatus === 'paused' || computedStatus === 'runout') {
  if (!pauseSince.has(p.id)) pauseSince.set(p.id, nowMs);
  idleSince.delete(p.id);
  errorSince.delete(p.id);
 } else if (computedStatus === 'printing') {
  pauseSince.delete(p.id);
 }

 const idleSec = idleSince.has(p.id) ? Math.max(0, Math.round((nowMs - idleSince.get(p.id)) / 1000)) : null;
 const errorSec = errorSince.has(p.id) ? Math.max(0, Math.round((nowMs - errorSince.get(p.id)) / 1000)) : null;
 const pausedSec = pauseSince.has(p.id) ? Math.max(0, Math.round((nowMs - pauseSince.get(p.id)) / 1000)) : null;

 // Filament change hold time: ONLY shown when actively printing, paused, or runout
 let jobHoldSec = null;
 const isPrintActive = (computedStatus === 'printing' || computedStatus === 'paused' || computedStatus === 'runout');
 const curHold = jobHoldStats[p.id];
 if (isPrintActive && curHold && (curHold.file === finalFile || !curHold.file)) {
  let totalHold = curHold.accumulatedHoldSec || 0;
  if (curHold.currentHoldStart) {
   totalHold += Math.max(0, Math.round((nowMs - curHold.currentHoldStart) / 1000));
  }
  if (totalHold > 0) jobHoldSec = totalHold;
 }

 let finalTotalDuration = finalDuration;

 let jobStartedAt = null;
 if (compInfo?.startedAt) {
  jobStartedAt = compInfo.startedAt;
 } else if (latestJob?.start_time && (latestJob.filename === finalFile || !finalFile || !latestJob.filename)) {
  jobStartedAt = new Date(latestJob.start_time * 1000).toISOString();
 } else if (jobStartTimes[p.id]?.file === finalFile && jobStartTimes[p.id]?.startedAt) {
  jobStartedAt = jobStartTimes[p.id].startedAt;
 } else if (finalFile && (state === 'printing' || state === 'paused')) {
  const totalDur = (ps.total_duration != null && ps.total_duration > 0) ? ps.total_duration : (ps.print_duration || duration || 0);
  if (totalDur > 0) {
   jobStartedAt = new Date(Date.now() - Math.round(totalDur * 1000)).toISOString();
  }
 } else if (computedStatus === 'completed' && compInfo?.completedAt && finalDuration) {
  jobStartedAt = new Date(new Date(compInfo.completedAt).getTime() - Math.round(finalDuration * 1000)).toISOString();
 }

 // Rock-solid Fluidd-compatible ETA calculation (matches local printer IP interface)
 if ((state === 'printing' || state === 'paused') && !isShutdown) {
  if (progressRatio >= 0.999) {
   remainingTime = 0;
   totalDuration = duration;
   eta = new Date().toISOString();
   etaSmoothed.delete(p.id);
  } else {
   const startMs = jobStartedAt ? new Date(jobStartedAt).getTime() : (Date.now() - duration * 1000);
   const slicerEst = (typeof meta?.estimated_time === 'number' && meta.estimated_time > 30) ? meta.estimated_time : null;

   if (slicerEst) {
    const projectedTotal = Math.round(slicerEst / speedFactor);
    if (duration > projectedTotal && progressRatio >= 0.05) {
     const fileTotal = Math.max(duration + 30, Math.round((duration / progressRatio) / speedFactor));
     remainingTime = Math.max(0, fileTotal - duration);
     totalDuration = fileTotal;
     eta = new Date(startMs + fileTotal * 1000).toISOString();
    } else {
     remainingTime = Math.max(0, Math.round((slicerEst - duration) / speedFactor));
     totalDuration = projectedTotal;
     eta = new Date(startMs + projectedTotal * 1000).toISOString();
    }
   } else if (progressRatio >= 0.005 && duration > 10) {
    const rawTotal = Math.round((duration / progressRatio) / speedFactor);
    const prevSmoothed = etaSmoothed.get(p.id);
    let totalSec = rawTotal;
    if (prevSmoothed && Math.abs(prevSmoothed - rawTotal) < 1800) {
     totalSec = Math.round(prevSmoothed * 0.92 + rawTotal * 0.08);
    }
    etaSmoothed.set(p.id, totalSec);
    remainingTime = Math.max(0, Math.round(totalSec - (duration / speedFactor)));
    totalDuration = totalSec;
    eta = new Date(startMs + totalSec * 1000).toISOString();
   } else {
    remainingTime = null;
    totalDuration = duration;
    eta = null;
   }
  }
 } else {
  etaSmoothed.delete(p.id);
 }
 finalTotalDuration = (computedStatus === 'completed') ? finalDuration : (totalDuration || finalDuration);

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
  totalDuration:finalTotalDuration,
  remainingTime:computedStatus==='completed'?null:remainingTime,
  eta:computedStatus==='completed'?null:eta,
  speedFactor,
  filamentUsed:finalFilament,
  filamentTotal:(typeof meta?.filament_total==='number'&&meta.filament_total>0)?Math.round(meta.filament_total):null,
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
  jobHoldSec,
  idleSec,
  errorSec,
  pausedSec,
  startedAt: jobStartedAt,
  completedAt:compInfo?.completedAt||(computedStatus==='completed'&&latestJob?.end_time?new Date(latestJob.end_time*1000).toISOString():null),
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
   fetch(endpoint+'/server/gcode_store?count=60',{signal:AbortSignal.timeout(4500)}).catch(()=>null),
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
  const latestJob=histData?.result?.jobs?.[0]||null;
  const prev=last.get(p.id);
  const printStats=body?.result?.status?.print_stats||{};
  const rawState=printStats.state||'unknown';
  const duration=Math.round(printStats.total_duration||printStats.print_duration||0);
  const activeStart=jobStartTimes[p.id];
  const sameActiveJob=(!printStats.filename||latestJob?.filename===printStats.filename)&&(
   !activeStart?.startedAt||
   (latestJob?.filename===activeStart.file&&latestJob.start_time*1000>=Date.parse(activeStart.startedAt)-15000)
  );
  const cleared=clearedPrints[p.id];
  const historyConfirmed=Boolean(latestJob?.status==='completed'&&latestJob.job_id&&sameActiveJob&&(
   latestJob.job_id!==cleared?.jobId&&(!cleared||latestJob.end_time*1000>Date.parse(cleared.clearedAt))
  ));

  const isTerminalState=['complete','standby','idle'].includes(rawState);
  if(!isKlippyShutdown&&isTerminalState&&historyConfirmed){
   const existingComp=completedState.get(p.id);
   const compCompletedAt=latestJob.end_time?new Date(latestJob.end_time*1000).toISOString():existingComp?.completedAt||new Date().toISOString();
   completedState.set(p.id,{
    file:latestJob.filename,
    duration:Math.round(latestJob.print_duration||duration),
    filamentUsed:latestJob.filament_used||0,
    completedAt:compCompletedAt,
    startedAt:latestJob.start_time?new Date(latestJob.start_time*1000).toISOString():null,
    jobId:latestJob.job_id,
    notified:existingComp?.jobId===latestJob.job_id&&existingComp.notified||
     allJobs.some(job=>job.printerId===p.id&&job.jobId===latestJob.job_id&&isConfirmedCompletion(job))
   });
  }else if(!isTerminalState||isKlippyShutdown||latestJob){
   completedState.delete(p.id);
  }

  const compInfo=completedState.get(p.id)||null;
  const filename=compInfo?.file||body?.result?.status?.print_stats?.filename;
  const meta=filename?await fetchMetadata(endpoint,filename):null;
  const recentCmd=recentCommands.get(p.id)||null;
  const next=normalize(p,body,meta,compInfo,isKlippyShutdown,shutdownReason,latestJob,gcodeLogs,recentCmd);
  current.set(p.id,next);last.set(p.id,next);
  try{watchConsole(p,gcodeData?.result?.gcode_store,prev?.status,next.status)}catch(e){console.warn('[Console watch]',p.name,e.message)}
  try{trackSpool(p,next,latestJob)}catch(e){console.warn('[Spool]',p.name,e.message)}

  // If printer was previously offline, handle reconnect & clear alert tracking
  if(offlineSince.has(p.id)){
   const wasAlerted=offlineAlertSent.get(p.id);
   offlineSince.delete(p.id);
   offlineAlertSent.delete(p.id);
   if(wasAlerted){
    record(p.id,'offline',`${p.name}: Back ONLINE (reconnected)`);
   }
  }

  // 1. Filament Runout tracking & notification (ONLY valid during active print or pause waiting reload)
  const isNowRunout = Boolean(
   (next.status === 'runout' || (next.filamentRunout === true && (next.status === 'printing' || next.status === 'paused'))) &&
   Boolean(next.file) &&
   !isKlippyShutdown &&
   next.status !== 'cancelled' &&
   next.status !== 'completed' &&
   next.status !== 'idle' &&
   next.status !== 'leveling' &&
   next.status !== 'homing'
  );

  // Clear runoutState & jobHoldStats immediately if printer is cancelled, idle, leveling, homing, or completed
  if (runoutState[p.id] && (next.status === 'cancelled' || rawState === 'cancelled' || next.status === 'idle' || next.status === 'leveling' || next.status === 'homing' || next.status === 'completed')) {
   delete runoutState[p.id];
   save(runoutFile, runoutState);
   if (next.status === 'cancelled' || rawState === 'cancelled' || (next.status === 'idle' && !next.file)) {
    delete jobHoldStats[p.id];
    save(jobHoldFile, jobHoldStats);
    rememberLastFile(p.id);delete jobStartTimes[p.id];
    save(jobStartsFile, jobStartTimes);
   }
  }

  // 0. Print start tracking
  if (next.file && (next.status === 'printing' || next.status === 'paused' || isNowRunout)) {
   const exactStart = (latestJob?.status==='in_progress' && latestJob.start_time && latestJob.filename===next.file) ? new Date(latestJob.start_time * 1000).toISOString() : null;
   const elapsed = (body?.result?.status?.print_stats?.total_duration != null && body.result.status.print_stats.total_duration > 0) ? body.result.status.print_stats.total_duration : (next.duration || 0);
   const fallbackStart = new Date(Date.now() - Math.round(elapsed * 1000)).toISOString();
   const chosenStart = exactStart || fallbackStart;

   const prevStart = jobStartTimes[p.id];
   const isNewPrintRun = (
    !prevStart ||
    prevStart.file !== next.file ||
    (exactStart && prevStart.startedAt !== exactStart) ||
    (prev && ['completed', 'idle', 'standby', 'cancelled'].includes(prev.status) && next.status === 'printing') ||
    (prev && prev.duration > 30 && (next.duration || 0) < 15)
   );

   if (isNewPrintRun) {
    // Notify about the new job. Skip jobs that were already running long before we saw
    // them (e.g. right after a server restart) so a restart doesn't re-announce prints.
    const startedAgoSec = (Date.now() - new Date(chosenStart).getTime()) / 1000;
    const lastFile = prevStart?.file || lastFinishedFile.get(p.id) || '';
    if (startedAgoSec < 600) {
     const isReprint = Boolean(lastFile) && lastFile === next.file;
     const startedFile = next.file;
     void (async () => {
      let est = '';
      try {
       const meta = await fetchMetadata(`http://${p.host}:${p.port}`, startedFile);
       if (typeof meta?.estimated_time === 'number' && meta.estimated_time > 30) est = ` · Est. time: ${formatHoldDuration(meta.estimated_time).replace(/ d+s$/, '')}`;
      } catch {}
      record(p.id, 'started', `${p.name}: ${isReprint ? 'Reprint started' : 'New print started'} — ${startedFile}${est}`);
     })();
    }
    jobStartTimes[p.id] = {
     file: next.file,
     startedAt: chosenStart
    };
    save(jobStartsFile, jobStartTimes);

    // Reset hold/filament-change time for the new print run (even if reprinting same file)
    delete jobHoldStats[p.id];
    save(jobHoldFile, jobHoldStats);
    delete runoutState[p.id];
    save(runoutFile, runoutState);
    etaSmoothed.delete(p.id);
   } else if (jobHoldStats[p.id] && jobHoldStats[p.id].file && jobHoldStats[p.id].file !== next.file) {
    delete jobHoldStats[p.id];
    save(jobHoldFile, jobHoldStats);
   }
  }

  if (isNowRunout && !isKlippyShutdown) {
   if (!runoutState[p.id]) {
    try { markSpoolEmpty(p.id); } catch (e) { console.warn('[Spool]', p.name, e.message); }
    runoutState[p.id] = {
     startedAt: new Date().toISOString(),
     startTime: Date.now(),
     file: next.file || prev?.file || ''
    };
    save(runoutFile, runoutState);
    record(p.id, 'runout', `${p.name}: Filament runout detected! Print paused waiting for reload`);
   }
   if (!jobHoldStats[p.id]) {
    jobHoldStats[p.id] = {
     file: next.file || prev?.file || '',
     accumulatedHoldSec: 0,
     currentHoldStart: Date.now()
    };
    save(jobHoldFile, jobHoldStats);
   } else if (!jobHoldStats[p.id].currentHoldStart) {
    jobHoldStats[p.id].currentHoldStart = Date.now();
    jobHoldStats[p.id].file = next.file || prev?.file || jobHoldStats[p.id].file || '';
    save(jobHoldFile, jobHoldStats);
   }
  }

  // 2. Filament Reloaded & Print Resumed notification with exact hold duration
  if (runoutState[p.id]) {
   const isResumed = (next.status === 'printing' || next.rawState === 'printing') && next.filamentDetected !== false;
   if (isResumed) {
    const startMs = runoutState[p.id].startTime || (runoutState[p.id].startedAt ? new Date(runoutState[p.id].startedAt).getTime() : Date.now());
    const holdSec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    const holdStr = formatHoldDuration(holdSec);
    // Runout reloaded: a fresh spool of this printer's size went in (1 kg unless set otherwise)
    const newSpool = loadSpool(p.id, { source: 'runout' });
    const spoolStr = newSpool.capacityG >= 1000 ? `${newSpool.capacityG / 1000} kg` : `${newSpool.capacityG} g`;
    const resumeMsg = `${p.name}: Filament reloaded & print resumed! Filament change time: ${holdStr} · New ${spoolStr} spool counted`;
    record(p.id, 'resumed', resumeMsg);
    delete runoutState[p.id];
    save(runoutFile, runoutState);

    if (jobHoldStats[p.id]) {
     if (jobHoldStats[p.id].currentHoldStart) {
      const diff = Math.max(0, Math.round((Date.now() - jobHoldStats[p.id].currentHoldStart) / 1000));
      jobHoldStats[p.id].accumulatedHoldSec = (jobHoldStats[p.id].accumulatedHoldSec || 0) + diff;
      jobHoldStats[p.id].currentHoldStart = null;
     }
     save(jobHoldFile, jobHoldStats);
    }
   } else if (next.status === 'cancelled' || next.status === 'completed' || (next.status === 'idle' && !next.file)) {
    delete runoutState[p.id];
    save(runoutFile, runoutState);
    if (next.status === 'cancelled' || (next.status === 'idle' && !next.file)) {
     delete jobHoldStats[p.id];
     save(jobHoldFile, jobHoldStats);
     rememberLastFile(p.id);delete jobStartTimes[p.id];
     save(jobStartsFile, jobStartTimes);
    }
   }
  }

  // 3. Completed notification & history recording (guaranteed to fire and deduplicated)
  if (next.status === 'completed' && next.file) {
   const totalStr = formatHoldDuration(next.duration || compInfo?.duration || 0);
   const startedStr = next.startedAt ? new Date(next.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
   const compMsg = `${p.name}: COMPLETED — ${next.file}${totalStr ? ` (Total: ${totalStr}` : ''}${startedStr ? `, Started: ${startedStr})` : totalStr ? ')' : ''}`;

   if (compInfo && !compInfo.notified) {
    compInfo.notified = true;
    completedState.set(p.id, compInfo);
    record(p.id, 'completed', compMsg);
   } else if (!compInfo && (!prev || prev.status !== 'completed')) {
    record(p.id, 'completed', compMsg);
   }

   if(!allJobs.some(job=>job.printerId===p.id&&job.jobId===compInfo?.jobId&&isConfirmedCompletion(job))){
    void syncPrinterHistory(p);
   }
  }

  // 3b. Elegoo's CANCEL_PRINT runs SDCARD_RESET_FILE, so print_stats jumps from
  // printing straight to standby and never reports 'cancelled'. Remember the stop
  // and let Moonraker history name the real outcome (cancelled / shutdown / completed).
  const wasActive = prev?.connected && ['printing','paused','runout'].includes(prev.status) && prev.file;
  if (wasActive && !['printing','paused','runout','completed','cancelled','error'].includes(next.status)) {
   pendingStops.set(p.id, { file: prev.file, at: Date.now(), duration: prev.duration || 0 });
  }
  const pend = pendingStops.get(p.id);
  if (pend) {
   const lj = latestJob;
   if (lj && lj.status !== 'in_progress' && lj.filename === pend.file && (lj.end_time || 0) * 1000 >= pend.at - 120000) {
    pendingStops.delete(p.id);
    if (lj.status !== 'completed') {
     const ran = formatHoldDuration(Math.round(lj.print_duration || pend.duration || 0));
     if (lj.status === 'cancelled') {
      record(p.id, 'cancelled', `${p.name}: Print CANCELLED (stopped manually) — ${pend.file}${ran ? ` (Ran: ${ran})` : ''}`);
     } else {
      record(p.id, 'error', `${p.name}: Print STOPPED (${String(lj.status).replace(/_/g, ' ')}) — ${pend.file}${ran ? ` (Ran: ${ran})` : ''}`);
     }
     void syncPrinterHistory(p);
    }
   } else if ((lj && lj.status === 'in_progress' && lj.filename !== pend.file) || Date.now() - pend.at > 180000) {
    pendingStops.delete(p.id);
    void syncPrinterHistory(p);
   }
  }

  // 4. Status change tracking for Error, Paused, Cancelled
  if (prev?.connected && prev.status !== next.status) {
   if (next.status === 'error' || (next.status === 'paused' && !isNowRunout)) {
    record(p.id, next.status, p.name + ': ' + next.status.toUpperCase() + ' — ' + (next.file || 'No filename') + (next.status === 'error' && next.shutdownReason ? ' · Reason: ' + String(next.shutdownReason).split(/\r?\n/)[0].slice(0, 160) : ''));
   } else if (next.status === 'cancelled') {
    record(p.id, 'cancelled', p.name + ': Print CANCELLED / STOPPED — ' + (next.file || prev?.file || 'Job stopped'));
   }
   if (['error', 'cancelled'].includes(next.status) && (next.file || prev.file)) {
    // Moonraker history records this job (cancelled / klippy_shutdown); sync it
    // instead of adding a separate live entry that would double-count failures.
    void syncPrinterHistory(p);
   }
  }
 }catch(e){
  console.error(`[Scan Error] ${p.name} (${p.host}):`, e.message || e);
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

  if (!errorSince.has(p.id)) {
   errorSince.set(p.id, Date.now());
  }
  idleSince.delete(p.id);
  pauseSince.delete(p.id);

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
   startedAt: previous?.startedAt || (jobStartTimes[p.id]?.startedAt || null),
   offlineSince: offlineSince.get(p.id),
   errorSec: errorSince.has(p.id) ? Math.max(0, Math.round((Date.now() - errorSince.get(p.id)) / 1000)) : null,
   idleSec: null,
   pausedSec: null,
   jobHoldSec: null
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
const limitLogin=rateLimit({windowMs:900000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,validate:{xForwardedForHeader:false}});

app.post('/api/login',limitLogin,async(req,res)=>{
 const { email, password } = req.body || {};
 if(typeof password!=='string'||!password) return res.status(400).json({error:'Password is required'});
 
 const cleanEmail = (typeof email === 'string' ? email.trim().toLowerCase() : '');
 let matchedUser = null;
 if (cleanEmail) {
  matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail || (u.role === 'admin' && cleanEmail === 'admin'));
 } else {
  matchedUser = users.find(u => u.role === 'admin') || users[0];
 }

 if (!matchedUser) {
  return res.status(401).json({ error: 'User not found with this email' });
 }

 const hashToCompare = matchedUser.passwordHash || currentPasswordHash;
 const isMatch = await bcrypt.compare(password, hashToCompare);
 if (!isMatch) {
  return res.status(401).json({ error: 'Invalid email or password' });
 }

 const tokenPayload = {
  userId: matchedUser.id,
  email: matchedUser.email,
  name: matchedUser.name || (matchedUser.role === 'admin' ? 'Farm Admin' : 'Guest User'),
  role: matchedUser.role || 'guest',
  assignedPrinters: matchedUser.assignedPrinters || ['*']
 };

 const token = jwt.sign(tokenPayload, secret, { expiresIn: '12h' });
 res.cookie('farm_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE==='true', maxAge: 43200000 });
 res.json({ ok: true, user: tokenPayload });
});
app.post('/api/logout',(_req,res)=>{res.clearCookie('farm_session');res.json({ok:true})});

function auth(req,res,next){
 try{
  const sessionCookie = req.cookies.farm_session;
  if (!sessionCookie) return res.status(401).json({ error: 'Login required' });
  const decoded = jwt.verify(sessionCookie, secret);
  req.user = decoded;
  next();
 }catch{
  res.status(401).json({ error: 'Login required' });
 }
}

function requireAdmin(req,res,next){
 auth(req,res,()=>{
  if(req.user?.role!=='admin'){
   return res.status(403).json({ error: 'Admin permission required. Guests have view-only access.' });
  }
  next();
 });
}

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
 const localUrl=`http://${primaryIp}:${port}`;
 const remoteUrl=hostSettings.publicTunnelUrl||'https://neptunemonitor.com';
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
  localUrl,
  remoteUrl,
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
 let user=null;
 try{
  if(req.cookies.farm_session){
   const decoded=jwt.verify(req.cookies.farm_session,secret);
   authed=true;
   user={
    id: decoded.userId || 'admin',
    email: decoded.email || 'admin@neptunemonitor.com',
    name: decoded.name || 'Farm Admin',
    role: decoded.role || 'admin',
    assignedPrinters: decoded.assignedPrinters || ['*']
   };
  }
 }catch{}
 res.json({...net,authenticated:authed,user});
});

app.all('/api/printers/:id/proxy/*',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 if(req.user?.role==='guest'&&['POST','PUT','PATCH','DELETE'].includes(req.method)){
  return res.status(403).json({error:'Guest accounts have view-only access'});
 }
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

app.post(['/api/printers/:id/command', '/api/printers/:id/control'],auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 if(req.user?.role==='guest')return res.status(403).json({error:'Guest accounts have view-only access. Printer controls, pausing, stopping, and G-code commands are disabled.'});
 const {action,gcode}=req.body||{};
 let targetPath='',payload=null;
 if(action==='pause')targetPath='/printer/print/pause';
 else if(action==='resume')targetPath='/printer/print/resume';
 else if(action==='cancel')targetPath='/printer/print/cancel';
 else if(action==='emergency_stop')targetPath='/printer/emergency_stop';
 else if(action==='firmware_restart')targetPath='/printer/firmware_restart';
 else if(action==='cooldown'){targetPath='/printer/gcode/script';payload={script:'M104 S0\nM140 S0\nM106 S0'}}
 else if(action==='home'){targetPath='/printer/gcode/script';payload={script:'G28'}}
 else if(action==='level'||action==='bed_mesh'){targetPath='/printer/gcode/script';payload={script:'BED_MESH_CALIBRATE'}}
 else if(action==='gcode'||typeof gcode==='string'){
  const script=(gcode||'').trim();
  if(!script)return res.status(400).json({error:'Empty G-code command'});
  targetPath='/printer/gcode/script';
  payload={script};
 }else{
  return res.status(400).json({error:'Unknown action: '+action});
 }

 recentCommands.set(p.id, { action, gcode, time: Date.now() });
 if (action === 'cancel') recentCancelCmd.set(p.id, Date.now());

 if (action === 'cancel' || action === 'emergency_stop') {
  delete runoutState[p.id];
  save(runoutFile, runoutState);
  delete jobHoldStats[p.id];
  save(jobHoldFile, jobHoldStats);
  rememberLastFile(p.id);delete jobStartTimes[p.id];
  save(jobStartsFile, jobStartTimes);
  completedState.delete(p.id);
 }

 try{
  const endpoint='http://'+p.host+':'+p.port+targetPath;
  const r=await fetch(endpoint,{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:payload?JSON.stringify(payload):undefined,
   // Moonraker only answers after the macro finishes; Elegoo's CANCEL_PRINT/PAUSE
   // can take 15-30 s (and G28 / bed mesh even longer).
   signal:AbortSignal.timeout(action==='level'||action==='bed_mesh'||action==='gcode'?60000:30000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   const errMsg=data?.error?.message||`Moonraker HTTP ${r.status}`;
   return res.status(400).json({error:errMsg});
  }
  const cmdDesc = action === 'level' ? 'Auto Bed Leveling (BED_MESH_CALIBRATE)' : (action === 'home' ? 'Home All (G28)' : (action === 'cancel' ? 'Cancel Print' : (action === 'emergency_stop' ? 'Emergency Stop (M112)' : (action === 'gcode' ? (gcode || 'G-code') : (action || 'command')))));
  record(p.id,'command',`${p.name}: Command [${cmdDesc}] executed`);
  void poll();
  res.json({ok:true,result:data?.result||'ok'});
 }catch(err){
  // A timeout usually means the printer is still running the command, not that it failed.
  // Check the printer state before reporting an error.
  const isTimeout=err?.name==='TimeoutError'||err?.name==='AbortError'||/timeout|aborted/i.test(String(err?.message));
  let state=null;
  try{
   const q=await fetch('http://'+p.host+':'+p.port+'/printer/objects/query?print_stats=state',{signal:AbortSignal.timeout(5000)});
   state=(await q.json())?.result?.status?.print_stats?.state||null;
  }catch{}
  if(isTimeout&&state){
   const done=action==='cancel'?!['printing','paused'].includes(state)
    :action==='pause'?state==='paused'
    :action==='resume'?state==='printing'
    :true; // G-code / homing / leveling keep running on the printer
   if(done||action!=='cancel'){
    const label=action==='cancel'?'Cancel Print':action==='pause'?'Pause':action==='resume'?'Resume':(action==='gcode'?(gcode||'G-code'):action);
    record(p.id,'command',`${p.name}: Command [${label}] sent${done?'':' (still running on the printer)'}`);
    void poll();
    return res.json({ok:true,result:done?'ok':'sent - the printer is still working on it'});
   }
  }
  res.status(502).json({error:'Failed to communicate with printer '+p.host+': '+err.message});
 }
});

app.get('/api/printers/:id/files',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 try{
  const r=await fetch(`http://${p.host}:${p.port}/server/files/list?root=gcodes`,{signal:AbortSignal.timeout(6000)});
  if(!r.ok)return res.status(r.status).json({error:'Moonraker HTTP '+r.status});
  const data=await r.json();
  const rawList=data?.result||[];
  const files=rawList.map(f=>({
   filename:f.path,
   size:f.size||0,
   modified:f.modified?new Date(f.modified*1000).toISOString():null,
   permissions:f.permissions||'rw'
  }));
  files.sort((a,b)=>new Date(b.modified||0)-new Date(a.modified||0));
  res.json({ok:true,files,count:files.length});
 }catch(err){
  res.status(502).json({error:'Failed to fetch files from printer '+p.host+': '+err.message});
 }
});

app.post('/api/printers/:id/print-file',auth,async(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host))return res.status(404).json({error:'Printer not found or disabled'});
 if(req.user?.role==='guest')return res.status(403).json({error:'Guest accounts have view-only access'});

 const cur=current.get(p.id);
 if(cur&&(cur.status==='printing'||cur.status==='paused')){
  return res.status(400).json({error:'Cannot start new print: printer is currently printing or paused'});
 }

 const {filename}=req.body||{};
 if(typeof filename!=='string'||!filename.trim()){
  return res.status(400).json({error:'Filename is required'});
 }

 const name=filename.trim();
 const endpoint=`http://${p.host}:${p.port}`;
 // Moonraker often answers /print/start only after the printer has begun the job
 // (homing/heating can take well over 9s). Treat a timeout as "unknown" and verify
 // via print_stats instead of reporting a false failure.
 const confirmStarted=async()=>{
  for(let i=0;i<6;i++){
   try{
    const q=await fetch(`${endpoint}/printer/objects/query?print_stats=state,filename`,{signal:AbortSignal.timeout(4000)});
    const st=(await q.json())?.result?.status?.print_stats;
    if(st&&['printing','paused'].includes(st.state)&&(!st.filename||st.filename===name||st.filename.endsWith('/'+name)||name.endsWith(st.filename)))return true;
   }catch{}
   await new Promise(r=>setTimeout(r,2500));
  }
  return false;
 };
 const ok=()=>{
  record(p.id,'command',`${p.name}: Started print job [${name}]`);
  void poll();
  res.json({ok:true,result:'ok'});
 };
 try{
  const r=await fetch(`${endpoint}/printer/print/start?filename=${encodeURIComponent(name)}`,{
   method:'POST',
   headers:{'content-type':'application/json'},
   signal:AbortSignal.timeout(20000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   if(await confirmStarted())return ok();
   return res.status(400).json({error:data?.error?.message||`Printer rejected the job (HTTP ${r.status})`});
  }
  ok();
 }catch(err){
  if(await confirmStarted())return ok();
  res.status(502).json({error:`Could not confirm the print started on ${p.name}: ${err.message}`});
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
 if(req.user?.role==='guest')return res.status(403).json({error:'Guest accounts have view-only access'});
 const comp=completedState.get(p.id);
 completedState.delete(p.id);
 const jobId=comp?.jobId||'cleared_'+Date.now();
 clearedPrints[p.id]={jobId,clearedAt:new Date().toISOString(),filename:comp?.file||''};
 save(clearedFile,clearedPrints);
 delete jobHoldStats[p.id];
 save(jobHoldFile, jobHoldStats);
 rememberLastFile(p.id);delete jobStartTimes[p.id];
 save(jobStartsFile, jobStartTimes);
 const cur=current.get(p.id);
 if(cur){
  const updated={...cur,status:cur.rawState==='printing'?'printing':'idle',progress:cur.rawState==='printing'?cur.progress:0};
  current.set(p.id,updated);last.set(p.id,updated);
 }
 record(p.id,'cleared',`${p.name}: Bed cleared, printer ready for next job`);
 res.json({ok:true});
});

app.get('/api/me',auth,(req,res)=>{
 res.json({
  ok: true,
  user: {
   id: req.user?.userId || 'admin',
   email: req.user?.email || 'admin@neptunemonitor.com',
   name: req.user?.name || 'Farm Admin',
   role: req.user?.role || 'admin',
   assignedPrinters: req.user?.assignedPrinters || ['*']
  }
 });
});

// ---- Printer cameras ---------------------------------------------------------
// Cameras live on the printer's LAN address, so the browser can't reach them
// remotely. The server proxies snapshot + MJPEG stream so the same URL works on
// the local network and through the Cloudflare tunnel, behind the farm login.
const cameraCache=new Map();
const canSeePrinter=(user,p)=>{
 if(!user||user.role==='admin')return true;
 const a=Array.isArray(user.assignedPrinters)?user.assignedPrinters:[];
 return a.includes('*')||a.includes(p.id)||Boolean(p.ownerEmail&&p.ownerEmail.toLowerCase()===user.email?.toLowerCase());
};
async function resolveCamera(p,force=false){
 const cached=cameraCache.get(p.id);
 if(!force&&cached&&Date.now()-cached.checkedAt<60000)return cached;
 if(cached?.pending)return cached;
 cameraCache.set(p.id,{...(cached||{available:false}),pending:true,checkedAt:cached?.checkedAt||0});
 const base=`http://${p.host}`;
 // Default: the mjpg-streamer path these Neptune 4 images expose through nginx
 let cam={name:'Camera',stream:`${base}/webcam/?action=stream`,snapshot:`${base}/webcam/?action=snapshot`,flipH:false,flipV:false,rotation:0};
 try{
  const r=await fetch(`http://${p.host}:${p.port}/server/webcams/list`,{signal:AbortSignal.timeout(3000)});
  const w=(await r.json())?.result?.webcams?.find(x=>x.enabled!==false);
  if(w){
   // Only follow camera URLs on the printer's own host
   const abs=u=>{if(!u)return null;try{const url=new URL(u,base+'/');return url.hostname===p.host?url.href:null}catch{return null}};
   cam={name:w.name||'Camera',stream:abs(w.stream_url)||cam.stream,snapshot:abs(w.snapshot_url)||cam.snapshot,
    flipH:Boolean(w.flip_horizontal),flipV:Boolean(w.flip_vertical),rotation:Number(w.rotation)||0};
  }
 }catch{}
 let available=false;
 try{
  const r=await fetch(cam.snapshot,{signal:AbortSignal.timeout(4000)});
  available=r.ok&&String(r.headers.get('content-type')||'').startsWith('image/');
  await r.body?.cancel?.().catch(()=>{});
 }catch{}
 const out={...cam,available,checkedAt:Date.now()};
 cameraCache.set(p.id,out);
 return out;
}
const publicCamera=c=>c?{available:Boolean(c.available),name:c.name,flipH:c.flipH,flipV:c.flipV,rotation:c.rotation,checkedAt:c.checkedAt?new Date(c.checkedAt).toISOString():null}:{available:false};
function findVisiblePrinter(req,res){
 const p=printers.find(x=>x.id===req.params.id);
 if(!p||!p.enabled||!validHost(p.host)||!canSeePrinter(req.user,p)){res.status(404).json({error:'Printer not found'});return null}
 return p;
}

app.get('/api/printers/:id/camera',auth,async(req,res)=>{
 const p=findVisiblePrinter(req,res);if(!p)return;
 res.json(publicCamera(await resolveCamera(p,req.query.refresh==='1')));
});

app.get('/api/printers/:id/camera/snapshot',auth,async(req,res)=>{
 const p=findVisiblePrinter(req,res);if(!p)return;
 const cam=await resolveCamera(p);
 try{
  const r=await fetch(cam.snapshot,{signal:AbortSignal.timeout(6000)});
  const type=r.headers.get('content-type')||'';
  if(!r.ok||!type.startsWith('image/'))return res.status(502).json({error:'Camera not available'});
  res.set({'content-type':type,'cache-control':'no-store'});
  res.end(Buffer.from(await r.arrayBuffer()));
 }catch{
  res.status(502).json({error:'Camera not available'});
 }
});

app.get('/api/printers/:id/camera/stream',auth,async(req,res)=>{
 const p=findVisiblePrinter(req,res);if(!p)return;
 const cam=await resolveCamera(p);
 const ctrl=new AbortController();
 req.on('close',()=>ctrl.abort());
 const connectTimer=setTimeout(()=>ctrl.abort(),8000);
 try{
  const r=await fetch(cam.stream,{signal:ctrl.signal});
  clearTimeout(connectTimer);
  const type=r.headers.get('content-type')||'';
  if(!r.ok||!r.body||!/multipart|image/.test(type)){ctrl.abort();return res.status(502).json({error:'Camera stream not available'})}
  res.set({'content-type':type,'cache-control':'no-store, no-transform','x-accel-buffering':'no',connection:'keep-alive'});
  res.flushHeaders();
  const reader=r.body.getReader();
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(!res.write(value))await new Promise(resolve=>res.once('drain',resolve));
  }
  res.end();
 }catch{
  clearTimeout(connectTimer);
  if(!res.headersSent)res.status(502).json({error:'Camera stream not available'});else res.end();
 }
});

// Record a spool change: a full spool by default, or a partly used one
app.post('/api/printers/:id/spool',requireAdmin,(req,res)=>{
 const p=printers.find(x=>x.id===req.params.id);
 if(!p)return res.status(404).json({error:'Printer not found'});
 const capacityG=Number(req.body?.capacityG)||DEFAULT_SPOOL_G;
 const remainingG=req.body?.remainingG==null||req.body.remainingG===''?null:Number(req.body.remainingG);
 if(!(capacityG>0&&capacityG<=10000)||(remainingG!=null&&!(remainingG>=0&&remainingG<=capacityG)))return res.status(400).json({error:'Enter a spool size up to 10 kg, and grams left no more than the spool size'});
 loadSpool(p.id,{capacityG,remainingG,source:'manual'});
 record(p.id,'command',`${p.name}: New spool loaded (${remainingG==null?capacityG:remainingG} g)`);
 res.json({ok:true,spool:publicSpool(p.id,current.get(p.id))});
});

app.get('/api/printers',auth,(req,res)=>{
 let list=printers.map(p=>{
  const c=cameraCache.get(p.id);
  if(p.enabled&&validHost(p.host)&&(!c||Date.now()-c.checkedAt>60000))void resolveCamera(p).catch(()=>{});
  const cur=current.get(p.id)||{...p,status:'connecting',connected:false};
  return {...cur,camera:publicCamera(c),spool:publicSpool(p.id,cur)};
 });
 if (req.user && req.user.role !== 'admin') {
  const userPrinters = Array.isArray(req.user.assignedPrinters) ? req.user.assignedPrinters : [];
  const isAll = userPrinters.includes('*');
  list = list.filter(p => 
   isAll || 
   userPrinters.includes(p.id) || 
   (p.ownerEmail && p.ownerEmail.toLowerCase() === req.user.email?.toLowerCase())
  );
 }
 list.sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'}));
 res.json(list);
});

app.get('/api/events',auth,(req,res)=>{
 let list = events;
 if (req.user && req.user.role !== 'admin') {
  const userPrinters = Array.isArray(req.user.assignedPrinters) ? req.user.assignedPrinters : [];
  const isAll = userPrinters.includes('*');
  const allowed = new Set(
   printers
    .filter(p => isAll || userPrinters.includes(p.id) || (p.ownerEmail && p.ownerEmail.toLowerCase() === req.user.email?.toLowerCase()))
    .map(p => p.id)
  );
  list = events.filter(e => !e.printerId || e.printerId === 'system' || allowed.has(e.printerId));
 }
 res.json(list.slice(0,200));
});

app.get('/api/config',auth,(req,res)=>{
 let list = printers;
 if (req.user && req.user.role !== 'admin') {
  const userPrinters = Array.isArray(req.user.assignedPrinters) ? req.user.assignedPrinters : [];
  const isAll = userPrinters.includes('*');
  list = list.filter(p => 
   isAll || 
   userPrinters.includes(p.id) || 
   (p.ownerEmail && p.ownerEmail.toLowerCase() === req.user.email?.toLowerCase())
  );
 }
 res.json(list);
});

app.get('/api/completed-prints',auth,(req,res)=>{
 let filteredJobs = allJobs;
 if (req.user && req.user.role !== 'admin') {
  const userPrinters = Array.isArray(req.user.assignedPrinters) ? req.user.assignedPrinters : [];
  const isAll = userPrinters.includes('*');
  const allowed = new Set(
   printers
    .filter(p => isAll || userPrinters.includes(p.id) || (p.ownerEmail && p.ownerEmail.toLowerCase() === req.user.email?.toLowerCase()))
    .map(p => p.id)
  );
  filteredJobs = allJobs.filter(j => allowed.has(j.printerId));
 }
 // Keep inferred legacy entries on disk, but omit them from production totals
 // and from the job list. Authoritative history entries are still included.
 filteredJobs=filteredJobs.filter(job=>job.status!=='completed'||isConfirmedCompletion(job));
 const isLive=job=>String(job.id||'').startsWith(job.printerId+'_live_');
 const synced=filteredJobs.filter(job=>!isLive(job));
 filteredJobs=filteredJobs.filter(job=>!isLive(job)||!synced.some(h=>h.printerId===job.printerId&&(
  (job.jobId&&h.jobId===job.jobId)||(h.file===job.file&&Math.abs(Date.parse(h.completedAt)-Date.parse(job.completedAt))<300000))));
 const summaryMap=new Map();
 for(const j of filteredJobs){
  const fn=j.file||'Unknown';
  if(!summaryMap.has(fn)){
   summaryMap.set(fn,{file:fn,quantity:0,failedCount:0,totalJobs:0,totalDuration:0,failedDuration:0,lastCompletedAt:null,lastFailedAt:null,printers:new Set()});
  }
  const s=summaryMap.get(fn);
  s.totalJobs+=1;
  if(isConfirmedCompletion(j)){
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

 res.json({jobs:filteredJobs.slice(0,3000),summary});
});

app.post('/api/completed-prints/sync',requireAdmin,async(_req,res)=>{
 await syncAllHistory();
 res.json({ok:true});
});

app.put('/api/config',requireAdmin,(req,res)=>{
 const incoming=req.body;if(!Array.isArray(incoming)||incoming.length>100)return res.status(400).json({error:'Expected up to 100 printers'});
 const ids=new Set();
 for(const p of incoming){if(!p||typeof p.id!=='string'||!/^[-_a-z0-9]{1,48}$/i.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!validHost(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535||typeof p.enabled!=='boolean')return res.status(400).json({error:'Invalid printer configuration'});ids.add(p.id)}
 printers=incoming.map(({id,name,host,port,enabled,ownerEmail})=>({
  id,
  name,
  host,
  port,
  enabled,
  ownerEmail: (typeof ownerEmail==='string'?ownerEmail.trim().toLowerCase():'') || 'admin@neptunemonitor.com'
 }));
 save(configFile,printers);current.clear();last.clear();metadataCache.clear();void poll();void syncAllHistory();res.json({ok:true});
});

app.get('/api/users', requireAdmin, (_req, res) => {
 const safeList = users.map(u => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  assignedPrinters: u.assignedPrinters || ['*'],
  createdAt: u.createdAt || new Date().toISOString()
 }));
 res.json({ ok: true, users: safeList });
});

app.post('/api/users', requireAdmin, async (req, res) => {
 const { email, password, name, role, assignedPrinters } = req.body || {};
 if (!email || typeof email !== 'string' || !email.includes('@')) {
  return res.status(400).json({ error: 'Valid email address is required' });
 }
 const cleanEmail = email.trim().toLowerCase();
 if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
  return res.status(400).json({ error: 'A user with this email already exists' });
 }
 if (!password || typeof password !== 'string' || password.length < 6) {
  return res.status(400).json({ error: 'Password must be at least 6 characters' });
 }
 const userRole = role === 'admin' ? 'admin' : 'guest';
 const pwdHash = await bcrypt.hash(password, 11);
 const newUser = {
  id: 'user_' + crypto.randomUUID().slice(0, 8),
  email: cleanEmail,
  name: (name && typeof name === 'string' && name.trim()) || (userRole === 'admin' ? 'Admin' : 'Guest'),
  passwordHash: pwdHash,
  role: userRole,
  assignedPrinters: Array.isArray(assignedPrinters) && assignedPrinters.length ? assignedPrinters : ['*'],
  createdAt: new Date().toISOString()
 };
 users.push(newUser);
 save(usersFile, users);
 record('system', 'user', `New ${userRole} user created: ${cleanEmail} (${newUser.name})`);
 res.json({
  ok: true,
  user: {
   id: newUser.id,
   email: newUser.email,
   name: newUser.name,
   role: newUser.role,
   assignedPrinters: newUser.assignedPrinters,
   createdAt: newUser.createdAt
  }
 });
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
 const target = users.find(u => u.id === req.params.id);
 if (!target) return res.status(404).json({ error: 'User not found' });
 const { email, password, name, role, assignedPrinters } = req.body || {};
 if (email && typeof email === 'string' && email.includes('@')) {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail !== target.email.toLowerCase() && users.some(u => u.id !== target.id && u.email.toLowerCase() === cleanEmail)) {
   return res.status(400).json({ error: 'Another user already has this email' });
  }
  target.email = cleanEmail;
 }
 if (name && typeof name === 'string') target.name = name.trim();
 if (role && (role === 'admin' || role === 'guest')) {
  if (target.role === 'admin' && role === 'guest') {
   const adminCount = users.filter(u => u.role === 'admin').length;
   if (adminCount <= 1) return res.status(400).json({ error: 'Cannot demote the only admin account' });
  }
  target.role = role;
 }
 if (Array.isArray(assignedPrinters)) target.assignedPrinters = assignedPrinters;
 if (password && typeof password === 'string' && password.length >= 6) {
  target.passwordHash = await bcrypt.hash(password, 11);
  if (target.role === 'admin' && target.id === 'user_admin') {
   currentPasswordHash = target.passwordHash;
   hostSettings.passwordHash = currentPasswordHash;
   save(hostSettingsFile, hostSettings);
  }
 }
 save(usersFile, users);
 res.json({
  ok: true,
  user: {
   id: target.id,
   email: target.email,
   name: target.name,
   role: target.role,
   assignedPrinters: target.assignedPrinters,
   createdAt: target.createdAt
  }
 });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
 const target = users.find(u => u.id === req.params.id);
 if (!target) return res.status(404).json({ error: 'User not found' });
 if (target.role === 'admin') {
  const adminCount = users.filter(u => u.role === 'admin').length;
  if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the only admin account' });
 }
 users = users.filter(u => u.id !== req.params.id);
 save(usersFile, users);
 res.json({ ok: true });
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
  telegramEvents: hostSettings.telegramEvents || ['started', 'completed', 'runout', 'resumed', 'error', 'paused', 'offline', 'cancelled', 'lowfilament'],
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

app.put('/api/host-settings', requireAdmin, (req, res) => {
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
  hostSettings.telegramEvents = incoming.telegramEvents.filter(x => ['lowfilament', 'started', 'completed', 'runout', 'resumed', 'error', 'paused', 'offline', 'cancelled', 'lowfilament'].includes(x));
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
 
 const userId = req.user?.userId;
 const currentUser = users.find(u => u.id === userId) || users.find(u => u.role === 'admin') || users[0];
 const hashToCompare = currentUser?.passwordHash || currentPasswordHash;
 const valid = await bcrypt.compare(currentPassword, hashToCompare);
 if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

 const newHash = bcrypt.hashSync(newPassword, 11);
 if (currentUser) {
  currentUser.passwordHash = newHash;
  save(usersFile, users);
 }
 if (req.user?.role === 'admin' || currentUser?.role === 'admin') {
  currentPasswordHash = newHash;
  hostSettings.passwordHash = currentPasswordHash;
  save(hostSettingsFile, hostSettings);
 }
 res.json({ ok: true, message: 'Password updated successfully' });
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
   if(filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')){
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
   }
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
