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
const configFile=path.join(configDir,'printers.json'),exampleFile=path.join(configDir,'printers.example.json'),historyFile=path.join(dataDir,'events.json');
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
let printers=read(configFile,read(exampleFile,[])),events=read(historyFile,[]);
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
function normalize(p,body){
 const s=body?.result?.status||{},ps=s.print_stats||{},sd=s.virtual_sdcard||{};
 const sensed=Object.entries(s).filter(([k])=>k.startsWith('filament_switch_sensor ')||k.startsWith('filament_motion_sensor '));
 const enabled=sensed.filter(([,v])=>v.enabled!==0);
 const filament=enabled.length?enabled.every(([,v])=>v.filament_detected===true):null;
 const state=ps.state||'unknown';
 const statuses={printing:'printing',paused:'paused',complete:'completed',error:'error',cancelled:'cancelled',standby:'idle'};
 return {...p,connected:true,status:statuses[state]||'unknown',rawState:state,file:ps.filename||'',progress:Math.max(0,Math.min(100,Math.round((sd.progress||0)*100))),duration:ps.print_duration||0,filamentUsed:ps.filament_used||0,layer:ps.info?.current_layer??null,totalLayers:ps.info?.total_layer??null,nozzle:s.extruder?.temperature??null,nozzleTarget:s.extruder?.target??null,bed:s.heater_bed?.temperature??null,bedTarget:s.heater_bed?.target??null,filamentDetected:filament,filamentSensors:sensed.map(([name])=>name),updatedAt:new Date().toISOString()};
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
  const query=['print_stats','virtual_sdcard','extruder','heater_bed',...names].map(encodeURIComponent).join('&');
  const response=await fetch(endpoint+'/printer/objects/query?'+query,{signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('Status HTTP '+response.status);
  const body=await response.json();if(body.error)throw Error(body.error.message||'Moonraker status error');
  const next=normalize(p,body),prev=last.get(p.id);
  current.set(p.id,next);last.set(p.id,next);
  if(prev?.connected){
   if(prev.status!==next.status&&['completed','paused','error'].includes(next.status))record(p.id,next.status,p.name+': '+next.status.toUpperCase()+' — '+(next.file||'No filename'));
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
app.put('/api/config',auth,(req,res)=>{
 const incoming=req.body;if(!Array.isArray(incoming)||incoming.length>100)return res.status(400).json({error:'Expected up to 100 printers'});
 const ids=new Set();
 for(const p of incoming){if(!p||typeof p.id!=='string'||!/^[-_a-z0-9]{1,48}$/i.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!validHost(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535||typeof p.enabled!=='boolean')return res.status(400).json({error:'Invalid printer configuration'});ids.add(p.id)}
 printers=incoming.map(({id,name,host,port,enabled})=>({id,name,host,port,enabled}));
 save(configFile,printers);current.clear();last.clear();void poll();res.json({ok:true});
});
app.post('/api/test-telegram',auth,(_req,res)=>{void telegram('Test notification from Neptune Print Farm');res.json({ok:true,note:'Delivery attempted; check your Telegram bot chat'})});
const dist=path.join(root,'dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')))}
app.listen(port,'0.0.0.0',()=>console.log('Neptune Print Farm listening on port '+port));
void poll();setInterval(()=>void poll(),Math.max(2500,Number(process.env.POLL_MS)||5000));