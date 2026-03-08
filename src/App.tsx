import { useState, useEffect, useRef, useCallback } from 'react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type UserRole = 'artist' | 'listener';

interface User {
  id: string; name: string; email: string; avatar: string; role: UserRole;
  followers: number; following: number; tracksCount: number; verified: boolean; joinedAt: string;
  bio?: string;
}

interface Comment {
  id: string; userId: string; userName: string; userAvatar: string; text: string;
  timestamp: string; likes: number; liked: boolean; isAuthor?: boolean;
  replyTo?: { id: string; userName: string; text: string };
  _likedBy?: string[];
}

interface Track {
  id: string; title: string; artist: string; artistId: string; genre: string;
  plays: number; likes: number; reposts: number; duration: string; uploadDate: string;
  coverGradient: string; coverImage?: string; verified: boolean; isNew?: boolean;
  description: string; liked: boolean; reposted: boolean; comments: Comment[];
  waveform: number[]; isUserTrack: boolean; audioUrl?: string;
}

type ModalType = 'login' | 'register' | 'upload' | null;

interface AppNotification {
  id: string; type: string; text: string; icon: string; ts: number; read: boolean;
  trackId?: string;
}

interface ServerUser {
  id: string; name: string; email: string; role?: UserRole;
  tracksCount: number; followers: number; verified: boolean; joinedAt: string; bio?: string;
}

// ─── WS URL ───────────────────────────────────────────────────────────────────
const WS_URL = (() => {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port;
  if (port === '5173' || port === '4173') return `${proto}//${host}:3000`;
  return `${proto}//${window.location.host}`;
})();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(1)+'K' : String(n);
const fmtTime = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const engagementScore = (t: Track) => t.likes*3 + t.reposts*5 + t.comments.length*4 + t.plays*0.1;
const genWaveform = (seed: number): number[] =>
  Array.from({length:60},(_,i) => Math.max(10, Math.min(90, Math.abs(Math.sin(i*0.4+seed)*0.5 + Math.sin(i*0.8+seed*2)*0.3 + Math.sin(i*0.2)*0.2)*100+20)));

const GRADIENTS = [
  'linear-gradient(135deg,#8B5CF6,#3B82F6)',
  'linear-gradient(135deg,#EC4899,#8B5CF6)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#10B981,#3B82F6)',
  'linear-gradient(135deg,#6366F1,#EC4899)',
  'linear-gradient(135deg,#F97316,#FBBF24)',
  'linear-gradient(135deg,#14B8A6,#6366F1)',
  'linear-gradient(135deg,#EF4444,#7C3AED)',
];

const GENRES = [
  {name:'Electronic',icon:'⚡',gradient:GRADIENTS[0]},
  {name:'Hip-Hop',icon:'🎤',gradient:GRADIENTS[2]},
  {name:'Rock',icon:'🎸',gradient:GRADIENTS[7]},
  {name:'Lo-Fi',icon:'☕',gradient:GRADIENTS[3]},
  {name:'Jazz',icon:'🎷',gradient:GRADIENTS[5]},
  {name:'Classical',icon:'🎻',gradient:GRADIENTS[4]},
  {name:'Pop',icon:'🌟',gradient:GRADIENTS[1]},
  {name:'Indie',icon:'🎵',gradient:GRADIENTS[6]},
  {name:'Synthwave',icon:'🌃',gradient:GRADIENTS[0]},
  {name:'R&B',icon:'🎶',gradient:GRADIENTS[1]},
  {name:'Metal',icon:'🤘',gradient:GRADIENTS[7]},
  {name:'Folk',icon:'🪕',gradient:GRADIENTS[5]},
];

// ─── SECTION IDs ──────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'hero', label: 'Главная' },
  { id: 'trending', label: 'В тренде' },
  { id: 'genres', label: 'Жанры' },
  { id: 'releases', label: 'Новинки' },
];

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const LS_USER    = 'cm_user_v7';
const LS_NOTIFS  = 'cm_notifs_v7';
const LS_FOLLOW  = 'cm_follow_v7';

const loadJson = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const saveJson = <T,>(key: string, val: T) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /**/ }
};

const loadLocalUser  = () => loadJson<User|null>(LS_USER, null);
const saveLocalUser  = (u: User|null) => saveJson(LS_USER, u);

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
const audioEl = new Audio();
audioEl.volume = 0.75;
audioEl.preload = 'auto';

// ─── PARTICLE CANVAS ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({x:-999,y:-999});
  useEffect(()=>{
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number;
    let W = window.innerWidth, H = window.innerHeight;
    const resize = () => { W=window.innerWidth; H=window.innerHeight; canvas.width=W; canvas.height=H; };
    resize(); window.addEventListener('resize', resize);
    const N = Math.min(100, Math.floor((W*H)/14000));
    const particles = Array.from({length:N}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35,
      r: Math.random()*1.8+0.3, alpha: Math.random()*0.35+0.06,
      pulse: Math.random()*Math.PI*2,
      color: ['139,92,246','59,130,246','255,255,255'][Math.floor(Math.random()*3)],
    }));
    const onMM = (e: MouseEvent) => { mouseRef.current={x:e.clientX,y:e.clientY}; };
    window.addEventListener('mousemove', onMM);
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      const {x:mx,y:my} = mouseRef.current;
      for (const p of particles) {
        const dx=mx-p.x, dy=my-p.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<100&&d>0) { const f=(100-d)/100*0.012; p.vx-=dx/d*f; p.vy-=dy/d*f; }
        p.vx*=0.99; p.vy*=0.99;
        p.x=Math.max(0,Math.min(W,p.x+p.vx)); p.y=Math.max(0,Math.min(H,p.y+p.vy));
        if(p.x<=0||p.x>=W) p.vx*=-1; if(p.y<=0||p.y>=H) p.vy*=-1;
        p.pulse+=0.02;
        const a = p.alpha*(0.7+0.3*Math.sin(p.pulse));
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${p.color},${a})`; ctx.fill();
      }
      for (let i=0; i<particles.length; i++) for (let j=i+1; j<particles.length; j++) {
        const a=particles[i], b=particles[j];
        const dx=a.x-b.x, dy=a.y-b.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<85) { ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle=`rgba(139,92,246,${(1-d/85)*0.09})`; ctx.lineWidth=0.5; ctx.stroke(); }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize',resize); window.removeEventListener('mousemove',onMM); };
  },[]);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}}/>;
}

// ─── WAVEFORM ─────────────────────────────────────────────────────────────────
function Waveform({bars,progress,small=false,onClick}:{bars:number[];progress?:number;small?:boolean;onClick?:(r:number)=>void}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'1.5px',height:small?26:38,cursor:onClick?'pointer':'default'}}
      onClick={onClick?(e)=>{const r=e.currentTarget.getBoundingClientRect();onClick(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));}:undefined}>
      {bars.map((v,i)=>{
        const passed = progress!==undefined?(i/bars.length)*100<=(progress??0):false;
        return <div key={i} style={{width:small?'2px':'2.5px',height:`${Math.min(v,90)}%`,borderRadius:'2px',background:passed?'linear-gradient(180deg,#8B5CF6,#3B82F6)':`rgba(139,92,246,${0.15+v/320})`,transition:'background 0.08s'}}/>;
      })}
    </div>
  );
}

// ─── ANIMATED WAVE ────────────────────────────────────────────────────────────
function AnimatedWave() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'3px',height:56}}>
      {Array.from({length:28},(_,i)=>(
        <div key={i} style={{width:'4px',background:'linear-gradient(180deg,#8B5CF6,#3B82F6)',borderRadius:'3px',opacity:0.65,
          animation:`heroWave ${0.6+Math.sin(i*0.5)*0.4}s ease-in-out ${i*0.05}s infinite alternate`,
          height:`${18+Math.abs(Math.sin(i*0.5))*38}px`}}/>
      ))}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({msg,onDone}:{msg:string;onDone:()=>void}) {
  useEffect(()=>{const t=setTimeout(onDone,3200);return()=>clearTimeout(t);},[onDone]);
  return (
    <div className="glass-strong" style={{padding:'12px 16px',borderRadius:12,fontSize:'0.82rem',fontWeight:600,color:'#f8fafc',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',gap:9,minWidth:'220px',maxWidth:'340px',animation:'fadeInUp 0.3s ease',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',pointerEvents:'all'}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',flexShrink:0}}/>
      {msg}
    </div>
  );
}

// ─── COVER ART ────────────────────────────────────────────────────────────────
function CoverArt({gradient,image,size=56}:{gradient:string;image?:string;size?:number}) {
  return (
    <div style={{width:size,height:size,borderRadius:size<50?'8px':'12px',background:gradient,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(139,92,246,0.18)',overflow:'hidden'}}>
      {image
        ? <img src={image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : <svg width={size*0.38} height={size*0.38} viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-2c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z"/></svg>
      }
    </div>
  );
}

// ─── VERIFIED ICON ────────────────────────────────────────────────────────────
function VerifiedIcon({size=14}:{size?:number}) {
  return (
    <div style={{width:size+4,height:size+4,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width={size-2} height={size-2} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
  );
}

// ─── WS STATUS ────────────────────────────────────────────────────────────────
function WsStatus({connected}:{connected:boolean}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:connected?'#34d399':'#F59E0B',animation:connected?'playingPulse 2s ease infinite':'none'}}/>
      <span style={{fontSize:'0.68rem',color:connected?'#34d399':'#F59E0B',fontWeight:600}}>{connected?'Онлайн':'Офлайн'}</span>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell({notifications,onClear,onMarkRead,onNotifClick}:{notifications:AppNotification[];onClear:()=>void;onMarkRead:()=>void;onNotifClick:(n:AppNotification)=>void}) {
  const [open,setOpen] = useState(false);
  const unread = notifications.filter(n=>!n.read).length;
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if (!open) return;
    const fn=(e:MouseEvent)=>{if(panelRef.current&&!panelRef.current.contains(e.target as Node)){setOpen(false);onMarkRead();}};
    document.addEventListener('mousedown',fn);
    return ()=>document.removeEventListener('mousedown',fn);
  },[open,onMarkRead]);
  return (
    <div style={{position:'relative'}} ref={panelRef}>
      <button onClick={()=>{setOpen(p=>!p);if(open)onMarkRead();}}
        style={{background:unread>0?'rgba(139,92,246,0.12)':'rgba(255,255,255,0.06)',border:unread>0?'1px solid rgba(139,92,246,0.3)':'1px solid rgba(255,255,255,0.08)',borderRadius:10,width:36,height:36,cursor:'pointer',color:unread>0?'#a78bfa':'#64748b',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',transition:'all 0.2s'}}
        title="Уведомления">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        {unread>0&&<div style={{position:'absolute',top:-4,right:-4,width:17,height:17,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',fontSize:'0.58rem',fontWeight:800,color:'white',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #0a0a0a'}}>{unread>9?'9+':unread}</div>}
      </button>
      {open&&(
        <div className="glass-strong" style={{position:'absolute',top:'110%',right:0,zIndex:300,width:300,maxHeight:420,borderRadius:16,border:'1px solid rgba(255,255,255,0.1)',display:'flex',flexDirection:'column',overflow:'hidden',animation:'fadeInUp 0.2s ease'}}>
          <div style={{padding:'13px 15px 9px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontWeight:700,color:'#f8fafc',fontSize:'0.83rem'}}>Уведомления</span>
            {notifications.length>0&&<button onClick={()=>{onClear();setOpen(false);}} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',fontSize:'0.7rem',fontFamily:'Inter,sans-serif'}}>Очистить</button>}
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {notifications.length===0
              ? <div style={{padding:'36px 20px',textAlign:'center',color:'#475569'}}><div style={{fontSize:'1.8rem',marginBottom:8}}>🔔</div><div style={{fontSize:'0.8rem'}}>Нет уведомлений</div></div>
              : notifications.slice().reverse().map(n=>(
                <div key={n.id} onClick={()=>{onNotifClick(n);setOpen(false);onMarkRead();}} style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:n.read?'transparent':'rgba(139,92,246,0.05)',display:'flex',gap:9,alignItems:'flex-start',cursor:'pointer',transition:'background 0.15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(139,92,246,0.1)')}
                  onMouseLeave={e=>(e.currentTarget.style.background=n.read?'transparent':'rgba(139,92,246,0.05)')}>
                  <div style={{fontSize:'1rem',flexShrink:0,marginTop:1}}>{n.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'0.76rem',color:'#cbd5e1',lineHeight:1.4}}>{n.text}</div>
                    <div style={{fontSize:'0.62rem',color:'#475569',marginTop:2}}>{new Date(n.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {!n.read&&<div style={{width:6,height:6,borderRadius:'50%',background:'#8B5CF6',flexShrink:0,marginTop:5}}/>}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INPUT FIELD ──────────────────────────────────────────────────────────────
interface InputFieldProps {label:string;type?:string;value:string;onChange:(v:string)=>void;placeholder?:string;err?:string;rows?:number;}
function InputField({label,type='text',value,onChange,placeholder,err,rows}:InputFieldProps) {
  return (
    <div>
      <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</label>
      {rows
        ? <textarea className="input-dark" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{resize:'vertical',borderColor:err?'rgba(239,68,68,0.6)':undefined}}/>
        : <input className="input-dark" type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{borderColor:err?'rgba(239,68,68,0.6)':undefined}}/>
      }
      {err&&<div style={{color:'#EF4444',fontSize:'0.73rem',marginTop:4}}>{err}</div>}
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
interface AuthModalProps {type:'login'|'register';onClose:()=>void;onSuccess:(u:User)=>void;onNotify:(m:string)=>void;wsRef:React.RefObject<WebSocket|null>;serverUsers:ServerUser[];}
function AuthModal({type:initType,onClose,onSuccess,onNotify,wsRef,serverUsers}:AuthModalProps) {
  const [mode,setMode]       = useState<'login'|'register'>(initType);
  const [name,setName]       = useState('');
  const [email,setEmail]     = useState('');
  const [password,setPassword] = useState('');
  const [role,setRole]       = useState<UserRole>('listener');
  const [agreed,setAgreed]   = useState(false);
  const [loading,setLoading] = useState(false);
  const [errors,setErrors]   = useState<Record<string,string>>({});

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  },[onClose]);

  const validate=()=>{
    const err:Record<string,string>={};
    if(mode==='register'){
      if(name.trim().length<2) err.name='Минимум 2 символа';
      else if(serverUsers.some(u=>u.name.trim().toLowerCase()===name.trim().toLowerCase())) err.name=`Имя «${name.trim()}» уже занято`;
    }
    if(!email.match(/^[^@]+@[^@]+\.[^@]+$/)) err.email='Некорректный email';
    if(password.length<6) err.password=mode==='register'?'Минимум 6 символов':'Неверный пароль';
    if(mode==='register'&&!agreed) err.agreed='Необходимо согласие';
    setErrors(err);
    return Object.keys(err).length===0;
  };

  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault();
    if(!validate()) return;
    setLoading(true);

    if(mode==='register'){
      const user:User={
        id:'u_'+Date.now()+'_'+Math.random().toString(36).slice(2),
        name:name.trim(), email:email.trim().toLowerCase(),
        avatar:GRADIENTS[Math.floor(Math.random()*GRADIENTS.length)],
        role, followers:0, following:0, tracksCount:0, verified:true,
        joinedAt:new Date().toLocaleDateString('ru-RU'),
      };
      const ws=wsRef.current;
      if(ws&&ws.readyState===WebSocket.OPEN){
        const handle=(ev:MessageEvent)=>{
          let msg:{type:string;message?:string;user?:ServerUser};
          try{msg=JSON.parse(ev.data);}catch{return;}
          if(msg.type==='REGISTER_OK'||msg.type==='ERROR'){
            ws.removeEventListener('message',handle); setLoading(false);
            if(msg.type==='ERROR'){ setErrors({name:msg.message||'Ошибка'}); }
            else { onSuccess(user); onClose(); onNotify('🎉 Добро пожаловать в ClaudMusic!'); }
          }
        };
        ws.addEventListener('message',handle);
        ws.send(JSON.stringify({type:'REGISTER',user}));
      } else {
        setTimeout(()=>{setLoading(false);onSuccess(user);onClose();onNotify('🎉 Аккаунт создан!');},600);
      }
    } else {
      const ws=wsRef.current;
      if(ws&&ws.readyState===WebSocket.OPEN){
        const handle=(ev:MessageEvent)=>{
          let msg:{type:string;user?:ServerUser};
          try{msg=JSON.parse(ev.data);}catch{return;}
          if(msg.type==='LOGIN_OK'||msg.type==='LOGIN_NOT_FOUND'){
            ws.removeEventListener('message',handle); setLoading(false);
            if(msg.type==='LOGIN_NOT_FOUND'){ setErrors({email:'Аккаунт не найден'}); }
            else if(msg.user){
              const su=msg.user;
              const user:User={id:su.id,name:su.name,email:su.email,avatar:GRADIENTS[Math.abs(su.name.charCodeAt(0)%GRADIENTS.length)],role:su.role||'listener',followers:su.followers||0,following:0,tracksCount:su.tracksCount||0,verified:true,joinedAt:su.joinedAt};
              onSuccess(user); onClose(); onNotify(`👋 С возвращением, ${su.name}!`);
            }
          }
        };
        ws.addEventListener('message',handle);
        ws.send(JSON.stringify({type:'LOGIN',email:email.trim().toLowerCase()}));
      } else {
        setTimeout(()=>{
          setLoading(false);
          const su=serverUsers.find(u=>u.email.toLowerCase()===email.trim().toLowerCase());
          if(su){
            const user:User={id:su.id,name:su.name,email:su.email,avatar:GRADIENTS[0],role:su.role||'listener',followers:su.followers||0,following:0,tracksCount:su.tracksCount||0,verified:true,joinedAt:su.joinedAt};
            onSuccess(user); onClose(); onNotify(`👋 С возвращением, ${su.name}!`);
          } else { setErrors({email:'Аккаунт не найден'}); }
        },500);
      }
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(14px)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass-strong" style={{width:'100%',maxWidth:400,borderRadius:24,padding:'32px 28px',border:'1px solid rgba(255,255,255,0.1)',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.06)',border:'none',width:30,height:30,borderRadius:8,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:26}}>
          <div style={{width:40,height:40,background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 18px rgba(139,92,246,0.4)'}}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M2 12C2 12 4 4 6 4C8 4 8 20 10 20C12 20 12 8 14 8C16 8 16 16 18 16C20 16 22 12 22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{fontWeight:800,color:'#f8fafc',fontSize:'1rem'}}>{mode==='login'?'Войти в ClaudMusic':'Создать аккаунт'}</div>
            <div style={{fontSize:'0.72rem',color:'#64748b'}}>{mode==='login'?'Слушай без ограничений':'Только реальные люди'}</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:13}}>
          {mode==='register'&&<InputField label="Имя / Ник" value={name} onChange={setName} placeholder="Как тебя называть?" err={errors.name}/>}
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" err={errors.email}/>
          <InputField label="Пароль" type="password" value={password} onChange={setPassword} placeholder={mode==='register'?'Минимум 6 символов':'••••••••'} err={errors.password}/>
          {mode==='register'&&(
            <>
              <div>
                <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',marginBottom:7,textTransform:'uppercase',letterSpacing:'0.5px'}}>Кто ты?</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {([['artist','🎤','Артист','Создаю музыку'],['listener','🎧','Слушатель','Слушаю музыку']] as const).map(([r,icon,lbl,desc])=>(
                    <div key={r} onClick={()=>setRole(r as UserRole)} style={{padding:'11px 12px',borderRadius:12,border:`1px solid ${role===r?'rgba(139,92,246,0.6)':'rgba(255,255,255,0.08)'}`,background:role===r?'rgba(139,92,246,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.2s'}}>
                      <div style={{fontSize:'1.3rem',marginBottom:3}}>{icon}</div>
                      <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.8rem'}}>{lbl}</div>
                      <div style={{fontSize:'0.65rem',color:'#64748b'}}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <label style={{display:'flex',alignItems:'flex-start',gap:9,cursor:'pointer'}}>
                <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:2,accentColor:'#8B5CF6',width:14,height:14}}/>
                <span style={{fontSize:'0.76rem',color:'#64748b',lineHeight:1.5}}>Подтверждаю, что я реальный человек и согласен с <span style={{color:'#a78bfa'}}>условиями</span></span>
              </label>
              {errors.agreed&&<div style={{color:'#EF4444',fontSize:'0.73rem',marginTop:-6}}>{errors.agreed}</div>}
            </>
          )}
          <button type="submit" disabled={loading} className="btn-glow" style={{border:'none',cursor:loading?'not-allowed':'pointer',padding:'12px',borderRadius:12,fontSize:'0.92rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',opacity:loading?0.8:1,marginTop:2}}>
            <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {loading&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
              {loading?'Подождите...':mode==='login'?'→ Войти':'✓ Создать аккаунт'}
            </span>
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:18,fontSize:'0.8rem',color:'#64748b'}}>
          {mode==='login'?'Нет аккаунта?':'Уже есть аккаунт?'}{' '}
          <span onClick={()=>{setMode(m=>m==='login'?'register':'login');setErrors({});}} style={{color:'#a78bfa',cursor:'pointer',fontWeight:600}}>
            {mode==='login'?'Зарегистрироваться':'Войти'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────
interface UploadModalProps {onClose:()=>void;onUpload:(t:Track)=>void;onNotify:(m:string)=>void;userName:string;userId:string;}
function UploadModal({onClose,onUpload,onNotify,userName,userId}:UploadModalProps) {
  const [isDragOver,setIsDragOver] = useState(false);
  const [file,setFile]             = useState<File|null>(null);
  const [coverFile,setCoverFile]   = useState<File|null>(null);
  const [coverPreview,setCoverPreview] = useState('');
  const [title,setTitle]           = useState('');
  const [genre,setGenre]           = useState('');
  const [description,setDescription] = useState('');
  const [uploading,setUploading]   = useState(false);
  const [progress,setProgress]     = useState(0);
  const [done,setDone]             = useState(false);
  const [errors,setErrors]         = useState<Record<string,string>>({});
  const [duration,setDuration]     = useState('');
  const [blobUrl,setBlobUrl]       = useState('');
  const [pendingTrack,setPendingTrack] = useState<Track|null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  },[onClose]);

  const handleFile=(f:File)=>{
    if(!f.type.startsWith('audio/')&&!/\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(f.name)){setErrors({file:'Только аудио: MP3, WAV, FLAC, OGG, AAC, M4A'});return;}
    setErrors({}); setFile(f);
    if(!title) setTitle(f.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '));
    if(blobUrl) URL.revokeObjectURL(blobUrl);
    const url=URL.createObjectURL(f); setBlobUrl(url);
    const a=new Audio(url);
    a.addEventListener('loadedmetadata',()=>{const s=Math.round(a.duration);setDuration(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);});
  };

  const handleCover=(f:File)=>{
    if(!f.type.startsWith('image/')){setErrors({cover:'Только изображения: JPG, PNG, WEBP'});return;}
    setCoverFile(f);
    const reader=new FileReader();
    reader.onload=(e)=>setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const validate=()=>{
    const err:Record<string,string>={};
    if(!file) err.file='Выбери аудио файл';
    if(!title.trim()) err.title='Введи название трека';
    if(!genre) err.genre='Выбери жанр';
    setErrors(err);
    return Object.keys(err).length===0;
  };

  const handlePublish=()=>{
    if(!validate()||!file) return;
    setUploading(true);
    const track:Track={
      id:'t_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      title:title.trim(), artist:userName, artistId:userId, genre,
      plays:0, likes:0, reposts:0, duration:duration||'?:??',
      uploadDate:'только что',
      coverGradient:GRADIENTS[Math.floor(Math.random()*GRADIENTS.length)],
      coverImage:coverPreview||undefined,
      verified:true, isNew:true, description:description||'',
      liked:false, reposted:false, comments:[],
      waveform:genWaveform(Math.random()*100),
      isUserTrack:true, audioUrl:blobUrl,
    };
    setPendingTrack(track);
    let p=0;
    const iv=setInterval(()=>{p+=Math.random()*9+5;if(p>=100){clearInterval(iv);setProgress(100);setUploading(false);setDone(true);}else setProgress(Math.min(p,100));},100);
  };

  const handleDone=()=>{
    if(pendingTrack){onUpload(pendingTrack);onNotify(`🎵 «${pendingTrack.title}» опубликован!`);}
    onClose();
  };

  void coverFile;
  const genreList=['Electronic','Hip-Hop','Rock','Lo-Fi','Jazz','Classical','Pop','Indie','Synthwave','R&B','Metal','Folk','Другое'];

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(14px)',overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass-strong" style={{width:'100%',maxWidth:500,borderRadius:24,padding:'28px 24px',border:'1px solid rgba(255,255,255,0.1)',position:'relative',margin:'auto'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.06)',border:'none',width:30,height:30,borderRadius:8,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:22}}>
          <div style={{width:40,height:40,background:'linear-gradient(135deg,#10B981,#3B82F6)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div>
            <div style={{fontWeight:800,color:'#f8fafc',fontSize:'1rem'}}>Загрузить трек</div>
            <div style={{fontSize:'0.72rem',color:'#64748b'}}>Поделись своим творчеством</div>
          </div>
        </div>

        {done?(
          <div style={{textAlign:'center',padding:'28px 0'}}>
            <div style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg,#10B981,#3B82F6)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 36px rgba(16,185,129,0.3)'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div style={{fontSize:'1.3rem',fontWeight:800,color:'#f8fafc',marginBottom:9}}>Трек готов! 🎉</div>
            <div style={{color:'#64748b',marginBottom:24,fontSize:'0.87rem'}}>«{title}» опубликован</div>
            <button onClick={handleDone} className="btn-glow" style={{border:'none',cursor:'pointer',padding:'11px 28px',borderRadius:12,fontSize:'0.9rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif'}}>
              <span style={{display:'flex',alignItems:'center',gap:8}}><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>Слушать →</span>
            </button>
          </div>
        ):(
          <>
            {/* Audio drop zone */}
            <div onDragOver={e=>{e.preventDefault();setIsDragOver(true);}} onDragLeave={()=>setIsDragOver(false)}
              onDrop={e=>{e.preventDefault();setIsDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
              onClick={()=>fileRef.current?.click()}
              style={{borderRadius:14,padding:'22px 16px',textAlign:'center',cursor:'pointer',marginBottom:12,background:isDragOver?'rgba(139,92,246,0.1)':'rgba(255,255,255,0.02)',border:`2px dashed ${isDragOver?'rgba(139,92,246,0.6)':errors.file?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.1)'}`,transition:'all 0.2s'}}>
              <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
              <div style={{width:44,height:44,borderRadius:11,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              {file?(<div><div style={{fontSize:'0.87rem',fontWeight:700,color:'#a78bfa',marginBottom:3}}>✓ {file.name}</div>{duration&&<div style={{fontSize:'0.72rem',color:'#64748b'}}>Длительность: {duration}</div>}</div>):(<div><div style={{fontSize:'0.85rem',fontWeight:600,color:'#f8fafc',marginBottom:4}}>Перетащи или выбери аудио</div><div style={{fontSize:'0.72rem',color:'#475569'}}>MP3, WAV, FLAC, OGG, AAC, M4A</div></div>)}
            </div>
            {errors.file&&<div style={{color:'#EF4444',fontSize:'0.76rem',marginBottom:9,marginTop:-6}}>{errors.file}</div>}

            {/* Cover */}
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',marginBottom:7,textTransform:'uppercase',letterSpacing:'0.5px'}}>Обложка (необязательно)</label>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:64,height:64,borderRadius:10,background:coverPreview?'transparent':GRADIENTS[0],flexShrink:0,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)'}}>
                  {coverPreview?<img src={coverPreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-2c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z"/></svg></div>}
                </div>
                <div style={{flex:1}}>
                  <button onClick={()=>coverRef.current?.click()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,padding:'8px 16px',cursor:'pointer',color:'#94a3b8',fontSize:'0.78rem',fontWeight:600,fontFamily:'Inter,sans-serif',width:'100%',textAlign:'left'}}>
                    {coverPreview?'Изменить обложку':'Выбрать изображение...'}
                  </button>
                  <input ref={coverRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleCover(f);}}/>
                  <div style={{fontSize:'0.65rem',color:'#475569',marginTop:4}}>JPG, PNG, WEBP — рекомендуется 1:1</div>
                </div>
              </div>
              {errors.cover&&<div style={{color:'#EF4444',fontSize:'0.73rem',marginTop:5}}>{errors.cover}</div>}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:11,marginBottom:16}}>
              <InputField label="Название *" value={title} onChange={setTitle} placeholder="Как называется твой трек?" err={errors.title}/>
              <div>
                <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.5px'}}>Жанр *</label>
                <select className="input-dark" value={genre} onChange={e=>setGenre(e.target.value)} style={{borderColor:errors.genre?'rgba(239,68,68,0.6)':undefined}}>
                  <option value="">Выбери жанр</option>
                  {genreList.map(g=><option key={g} value={g} style={{background:'#1a1a1a'}}>{g}</option>)}
                </select>
                {errors.genre&&<div style={{color:'#EF4444',fontSize:'0.73rem',marginTop:4}}>{errors.genre}</div>}
              </div>
              <InputField label="Описание" value={description} onChange={setDescription} placeholder="Расскажи о треке..." rows={2}/>
            </div>

            {uploading&&(
              <div style={{marginBottom:13}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:'0.78rem',color:'#94a3b8'}}>Публикация...</span>
                  <span style={{fontSize:'0.78rem',color:'#a78bfa',fontWeight:700}}>{Math.round(progress)}%</span>
                </div>
                <div style={{height:5,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#8B5CF6,#3B82F6)',borderRadius:3,transition:'width 0.15s ease'}}/>
                </div>
              </div>
            )}
            <button onClick={handlePublish} disabled={uploading} className="btn-glow" style={{width:'100%',border:'none',cursor:uploading?'not-allowed':'pointer',padding:12,borderRadius:12,fontSize:'0.92rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',opacity:uploading?0.8:1}}>
              <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {uploading?<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Публикация...</>:'⬆ Опубликовать трек'}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── COMMENTS MODAL ───────────────────────────────────────────────────────────
interface CommentsModalProps {track:Track;user:User|null;onClose:()=>void;onUpdateTrack:(t:Track)=>void;onRequestLogin:()=>void;wsRef:React.RefObject<WebSocket|null>;}
function CommentsModal({track,user,onClose,onUpdateTrack,onRequestLogin,wsRef}:CommentsModalProps) {
  const [text,setText]     = useState('');
  const [replyTo,setReplyTo] = useState<{id:string;userName:string;text:string}|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  },[onClose]);

  const postComment=()=>{
    if(!text.trim()||!user) return;
    const c:Comment={
      id:'c_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      userId:user.id, userName:user.name, userAvatar:user.avatar,
      text:text.trim(), timestamp:'только что', likes:0, liked:false,
      isAuthor:user.id===track.artistId,
      replyTo:replyTo||undefined,
    };
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'COMMENT',trackId:track.id,comment:c}));
    onUpdateTrack({...track,comments:[...track.comments,c]});
    setText(''); setReplyTo(null);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);
  };

  const likeComment=(cid:string)=>{
    if(!user) return;
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'COMMENT_LIKE',trackId:track.id,commentId:cid,userId:user.id}));
    onUpdateTrack({...track,comments:track.comments.map(c=>c.id===cid?{...c,liked:!c.liked,likes:c.liked?c.likes-1:c.likes+1}:c)});
  };

  const startReply=(c:Comment)=>{setReplyTo({id:c.id,userName:c.userName,text:c.text});setTimeout(()=>inputRef.current?.focus(),50);};

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass-strong" style={{width:'100%',maxWidth:600,borderRadius:'22px 22px 0 0',border:'1px solid rgba(255,255,255,0.1)',maxHeight:'80vh',display:'flex',flexDirection:'column',animation:'fadeInUp 0.3s ease'}}>
        <div style={{padding:'14px 20px 11px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <CoverArt gradient={track.coverGradient} image={track.coverImage} size={36}/>
            <div>
              <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.86rem'}}>{track.title}</div>
              <div style={{fontSize:'0.68rem',color:'#64748b'}}>{track.artist} · {track.comments.length} комм.</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'none',width:30,height:30,borderRadius:8,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'13px 20px',display:'flex',flexDirection:'column',gap:13}}>
          {track.comments.length===0&&(
            <div style={{textAlign:'center',padding:'36px 0',color:'#475569'}}>
              <div style={{fontSize:'2.2rem',marginBottom:9}}>💬</div>
              <div style={{fontWeight:600,color:'#64748b'}}>Пока нет комментариев</div>
              <div style={{fontSize:'0.8rem',marginTop:5}}>Будь первым!</div>
            </div>
          )}
          {track.comments.map(c=>(
            <div key={c.id} style={{display:'flex',gap:9}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:c.userAvatar,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:700,color:'white'}}>{c.userName[0].toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,color:'#f8fafc',fontSize:'0.82rem'}}>{c.userName}</span>
                  {c.isAuthor&&(
                    <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.2))',border:'1px solid rgba(139,92,246,0.4)',borderRadius:100,padding:'1px 7px',fontSize:'0.58rem',fontWeight:700,color:'#a78bfa'}}>
                      <VerifiedIcon size={6}/> Автор
                    </span>
                  )}
                  <span style={{fontSize:'0.62rem',color:'#475569'}}>{c.timestamp}</span>
                </div>
                {c.replyTo&&(
                  <div style={{background:'rgba(139,92,246,0.08)',borderLeft:'2px solid rgba(139,92,246,0.4)',borderRadius:'0 6px 6px 0',padding:'4px 9px',marginBottom:5}}>
                    <div style={{fontSize:'0.62rem',color:'#a78bfa',fontWeight:600,marginBottom:2}}>↩ {c.replyTo.userName}</div>
                    <div style={{fontSize:'0.7rem',color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:250}}>{c.replyTo.text}</div>
                  </div>
                )}
                <div style={{fontSize:'0.85rem',color:'#cbd5e1',lineHeight:1.5,marginBottom:5}}>{c.text}</div>
                <div style={{display:'flex',alignItems:'center',gap:11}}>
                  <button onClick={()=>likeComment(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:c.liked?'#EC4899':'#475569',fontSize:'0.7rem',display:'flex',alignItems:'center',gap:3,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill={c.liked?'currentColor':'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    {c.likes>0&&c.likes}
                  </button>
                  {user&&(
                    <button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',fontSize:'0.7rem',display:'flex',alignItems:'center',gap:3,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='#a78bfa')} onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      Ответить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:'11px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          {replyTo&&(
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7,background:'rgba(139,92,246,0.06)',borderRadius:8,padding:'5px 11px'}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M9 14l-4-4 4-4M5 10h11a4 4 0 010 8h-1"/></svg>
              <span style={{fontSize:'0.7rem',color:'#a78bfa',fontWeight:600}}>↩ {replyTo.userName}:</span>
              <span style={{fontSize:'0.7rem',color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{replyTo.text}</span>
              <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',padding:0,display:'flex'}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {!user?(
            <div style={{textAlign:'center',color:'#64748b',fontSize:'0.85rem',padding:'3px 0'}}>
              <span style={{color:'#a78bfa',cursor:'pointer',fontWeight:600}} onClick={()=>{onClose();onRequestLogin();}}>Войди</span>, чтобы оставить комментарий
            </div>
          ):(
            <div style={{display:'flex',gap:7}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:user.avatar,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:700,color:'white'}}>{user.name[0].toUpperCase()}</div>
              <div style={{flex:1,display:'flex',gap:7}}>
                <input ref={inputRef} className="input-dark" placeholder={replyTo?`Ответить ${replyTo.userName}...`:'Напиши комментарий...'}
                  value={text} onChange={e=>setText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();postComment();}}}
                  style={{flex:1}}/>
                <button onClick={postComment} disabled={!text.trim()}
                  style={{background:text.trim()?'linear-gradient(135deg,#8B5CF6,#3B82F6)':'rgba(255,255,255,0.06)',border:'none',borderRadius:8,padding:'8px 13px',cursor:text.trim()?'pointer':'not-allowed',color:'white',fontWeight:600,fontSize:'0.8rem',fontFamily:'Inter,sans-serif',transition:'all 0.2s',whiteSpace:'nowrap'}}>
                  {replyTo?'↩':'→'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────
interface ProfileModalProps {artist:ServerUser;tracks:Track[];currentUser:User|null;onClose:()=>void;onPlayTrack:(t:Track)=>void;onFollowToggle:(artistId:string)=>void;followingIds:string[];}
function ProfileModal({artist,tracks,currentUser,onClose,onPlayTrack,onFollowToggle,followingIds}:ProfileModalProps) {
  const artistTracks = tracks.filter(t=>t.artistId===artist.id);
  const isFollowing  = followingIds.includes(artist.id);
  const isOwnProfile = currentUser?.id===artist.id;
  const totalPlays   = artistTracks.reduce((s,t)=>s+t.plays,0);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',fn);return ()=>window.removeEventListener('keydown',fn);},[onClose]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(14px)',overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass-strong" style={{width:'100%',maxWidth:540,borderRadius:24,border:'1px solid rgba(255,255,255,0.1)',overflow:'hidden',margin:'auto',animation:'fadeInUp 0.3s ease'}}>
        <div style={{height:90,background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(59,130,246,0.2))',position:'relative'}}>
          <button onClick={onClose} style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,0.5)',border:'none',width:30,height:30,borderRadius:8,cursor:'pointer',color:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'0 22px 24px'}}>
          <div style={{width:68,height:68,borderRadius:'50%',background:GRADIENTS[Math.abs(artist.name.charCodeAt(0)%GRADIENTS.length)],border:'3px solid #0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',fontWeight:800,color:'white',marginTop:-34,marginBottom:14}}>
            {artist.name[0].toUpperCase()}
          </div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                <span style={{fontWeight:800,color:'#f8fafc',fontSize:'1.15rem'}}>{artist.name}</span>
                {artist.verified&&<VerifiedIcon size={13}/>}
                <span style={{fontSize:'0.65rem',background:artist.role==='artist'?'rgba(139,92,246,0.15)':'rgba(59,130,246,0.15)',color:artist.role==='artist'?'#a78bfa':'#60a5fa',border:`1px solid ${artist.role==='artist'?'rgba(139,92,246,0.3)':'rgba(59,130,246,0.3)'}`,borderRadius:100,padding:'2px 8px'}}>
                  {artist.role==='artist'?'🎤 Артист':'🎧 Слушатель'}
                </span>
              </div>
              <div style={{fontSize:'0.75rem',color:'#475569'}}>На платформе с {artist.joinedAt}</div>
            </div>
            {!isOwnProfile&&currentUser&&(
              <button onClick={()=>onFollowToggle(artist.id)}
                style={{background:isFollowing?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#8B5CF6,#3B82F6)',border:isFollowing?'1px solid rgba(255,255,255,0.1)':'none',borderRadius:100,padding:'8px 20px',cursor:'pointer',color:'white',fontWeight:700,fontSize:'0.82rem',fontFamily:'Inter,sans-serif',transition:'all 0.2s'}}>
                {isFollowing?'✓ Подписан':'+ Подписаться'}
              </button>
            )}
          </div>
          <div style={{display:'flex',marginBottom:18,background:'rgba(255,255,255,0.03)',borderRadius:14,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            {[[String(artist.tracksCount),'Треков'],[String(artist.followers),'Подписчиков'],[fmtNum(totalPlays),'Прослушиваний']].map(([n,l],i)=>(
              <div key={l} style={{flex:1,textAlign:'center',padding:'14px 8px',borderRight:i<2?'1px solid rgba(255,255,255,0.06)':'none'}}>
                <div style={{fontWeight:800,color:'#f8fafc',fontSize:'1.05rem'}}>{n}</div>
                <div style={{fontSize:'0.65rem',color:'#64748b'}}>{l}</div>
              </div>
            ))}
          </div>
          {artistTracks.length>0?(
            <div>
              <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.85rem',marginBottom:10}}>Треки</div>
              <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:260,overflowY:'auto'}}>
                {artistTracks.map((t,i)=>(
                  <div key={t.id} onClick={()=>{onPlayTrack(t);onClose();}} style={{display:'flex',alignItems:'center',gap:11,padding:'9px 12px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(139,92,246,0.08)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}>
                    <span style={{width:20,fontSize:'0.72rem',color:'#334155',fontWeight:700}}>{i+1}</span>
                    <CoverArt gradient={t.coverGradient} image={t.coverImage} size={38}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,color:'#f8fafc',fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                      <div style={{fontSize:'0.68rem',color:'#64748b'}}>{t.genre} · {t.duration}</div>
                    </div>
                    <div style={{display:'flex',gap:8,color:'#475569',fontSize:'0.68rem'}}>
                      <span>♥ {fmtNum(t.likes)}</span>
                      <span>👁 {fmtNum(t.plays)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#475569'}}>
              <div style={{fontSize:'1.8rem',marginBottom:8}}>🎵</div>
              <div style={{fontSize:'0.82rem'}}>{artist.role==='artist'?'Артист ещё не загрузил треков':'Слушатель не загружает треки'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER BAR ───────────────────────────────────────────────────────────────
interface PlayerBarProps {track:Track;isPlaying:boolean;onPlayPause:()=>void;onNext:()=>void;onPrev:()=>void;onOpenComments:(t:Track)=>void;onDownload:(t:Track)=>void;wsRef:React.RefObject<WebSocket|null>;}
function PlayerBar({track,isPlaying,onPlayPause,onNext,onPrev,onOpenComments,onDownload,wsRef}:PlayerBarProps) {
  const [progress,setProgress]     = useState(0);
  const [currentTime,setCurrentTime] = useState(0);
  const [totalTime,setTotalTime]   = useState(0);
  const [volume,setVolume]         = useState(75);
  const [isRepeat,setIsRepeat]     = useState(false);
  const [noAudio,setNoAudio]       = useState(false);
  const wantPlayRef    = useRef(false);
  const playCountedRef = useRef('');
  const canPlayRef     = useRef(false);

  // Load track
  useEffect(()=>{
    setProgress(0); setCurrentTime(0); setTotalTime(0); canPlayRef.current=false;
    if(!track.audioUrl){ audioEl.pause(); audioEl.src=''; setNoAudio(true); return; }
    setNoAudio(false);
    wantPlayRef.current = isPlaying;
    audioEl.src = track.audioUrl;
    audioEl.load();
    const onCanPlay=()=>{
      canPlayRef.current=true;
      if(wantPlayRef.current){ const p=audioEl.play(); if(p) p.catch(err=>console.warn('[Audio]',err.message)); }
    };
    const onError=()=>setNoAudio(true);
    audioEl.addEventListener('canplay',onCanPlay,{once:true});
    audioEl.addEventListener('error',onError,{once:true});
    return ()=>{ audioEl.removeEventListener('canplay',onCanPlay); audioEl.removeEventListener('error',onError); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[track.id, track.audioUrl]);

  // Play/pause sync
  useEffect(()=>{
    wantPlayRef.current=isPlaying;
    if(!track.audioUrl||!canPlayRef.current) return;
    if(isPlaying){
      const p=audioEl.play(); if(p) p.catch(e=>console.warn('[Audio]',e.message));
      if(playCountedRef.current!==track.id){
        playCountedRef.current=track.id;
        const ws=wsRef.current;
        if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'PLAY',trackId:track.id}));
      }
    } else { audioEl.pause(); }
  },[isPlaying, track.audioUrl, track.id, wsRef]);

  // Audio events
  useEffect(()=>{
    const onTime=()=>{ setCurrentTime(audioEl.currentTime); if(audioEl.duration&&isFinite(audioEl.duration)){ setTotalTime(audioEl.duration); setProgress(audioEl.currentTime/audioEl.duration*100); }};
    const onEnded=()=>{ if(isRepeat){ audioEl.currentTime=0; audioEl.play().catch(()=>{}); } else onNext(); };
    const onMeta=()=>{ if(audioEl.duration&&isFinite(audioEl.duration)) setTotalTime(audioEl.duration); };
    audioEl.addEventListener('timeupdate',onTime);
    audioEl.addEventListener('ended',onEnded);
    audioEl.addEventListener('loadedmetadata',onMeta);
    return ()=>{ audioEl.removeEventListener('timeupdate',onTime); audioEl.removeEventListener('ended',onEnded); audioEl.removeEventListener('loadedmetadata',onMeta); };
  },[isRepeat,onNext]);

  useEffect(()=>{ audioEl.volume=volume/100; },[volume]);

  const clickProgress=(e:React.MouseEvent<HTMLDivElement>)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    if(audioEl.duration) audioEl.currentTime=ratio*audioEl.duration;
  };

  const PrevBtn=()=>(
    <button onClick={onPrev} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',transition:'color 0.2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.color='#94a3b8')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    </button>
  );
  const NextBtn=()=>(
    <button onClick={onNext} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',transition:'color 0.2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.color='#94a3b8')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    </button>
  );
  const PlayBtn=({size=40}:{size?:number})=>(
    <button onClick={onPlayPause} className={isPlaying?'pulse-play':''} style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(139,92,246,0.5)',transition:'transform 0.15s'}}
      onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.08)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
      {isPlaying
        ?<svg width={size*0.38} height={size*0.38} viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        :<svg width={size*0.38} height={size*0.38} viewBox="0 0 24 24" fill="white" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>
      }
    </button>
  );

  return (
    <div className="player-bar" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:200}}>
      {/* Mobile */}
      <div className="show-mobile" style={{padding:'8px 12px 12px',display:'none',flexDirection:'column',gap:6}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <CoverArt gradient={track.coverGradient} image={track.coverImage} size={40}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
            <div style={{color:'#64748b',fontSize:'0.65rem'}}>{track.artist}</div>
            {noAudio&&<div style={{fontSize:'0.55rem',color:'#F59E0B'}}>Загрузи файл</div>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <PrevBtn/><PlayBtn size={36}/><NextBtn/>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <span style={{fontSize:'0.58rem',color:'#475569',width:26,textAlign:'right'}}>{fmtTime(currentTime)}</span>
          <div onClick={clickProgress} style={{flex:1,height:24,display:'flex',alignItems:'center',cursor:'pointer'}}>
            <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.1)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#8B5CF6,#3B82F6)',borderRadius:2}}/>
            </div>
          </div>
          <span style={{fontSize:'0.58rem',color:'#475569',width:26}}>{totalTime>0?fmtTime(totalTime):track.duration}</span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hide-mobile" style={{padding:'0 20px',height:74,display:'flex',alignItems:'center',gap:14}}>
        {/* Track info */}
        <div style={{display:'flex',alignItems:'center',gap:10,width:220,flexShrink:0,minWidth:0}}>
          <CoverArt gradient={track.coverGradient} image={track.coverImage} size={42}/>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.79rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
            <div style={{color:'#64748b',fontSize:'0.68rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</div>
            {noAudio&&<div style={{fontSize:'0.56rem',color:'#F59E0B',marginTop:1}}>Загрузи трек для воспроизведения</div>}
          </div>
        </div>
        {/* Center */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <PrevBtn/><PlayBtn/><NextBtn/>
            <button onClick={()=>setIsRepeat(p=>!p)} title="Повтор" style={{background:'none',border:'none',cursor:'pointer',color:isRepeat?'#8B5CF6':'#475569',padding:4,transition:'color 0.2s'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            </button>
          </div>
          <div style={{width:'100%',display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:'0.62rem',color:'#475569',width:28,textAlign:'right',flexShrink:0}}>{fmtTime(currentTime)}</span>
            <div onClick={clickProgress} style={{flex:1,height:28,display:'flex',alignItems:'center',cursor:'pointer',position:'relative'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:'1.5px'}}>
                {track.waveform.slice(0,50).map((h,i)=>{const passed=(i/50)*100<=progress;return <div key={i} style={{flex:1,height:`${Math.min(h,85)}%`,borderRadius:'1px',background:passed?'linear-gradient(180deg,#8B5CF6,#3B82F6)':'rgba(255,255,255,0.07)',transition:'background 0.08s'}}/>;})  }
              </div>
            </div>
            <span style={{fontSize:'0.62rem',color:'#475569',width:28,flexShrink:0}}>{totalTime>0?fmtTime(totalTime):track.duration}</span>
          </div>
        </div>
        {/* Right */}
        <div style={{display:'flex',alignItems:'center',gap:8,width:160,justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={()=>onOpenComments(track)} title="Комментарии" style={{background:'none',border:'none',cursor:'pointer',color:'#475569',padding:4,transition:'color 0.2s'}}
            onMouseEnter={e=>(e.currentTarget.style.color='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={()=>onDownload(track)} disabled={!track.audioUrl} title="Скачать"
            style={{background:'none',border:'none',cursor:track.audioUrl?'pointer':'not-allowed',color:track.audioUrl?'#475569':'#222',padding:4,transition:'color 0.2s'}}
            onMouseEnter={e=>{if(track.audioUrl)(e.currentTarget.style.color='#34d399');}} onMouseLeave={e=>{if(track.audioUrl)(e.currentTarget.style.color='#475569');}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
          <input type="range" min={0} max={100} value={volume} onChange={e=>setVolume(Number(e.target.value))} className="volume-slider" style={{width:60}}/>
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
interface HeaderProps {
  user:User|null; onOpenModal:(t:ModalType)=>void; onLogout:()=>void;
  activeSection:string; onNavClick:(s:string)=>void; wsConnected:boolean;
  notifications:AppNotification[]; onClearNotifs:()=>void; onMarkNotifsRead:()=>void;
  onNotifClick:(n:AppNotification)=>void;
  onSearchSubmit:(q:string)=>void;
  onOpenProfile:()=>void;
}
function Header({user,onOpenModal,onLogout,activeSection,onNavClick,wsConnected,notifications,onClearNotifs,onMarkNotifsRead,onNotifClick,onSearchSubmit,onOpenProfile}:HeaderProps) {
  const [menuOpen,setMenuOpen] = useState(false);
  const [showUser,setShowUser] = useState(false);
  const [inputVal,setInputVal] = useState('');
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const fn=(e:MouseEvent)=>{if(userRef.current&&!userRef.current.contains(e.target as Node))setShowUser(false);};
    document.addEventListener('mousedown',fn);
    return ()=>document.removeEventListener('mousedown',fn);
  },[]);

  const handleSearchKey=(e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Enter'){ onSearchSubmit(inputVal.trim()); }
    if(e.key==='Escape'){ setInputVal(''); onSearchSubmit(''); }
  };

  const handleNavClick=(id:string)=>{
    onNavClick(id);
    setMenuOpen(false);
  };

  return (
    <header style={{position:'fixed',top:0,left:0,right:0,zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.06)'}} className="glass-strong">
      <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px',height:62,display:'flex',alignItems:'center',gap:14}}>
        {/* Logo */}
        <div onClick={()=>handleNavClick('hero')} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 14px rgba(139,92,246,0.35)'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 12C2 12 4 4 6 4C8 4 8 20 10 20C12 20 12 8 14 8C16 8 16 16 18 16C20 16 22 12 22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontWeight:800,fontSize:'1.05rem',color:'#f8fafc',letterSpacing:'-0.5px'}}>ClaudMusic</span>
        </div>

        {/* Nav */}
        <nav style={{display:'flex',gap:1,flex:1}} className="hide-mobile">
          {SECTIONS.map(n=>(
            <button key={n.id} onClick={()=>handleNavClick(n.id)}
              style={{background:activeSection===n.id?'rgba(139,92,246,0.12)':'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'0.85rem',fontWeight:activeSection===n.id?600:500,color:activeSection===n.id?'#f8fafc':'#64748b',padding:'6px 12px',borderRadius:8,transition:'all 0.2s'}}
              onMouseEnter={e=>{if(activeSection!==n.id)e.currentTarget.style.color='#cbd5e1';}}
              onMouseLeave={e=>{if(activeSection!==n.id)e.currentTarget.style.color='#64748b';}}>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div style={{position:'relative',flex:'0 0 195px'}} className="hide-mobile">
          <svg style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input-dark" style={{paddingLeft:30,borderRadius:100,fontSize:'0.82rem'}} placeholder="Поиск... (Enter)"
            value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={handleSearchKey}/>
          {inputVal&&<button onClick={()=>{setInputVal('');onSearchSubmit('');}} style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#475569',display:'flex',padding:0}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>}
        </div>

        <div style={{display:'flex',gap:7,flexShrink:0,alignItems:'center'}}>
          <div className="hide-mobile"><WsStatus connected={wsConnected}/></div>
          {user?(
            <>
              <NotificationBell notifications={notifications} onClear={onClearNotifs} onMarkRead={onMarkNotifsRead} onNotifClick={onNotifClick}/>
              {user.role==='artist'&&(
                <button onClick={()=>onOpenModal('upload')}
                  style={{background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',border:'none',borderRadius:100,padding:'6px 13px',cursor:'pointer',color:'white',fontWeight:700,fontSize:'0.78rem',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:4,boxShadow:'0 0 12px rgba(139,92,246,0.3)'}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span className="hide-mobile">Загрузить</span>
                </button>
              )}
              <div style={{position:'relative'}} ref={userRef}>
                <div onClick={()=>setShowUser(p=>!p)} style={{width:34,height:34,borderRadius:'50%',background:user.avatar,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'white',fontSize:'0.82rem',border:'2px solid rgba(139,92,246,0.5)',transition:'border-color 0.2s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(139,92,246,0.8)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(139,92,246,0.5)')}>
                  {user.name[0].toUpperCase()}
                </div>
                {showUser&&(
                  <div className="glass-strong" style={{position:'absolute',top:'115%',right:0,borderRadius:16,padding:8,border:'1px solid rgba(255,255,255,0.1)',minWidth:210,zIndex:201,animation:'fadeInUp 0.2s ease'}}>
                    <div style={{padding:'11px 13px',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:5}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                        <span style={{fontWeight:700,color:'#f8fafc',fontSize:'0.85rem'}}>{user.name}</span>
                        <span style={{fontSize:'0.62rem',background:user.role==='artist'?'rgba(139,92,246,0.15)':'rgba(59,130,246,0.15)',color:user.role==='artist'?'#a78bfa':'#60a5fa',border:`1px solid ${user.role==='artist'?'rgba(139,92,246,0.3)':'rgba(59,130,246,0.3)'}`,borderRadius:100,padding:'1px 6px'}}>
                          {user.role==='artist'?'🎤':'🎧'}
                        </span>
                      </div>
                      <div style={{fontSize:'0.7rem',color:'#64748b'}}>{user.email}</div>
                      <div style={{marginTop:5,display:'flex',gap:5,alignItems:'center'}}><VerifiedIcon size={10}/><span style={{fontSize:'0.68rem',color:'#a78bfa'}}>Верифицирован</span></div>
                    </div>
                    <div style={{display:'flex',gap:12,padding:'7px 13px',marginBottom:4}}>
                      {user.role==='artist'&&<div style={{textAlign:'center'}}><div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.85rem'}}>{user.tracksCount}</div><div style={{fontSize:'0.65rem',color:'#64748b'}}>Треков</div></div>}
                      <div style={{textAlign:'center'}}><div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.85rem'}}>{user.followers}</div><div style={{fontSize:'0.65rem',color:'#64748b'}}>Подписчиков</div></div>
                    </div>
                    <button onClick={()=>{setShowUser(false);onOpenProfile();}} style={{width:'100%',background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:9,padding:8,cursor:'pointer',color:'#a78bfa',fontWeight:600,fontSize:'0.8rem',fontFamily:'Inter,sans-serif',marginBottom:5}}>Мой профиль</button>
                    <button onClick={()=>{setShowUser(false);onLogout();}} style={{width:'100%',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:9,padding:8,cursor:'pointer',color:'#f87171',fontWeight:600,fontSize:'0.8rem',fontFamily:'Inter,sans-serif'}}>Выйти</button>
                  </div>
                )}
              </div>
            </>
          ):(
            <>
              <button onClick={()=>onOpenModal('login')} className="hide-mobile" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'6px 16px',cursor:'pointer',color:'#f8fafc',fontWeight:600,fontSize:'0.85rem',fontFamily:'Inter,sans-serif',transition:'all 0.2s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.1)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.06)')}>Войти</button>
              <button onClick={()=>onOpenModal('register')} className="btn-glow" style={{border:'none',borderRadius:100,padding:'6px 16px',cursor:'pointer',color:'white',fontWeight:700,fontSize:'0.85rem',fontFamily:'Inter,sans-serif'}}><span>Регистрация</span></button>
            </>
          )}
          {/* Mobile burger */}
          <button className="show-mobile" onClick={()=>setMenuOpen(p=>!p)} style={{background:'rgba(255,255,255,0.06)',border:'none',borderRadius:8,width:34,height:34,cursor:'pointer',color:'#f8fafc',display:'none',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen&&(
        <div className="glass-strong" style={{padding:'8px 20px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:2}}>
          {SECTIONS.map(n=>(
            <button key={n.id} onClick={()=>handleNavClick(n.id)} style={{background:activeSection===n.id?'rgba(139,92,246,0.1)':'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'0.88rem',fontWeight:activeSection===n.id?700:500,color:activeSection===n.id?'#f8fafc':'#64748b',padding:'10px 11px',borderRadius:8,textAlign:'left',width:'100%',transition:'all 0.2s'}}>{n.label}</button>
          ))}
          <div style={{position:'relative',marginTop:6}}>
            <svg style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input-dark" style={{paddingLeft:30,borderRadius:100}} placeholder="Поиск... (Enter)"
              value={inputVal} onChange={e=>setInputVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){onSearchSubmit(inputVal.trim());setMenuOpen(false);}if(e.key==='Escape'){setInputVal('');onSearchSubmit('');setMenuOpen(false);}}}/>
          </div>
          {!user&&<div style={{display:'flex',gap:7,marginTop:8}}>
            <button onClick={()=>{onOpenModal('login');setMenuOpen(false);}} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'9px',cursor:'pointer',color:'#f8fafc',fontWeight:600,fontSize:'0.85rem',fontFamily:'Inter,sans-serif'}}>Войти</button>
            <button onClick={()=>{onOpenModal('register');setMenuOpen(false);}} className="btn-glow" style={{flex:1,border:'none',borderRadius:10,padding:'9px',cursor:'pointer',color:'white',fontWeight:700,fontSize:'0.85rem',fontFamily:'Inter,sans-serif'}}><span>Регистрация</span></button>
          </div>}
        </div>
      )}
    </header>
  );
}

// ─── TRACK CARD ───────────────────────────────────────────────────────────────
interface TrackCardProps {track:Track;isCurrentPlaying:boolean;onPlay:()=>void;onLike:()=>void;onRepost:()=>void;onComment:()=>void;onDownload:()=>void;onArtistClick:()=>void;}
function TrackCard({track,isCurrentPlaying,onPlay,onLike,onRepost,onComment,onDownload,onArtistClick}:TrackCardProps) {
  const [hov,setHov]=useState(false);
  return (
    <div className="track-card glass" style={{borderRadius:18,padding:16,border:`1px solid ${isCurrentPlaying?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.06)'}`,minWidth:190,maxWidth:210,flexShrink:0,boxShadow:isCurrentPlaying?'0 0 28px rgba(139,92,246,0.12)':'none',transition:'border-color 0.3s'}}>
      <div style={{position:'relative',marginBottom:11}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <div style={{width:'100%',aspectRatio:'1',borderRadius:12,background:track.coverGradient,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 20px rgba(0,0,0,0.3)',overflow:'hidden'}}>
          {track.coverImage?<img src={track.coverImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-2c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z"/></svg>}
        </div>
        <button onClick={onPlay} style={{position:'absolute',inset:0,background:hov||isCurrentPlaying?'rgba(0,0,0,0.45)':'transparent',border:'none',cursor:'pointer',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
          <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 18px rgba(139,92,246,0.6)',opacity:hov||isCurrentPlaying?1:0,transition:'opacity 0.2s'}} className={isCurrentPlaying?'pulse-play':''}>
            {isCurrentPlaying?<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>}
          </div>
        </button>
        <div style={{position:'absolute',top:7,left:7,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',borderRadius:100,padding:'2px 8px',fontSize:'0.6rem',fontWeight:700,color:'#a78bfa'}}>{track.genre}</div>
        <div style={{position:'absolute',bottom:7,right:7,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',borderRadius:100,padding:'2px 6px',fontSize:'0.6rem',color:'#94a3b8'}}>{track.duration}</div>
      </div>
      <div style={{marginBottom:3}}>
        <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.83rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
        <div style={{fontSize:'0.7rem',color:'#64748b',display:'flex',alignItems:'center',gap:3,marginTop:2}}>
          {track.verified&&<VerifiedIcon size={9}/>}
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}} onClick={onArtistClick} onMouseEnter={e=>(e.currentTarget.style.color='#a78bfa')} onMouseLeave={e=>(e.currentTarget.style.color='#64748b')}>{track.artist}</span>
        </div>
      </div>
      <div style={{marginBottom:8}}><Waveform bars={track.waveform.slice(0,40)} small/></div>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <button onClick={onLike} style={{background:'none',border:'none',cursor:'pointer',color:track.liked?'#EC4899':'#475569',fontSize:'0.68rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={track.liked?'currentColor':'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          {fmtNum(track.likes)}
        </button>
        <button onClick={onRepost} style={{background:'none',border:'none',cursor:'pointer',color:track.reposted?'#3B82F6':'#475569',fontSize:'0.68rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          {fmtNum(track.reposts)}
        </button>
        <button onClick={onComment} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',fontSize:'0.68rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {track.comments.length}
        </button>
        {track.audioUrl&&<button onClick={onDownload} title="Скачать" style={{background:'none',border:'none',cursor:'pointer',color:'#475569',padding:0,display:'flex',marginLeft:'auto'}} onMouseEnter={e=>(e.currentTarget.style.color='#34d399')} onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>}
        <span style={{marginLeft:track.audioUrl?0:'auto',fontSize:'0.6rem',color:'#334155',display:'flex',alignItems:'center',gap:1}}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {fmtNum(track.plays)}
        </span>
      </div>
    </div>
  );
}

// ─── RELEASE ROW ──────────────────────────────────────────────────────────────
interface ReleaseRowProps {track:Track;isCurrentPlaying:boolean;onPlay:()=>void;onLike:()=>void;onRepost:()=>void;onComment:()=>void;onDownload:()=>void;onArtistClick:()=>void;rank?:number;}
function ReleaseRow({track,isCurrentPlaying,onPlay,onLike,onRepost,onComment,onDownload,onArtistClick,rank}:ReleaseRowProps) {
  const [hov,setHov]=useState(false);
  return (
    <div className="track-card glass" style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:13,border:`1px solid ${isCurrentPlaying?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.06)'}`,boxShadow:isCurrentPlaying?'0 0 18px rgba(139,92,246,0.08)':'none',transition:'border-color 0.3s'}}>
      {rank!==undefined&&<div style={{width:22,textAlign:'center',fontSize:'0.7rem',color:'#334155',fontWeight:700,flexShrink:0}}>#{rank+1}</div>}
      <div style={{position:'relative',flexShrink:0}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <CoverArt gradient={track.coverGradient} image={track.coverImage} size={42}/>
        <button onClick={onPlay} style={{position:'absolute',inset:0,background:hov||isCurrentPlaying?'rgba(0,0,0,0.5)':'rgba(0,0,0,0)',border:'none',cursor:'pointer',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
          {(hov||isCurrentPlaying)&&(isCurrentPlaying
            ?<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            :<svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>)}
        </button>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
          {track.isNew&&<span style={{background:'rgba(16,185,129,0.12)',color:'#34d399',fontSize:'0.56rem',fontWeight:700,padding:'1px 5px',borderRadius:100,border:'1px solid rgba(16,185,129,0.25)',flexShrink:0}}>NEW</span>}
          <span style={{fontWeight:700,color:'#f8fafc',fontSize:'0.83rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</span>
        </div>
        <div style={{fontSize:'0.7rem',color:'#64748b',display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
          {track.verified&&<VerifiedIcon size={8}/>}
          <span style={{cursor:'pointer'}} onClick={onArtistClick} onMouseEnter={e=>(e.currentTarget.style.color='#a78bfa')} onMouseLeave={e=>(e.currentTarget.style.color='#64748b')}>{track.artist}</span>
          <span style={{color:'#334155'}}>·</span>
          <span style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa',padding:'1px 5px',borderRadius:100,fontSize:'0.59rem',fontWeight:600}}>{track.genre}</span>
          <span style={{color:'#334155'}}>·</span>
          <span>{track.uploadDate}</span>
        </div>
      </div>
      <div className="hide-mobile"><Waveform bars={track.waveform.slice(0,24)} small/></div>
      <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
        <button onClick={onLike} style={{background:'none',border:'none',cursor:'pointer',color:track.liked?'#EC4899':'#475569',fontSize:'0.7rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={track.liked?'currentColor':'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span className="hide-mobile">{fmtNum(track.likes)}</span>
        </button>
        <button onClick={onRepost} style={{background:'none',border:'none',cursor:'pointer',color:track.reposted?'#3B82F6':'#475569',fontSize:'0.7rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif',transition:'color 0.2s'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          <span className="hide-mobile">{fmtNum(track.reposts)}</span>
        </button>
        <button onClick={onComment} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',fontSize:'0.7rem',display:'flex',alignItems:'center',gap:2,padding:0,fontFamily:'Inter,sans-serif'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span className="hide-mobile">{track.comments.length}</span>
        </button>
        {track.audioUrl&&<button onClick={onDownload} title="Скачать" style={{background:'none',border:'none',cursor:'pointer',color:'#475569',padding:0,display:'flex'}} onMouseEnter={e=>(e.currentTarget.style.color='#34d399')} onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>}
        <span style={{fontSize:'0.66rem',color:'#334155',minWidth:28,textAlign:'right'}}>{track.duration}</span>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({onUpload,onLogin,user}:{onUpload:()=>void;onLogin:()=>void;user:User|null}) {
  return (
    <div style={{textAlign:'center',padding:'clamp(50px,8vw,90px) 24px'}}>
      <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.15))',border:'2px dashed rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-2c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z"/></svg>
      </div>
      <h3 style={{fontSize:'1.25rem',fontWeight:800,color:'#f8fafc',marginBottom:11}}>Треков пока нет</h3>
      <p style={{color:'#64748b',marginBottom:26,maxWidth:360,margin:'0 auto 26px',lineHeight:1.7,fontSize:'0.88rem'}}>ClaudMusic — платформа для настоящих артистов.<br/>Загрузи первый трек и стань частью сообщества.</p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        {user?.role==='artist'
          ?<button onClick={onUpload} className="btn-glow" style={{border:'none',cursor:'pointer',padding:'11px 26px',borderRadius:100,fontSize:'0.88rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif'}}><span style={{display:'flex',alignItems:'center',gap:7}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Загрузить трек</span></button>
          :!user
            ?<><button onClick={()=>onLogin()} className="btn-glow" style={{border:'none',cursor:'pointer',padding:'11px 26px',borderRadius:100,fontSize:'0.88rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif'}}>Войти</button><button onClick={()=>onLogin()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',padding:'11px 26px',borderRadius:100,fontSize:'0.88rem',fontWeight:600,color:'#94a3b8',fontFamily:'Inter,sans-serif'}}>Зарегистрироваться</button></>
            :<div style={{color:'#64748b',fontSize:'0.83rem'}}>Артисты ещё не загрузили треки. Зайди позже! 🎵</div>
        }
      </div>
    </div>
  );
}

// ─── SEARCH RESULTS ───────────────────────────────────────────────────────────
function SearchResults({query,tracks,currentTrackId,isPlaying,onPlay,onLike,onRepost,onComment,onDownload,onArtistClick,onClose}:{
  query:string;tracks:Track[];currentTrackId:string;isPlaying:boolean;
  onPlay:(t:Track)=>void;onLike:(id:string)=>void;onRepost:(id:string)=>void;
  onComment:(t:Track)=>void;onDownload:(t:Track)=>void;onArtistClick:(artistId:string)=>void;onClose:()=>void;
}) {
  const q=query.toLowerCase().trim();
  const results=tracks.filter(t=>t.title.toLowerCase().includes(q)||t.artist.toLowerCase().includes(q)||t.genre.toLowerCase().includes(q));
  return (
    <div style={{position:'fixed',inset:0,zIndex:250,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'72px 20px 20px'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass-strong" style={{width:'100%',maxWidth:620,borderRadius:18,border:'1px solid rgba(255,255,255,0.1)',overflow:'hidden',maxHeight:'72vh',display:'flex',flexDirection:'column',animation:'fadeInUp 0.25s ease'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <span style={{fontWeight:700,color:'#f8fafc',fontSize:'0.88rem'}}>«{query}»</span>
            <span style={{fontSize:'0.72rem',color:'#64748b',marginLeft:9}}>{results.length} результатов</span>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'none',width:28,height:28,borderRadius:7,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'9px 14px',display:'flex',flexDirection:'column',gap:5}}>
          {results.length===0
            ?(<div style={{textAlign:'center',padding:'36px 0',color:'#475569'}}><div style={{fontSize:'1.8rem',marginBottom:9}}>🔍</div><div style={{fontWeight:600,color:'#64748b'}}>Ничего не найдено</div><div style={{fontSize:'0.8rem',marginTop:5}}>Попробуй другой запрос</div></div>)
            :results.map(t=><ReleaseRow key={t.id} track={t} isCurrentPlaying={currentTrackId===t.id&&isPlaying}
                onPlay={()=>{onPlay(t);onClose();}} onLike={()=>onLike(t.id)} onRepost={()=>onRepost(t.id)}
                onComment={()=>{onComment(t);onClose();}} onDownload={()=>onDownload(t)}
                onArtistClick={()=>{onArtistClick(t.artistId);onClose();}}/>)
          }
        </div>
      </div>
    </div>
  );
}

// ─── DUMMY TRACK ──────────────────────────────────────────────────────────────
const DUMMY_TRACK:Track={id:'__dummy__',title:'— Нет трека —',artist:'ClaudMusic',artistId:'',genre:'',plays:0,likes:0,reposts:0,duration:'0:00',uploadDate:'',coverGradient:GRADIENTS[0],verified:false,description:'',liked:false,reposted:false,comments:[],waveform:genWaveform(42),isUserTrack:false};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export function App() {
  const [user,setUser]                 = useState<User|null>(loadLocalUser);
  const [tracks,setTracks]             = useState<Track[]>([]);
  const [serverUsers,setServerUsers]   = useState<ServerUser[]>([]);
  const [currentTrack,setCurrentTrack] = useState<Track>(DUMMY_TRACK);
  const [isPlaying,setIsPlaying]       = useState(false);
  const [wsConnected,setWsConnected]   = useState(false);
  const [modal,setModal]               = useState<ModalType>(null);
  const [commentTrack,setCommentTrack] = useState<Track|null>(null);
  const [profileArtistId,setProfileArtistId] = useState<string|null>(null);
  const [activeSection,setActiveSection] = useState('hero');
  const [toasts,setToasts]             = useState<{id:number;msg:string}[]>([]);
  const [selectedGenre,setSelectedGenre] = useState<string|null>(null);
  const [notifications,setNotifications] = useState<AppNotification[]>(()=>loadJson(LS_NOTIFS,[]));
  const [searchQuery,setSearchQuery]   = useState('');
  const [showSearch,setShowSearch]     = useState(false);
  const [followingIds,setFollowingIds] = useState<string[]>(()=>loadJson(LS_FOLLOW,[]));

  const audioUrlMapRef = useRef<Record<string,string>>({});
  const wsRef          = useRef<WebSocket|null>(null);
  const reconnRef      = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Persist user
  useEffect(()=>{ saveLocalUser(user); },[user]);
  // Persist notifications
  useEffect(()=>{ saveJson(LS_NOTIFS, notifications); },[notifications]);
  // Persist following
  useEffect(()=>{ saveJson(LS_FOLLOW, followingIds); },[followingIds]);

  // ─── WEBSOCKET ──────────────────────────────────────────────────────────────
  const connectWs=useCallback(()=>{
    if(!WS_URL) return;
    try {
      const ws=new WebSocket(WS_URL);
      wsRef.current=ws;
      ws.onopen=()=>{
        setWsConnected(true);
        const u=loadLocalUser();
        ws.send(JSON.stringify({type:'INIT',userId:u?.id}));
      };
      ws.onmessage=(ev)=>{
        let msg:Record<string,unknown>;
        try{msg=JSON.parse(ev.data);}catch{return;}
        switch(msg.type) {
          case 'STATE': {
            const st=(msg.tracks as Track[])||[];
            setServerUsers((msg.users as ServerUser[])||[]);
            setTracks(prev=>{
              const localIds=new Set(prev.map(t=>t.id));
              const fresh=st.filter(t=>!localIds.has(t.id));
              return [...prev,...fresh];
            });
            break;
          }
          case 'TRACK_ADDED': {
            const t=msg.track as Track;
            setTracks(prev=>prev.some(x=>x.id===t.id)?prev:[t,...prev]);
            break;
          }
          case 'TRACK_UPDATED': {
            const upd=msg.track as Track;
            setTracks(prev=>prev.map(t=>{
              if(t.id!==upd.id) return t;
              const url=audioUrlMapRef.current[t.id]||t.audioUrl;
              return{...upd,audioUrl:url,liked:t.liked,reposted:t.reposted,coverImage:t.coverImage||upd.coverImage};
            }));
            setCommentTrack(prev=>{if(!prev||prev.id!==upd.id) return prev;const url=audioUrlMapRef.current[prev.id]||prev.audioUrl;return{...upd,audioUrl:url,liked:prev.liked,reposted:prev.reposted};});
            break;
          }
          case 'REGISTER_OK':case 'USER_REGISTERED': {const u=msg.user as ServerUser;if(u)setServerUsers(prev=>[...prev.filter(x=>x.id!==u.id),u]);break;}
          case 'USER_UPDATED': {const u=msg.user as ServerUser;if(u)setServerUsers(prev=>prev.map(x=>x.id===u.id?u:x));break;}
          case 'NOTIFICATION': {
            const n=msg.notification as AppNotification;
            if(!n) break;
            setNotifications(prev=>[...prev,{...n,read:false}]);
            notify(`${n.icon} ${n.text}`);
            break;
          }
          default: break;
        }
      };
      ws.onclose=()=>{setWsConnected(false);wsRef.current=null;reconnRef.current=setTimeout(connectWs,3000);};
      ws.onerror=()=>ws.close();
    } catch {reconnRef.current=setTimeout(connectWs,5000);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{connectWs();return()=>{if(reconnRef.current)clearTimeout(reconnRef.current);wsRef.current?.close();};},[connectWs]);

  // ─── SCROLL REVEAL ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.05,rootMargin:'0px 0px -20px 0px'});
    document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[tracks]);

  // ─── SECTION TRACKER ────────────────────────────────────────────────────────
  useEffect(()=>{
    const ids=['hero','trending','genres','releases','why'];
    const fn=()=>{
      const y=window.scrollY+80;
      for(const id of ids){
        const el=document.getElementById(id);
        if(el&&y>=el.offsetTop&&y<el.offsetTop+el.offsetHeight){setActiveSection(id);break;}
      }
    };
    window.addEventListener('scroll',fn,{passive:true});
    fn(); // run on mount
    return()=>window.removeEventListener('scroll',fn);
  },[]);

  const notify=useCallback((msg:string)=>{const id=Date.now();setToasts(p=>[...p,{id,msg}]);},[]);
  const removeToast=useCallback((id:number)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);

  // ─── NAV SCROLL ─────────────────────────────────────────────────────────────
  const scrollTo=useCallback((id:string)=>{
    const el=document.getElementById(id);
    if(el){
      const top=el.getBoundingClientRect().top+window.scrollY-62;
      window.scrollTo({top,behavior:'smooth'});
    }
  },[]);

  // ─── TRACK ACTIONS ──────────────────────────────────────────────────────────
  const handlePlay=useCallback((track:Track)=>{
    if(currentTrack.id===track.id){setIsPlaying(p=>!p);return;}
    const url=audioUrlMapRef.current[track.id]||track.audioUrl;
    setCurrentTrack(url?{...track,audioUrl:url}:track);
    setIsPlaying(true);
  },[currentTrack.id]);

  const handleNext=useCallback(()=>{
    if(!tracks.length) return;
    const i=tracks.findIndex(t=>t.id===currentTrack.id);
    const next=tracks[(i+1)%tracks.length];
    const url=audioUrlMapRef.current[next.id]||next.audioUrl;
    setCurrentTrack(url?{...next,audioUrl:url}:next);
    setIsPlaying(true);
  },[tracks,currentTrack.id]);

  const handlePrev=useCallback(()=>{
    if(!tracks.length) return;
    const i=tracks.findIndex(t=>t.id===currentTrack.id);
    const prev=tracks[(i-1+tracks.length)%tracks.length];
    const url=audioUrlMapRef.current[prev.id]||prev.audioUrl;
    setCurrentTrack(url?{...prev,audioUrl:url}:prev);
    setIsPlaying(true);
  },[tracks,currentTrack.id]);

  const handleLike=useCallback((id:string)=>{
    if(!user){notify('👆 Войди, чтобы ставить лайки');setModal('login');return;}
    setTracks(ts=>ts.map(t=>t.id===id?{...t,liked:!t.liked,likes:t.liked?t.likes-1:t.likes+1}:t));
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'LIKE',trackId:id,userId:user.id}));
  },[user,notify]);

  const handleRepost=useCallback((id:string)=>{
    if(!user){notify('👆 Войди, чтобы делать репосты');setModal('login');return;}
    setTracks(ts=>ts.map(t=>t.id===id?{...t,reposted:!t.reposted,reposts:t.reposted?t.reposts-1:t.reposts+1}:t));
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'REPOST',trackId:id,userId:user.id}));
  },[user,notify]);

  const handleDownload=useCallback((track:Track)=>{
    const url=audioUrlMapRef.current[track.id]||track.audioUrl;
    if(!url){notify('⚠️ Файл недоступен для скачивания');return;}
    const a=document.createElement('a');a.href=url;a.download=`${track.artist} - ${track.title}.mp3`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    notify(`⬇️ Скачивание: ${track.title}`);
  },[notify]);

  const handleUpdateTrack=useCallback((updated:Track)=>{
    setTracks(ts=>ts.map(t=>t.id===updated.id?{...updated,audioUrl:audioUrlMapRef.current[updated.id]||t.audioUrl,coverImage:t.coverImage||updated.coverImage}:t));
    if(commentTrack?.id===updated.id) setCommentTrack(updated);
    if(currentTrack.id===updated.id) setCurrentTrack(prev=>({...updated,audioUrl:audioUrlMapRef.current[updated.id]||prev.audioUrl,coverImage:prev.coverImage||updated.coverImage}));
  },[commentTrack,currentTrack.id]);

  const handleLogin=useCallback((u:User)=>{
    setUser(u);
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'IDENTIFY',userId:u.id}));
  },[]);

  const handleLogout=useCallback(()=>{
    audioEl.pause(); audioEl.src='';
    setIsPlaying(false); setUser(null); setCurrentTrack(DUMMY_TRACK);
    notify('👋 Вы вышли из аккаунта');
  },[notify]);

  const handleUpload=useCallback((track:Track)=>{
    const withUser={...track,artist:user?.name||'Артист',artistId:user?.id||''};
    if(withUser.audioUrl) audioUrlMapRef.current[withUser.id]=withUser.audioUrl;
    setTracks(ts=>[withUser,...ts]);
    setUser(u=>u?{...u,tracksCount:u.tracksCount+1}:u);
    setCurrentTrack(withUser);
    setTimeout(()=>setIsPlaying(true),120);
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'UPLOAD_TRACK',track:{...withUser,audioUrl:undefined}}));
  },[user]);

  const openUpload=useCallback(()=>{
    if(!user){notify('👆 Войди, чтобы загружать треки');setModal('login');return;}
    if(user.role!=='artist'){notify('🎤 Только артисты могут загружать треки');return;}
    setModal('upload');
  },[user,notify]);

  const handleFollowToggle=useCallback((artistId:string)=>{
    if(!user){notify('👆 Войди, чтобы подписаться');setModal('login');return;}
    const isFollowing=followingIds.includes(artistId);
    setFollowingIds(prev=>isFollowing?prev.filter(id=>id!==artistId):[...prev,artistId]);
    const ws=wsRef.current;
    if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'FOLLOW',targetId:artistId,followerId:user.id}));
    notify(isFollowing?'Отписка оформлена':'✓ Подписка оформлена');
  },[user,followingIds,notify]);

  const handleNotifClick=useCallback((n:AppNotification)=>{
    if(n.trackId){
      const track=tracks.find(t=>t.id===n.trackId);
      if(track){scrollTo('releases');setTimeout(()=>setCommentTrack(track),400);}
    }
  },[tracks,scrollTo]);

  const handleSearchSubmit=useCallback((q:string)=>{
    setSearchQuery(q);
    setShowSearch(!!q.trim());
  },[]);

  // ─── DERIVED ────────────────────────────────────────────────────────────────
  const hasTracks = tracks.length>0;
  const sortedByEngagement = [...tracks].sort((a,b)=>engagementScore(b)-engagementScore(a));
  const trendingTracks = sortedByEngagement.slice(0,8);
  const newTracks = [...tracks].slice(0,20);
  const filteredTracks = selectedGenre?tracks.filter(t=>t.genre===selectedGenre):null;

  const playerTrack=(()=>{
    const found=tracks.find(t=>t.id===currentTrack.id)||currentTrack;
    const url=audioUrlMapRef.current[found.id];
    return url?{...found,audioUrl:url}:found;
  })();

  const resolvedProfileArtist=profileArtistId
    ?(serverUsers.find(u=>u.id===profileArtistId)||(user?.id===profileArtistId?{id:user.id,name:user.name,email:user.email,role:user.role,tracksCount:user.tracksCount,followers:user.followers,verified:true,joinedAt:user.joinedAt}:null))
    :null;

  const openArtistProfile=(artistId:string)=>setProfileArtistId(artistId);

  const WHY_CARDS=[
    {icon:'🛡️',title:'Только реальные люди',desc:'Верификация при регистрации. Никаких ботов и фейков.',color:'#8B5CF6'},
    {icon:'🎤',title:'Артисты и слушатели',desc:'Две роли — артист загружает треки, слушатель открывает музыку.',color:'#3B82F6'},
    {icon:'🎧',title:'Высокое качество',desc:'Поддержка FLAC, WAV. Слушай в студийном качестве.',color:'#10B981'},
    {icon:'💬',title:'Ответы на комментарии',desc:'Полноценное общение под треками с системой ответов.',color:'#F59E0B'},
    {icon:'🔥',title:'Умные рекомендации',desc:'Треки с большей активностью автоматически попадают в тренды.',color:'#EC4899'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',position:'relative'}}>
      <ParticleCanvas/>
      <Header
        user={user}
        onOpenModal={t=>{if(t==='upload')openUpload();else setModal(t);}}
        onLogout={handleLogout}
        activeSection={activeSection}
        onNavClick={scrollTo}
        wsConnected={wsConnected}
        notifications={notifications}
        onClearNotifs={()=>setNotifications([])}
        onMarkNotifsRead={()=>setNotifications(prev=>prev.map(n=>({...n,read:true})))}
        onNotifClick={handleNotifClick}
        onSearchSubmit={handleSearchSubmit}
        onOpenProfile={()=>{if(user)openArtistProfile(user.id);}}
      />

      <main style={{paddingTop:62,paddingBottom:90,position:'relative',zIndex:1}}>

        {/* ─── HERO ─── */}
        <section id="hero" style={{minHeight:'88vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(50px,9vw,110px) 20px',overflow:'hidden'}}>
          <div style={{textAlign:'center',maxWidth:780}}>
            <div className="fade-in-up" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)',borderRadius:100,padding:'5px 16px',fontSize:'0.7rem',fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:1,marginBottom:24}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#a78bfa',animation:'playingPulse 1.5s ease infinite'}}/>
              Музыкальная платформа нового поколения
            </div>
            <h1 className="fade-in-up-delay-1" style={{fontSize:'clamp(2rem,5.5vw,4.2rem)',fontWeight:900,lineHeight:1.1,marginBottom:20,letterSpacing:'-2px'}}>
              <span className="gradient-text">ClaudMusic</span><br/>
              <span style={{color:'#f8fafc'}}>Твоя музыка. Твоя сцена.</span>
            </h1>
            <p className="fade-in-up-delay-2" style={{fontSize:'clamp(0.95rem,1.8vw,1.1rem)',color:'#64748b',lineHeight:1.7,maxWidth:540,margin:'0 auto 32px'}}>
              Загружай, делись и открывай новую музыку. Без ботов. Без шума.<br/>
              Только настоящие артисты и живая музыка.
            </p>
            <div className="fade-in-up-delay-2" style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:38}}>
              <button onClick={()=>hasTracks?scrollTo('trending'):openUpload()} className="btn-glow" style={{border:'none',cursor:'pointer',padding:'13px 28px',borderRadius:100,fontSize:'0.95rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif'}}>
                <span style={{display:'flex',alignItems:'center',gap:7}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>{hasTracks?'Начать слушать':'Загрузить трек'}</span>
              </button>
              <button onClick={()=>setModal('register')} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',padding:'13px 28px',borderRadius:100,fontSize:'0.95rem',fontWeight:700,color:'#f8fafc',fontFamily:'Inter,sans-serif',transition:'all 0.3s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';}}>
                Присоединиться
              </button>
            </div>
            <div className="fade-in-up-delay-3" style={{display:'flex',justifyContent:'center',marginBottom:38}}><AnimatedWave/></div>
            <div className="fade-in-up-delay-3" style={{display:'flex',gap:36,justifyContent:'center',flexWrap:'wrap'}}>
              {[[String(tracks.length),'Треков'],[String(new Set(tracks.map(t=>t.artistId)).size),'Артистов'],[fmtNum(tracks.reduce((s,t)=>s+t.plays,0)),'Прослушиваний']].map(([n,l])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div className="stat-number" style={{fontSize:'1.7rem'}}>{n}</div>
                  <div style={{fontSize:'0.75rem',color:'#475569',fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TRENDING ─── */}
        <section id="trending" style={{padding:'clamp(44px,6vw,80px) 0'}}>
          <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px'}}>
            <div className="reveal" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
              <div>
                <div style={{fontSize:'0.7rem',fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>🔥 В ТРЕНДЕ</div>
                <h2 style={{fontSize:'clamp(1.3rem,2.8vw,1.85rem)',fontWeight:800,color:'#f8fafc',letterSpacing:'-0.5px'}}>Популярные треки</h2>
                <div style={{fontSize:'0.72rem',color:'#475569',marginTop:3}}>По активности: лайки, репосты, комментарии</div>
              </div>
              {hasTracks&&<button onClick={()=>scrollTo('releases')} style={{background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.18)',borderRadius:100,padding:'6px 16px',cursor:'pointer',color:'#a78bfa',fontWeight:600,fontSize:'0.78rem',fontFamily:'Inter,sans-serif',transition:'all 0.2s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(139,92,246,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(139,92,246,0.08)')}>Все треки →</button>}
            </div>
            {hasTracks?(
              <div className="reveal horizontal-scroll" style={{display:'flex',gap:12}}>
                {trendingTracks.map(t=>(
                  <TrackCard key={t.id} track={t} isCurrentPlaying={currentTrack.id===t.id&&isPlaying}
                    onPlay={()=>handlePlay(t)} onLike={()=>handleLike(t.id)} onRepost={()=>handleRepost(t.id)}
                    onComment={()=>setCommentTrack(t)} onDownload={()=>handleDownload(t)}
                    onArtistClick={()=>openArtistProfile(t.artistId)}/>
                ))}
              </div>
            ):(
              <div className="reveal"><EmptyState onUpload={openUpload} onLogin={()=>setModal('register')} user={user}/></div>
            )}
          </div>
        </section>

        {/* ─── GENRES ─── */}
        <section id="genres" style={{padding:'clamp(44px,6vw,80px) 0',background:'rgba(255,255,255,0.01)'}}>
          <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px'}}>
            <div className="reveal" style={{textAlign:'center',marginBottom:28}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>🎵 ЖАНРЫ</div>
              <h2 style={{fontSize:'clamp(1.3rem,2.8vw,1.85rem)',fontWeight:800,color:'#f8fafc',letterSpacing:'-0.5px'}}>Найди свой звук</h2>
              {selectedGenre&&<button onClick={()=>setSelectedGenre(null)} style={{marginTop:10,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:100,padding:'4px 13px',cursor:'pointer',color:'#f87171',fontSize:'0.76rem',fontFamily:'Inter,sans-serif'}}>× Сбросить: {selectedGenre}</button>}
            </div>
            <div className="reveal" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:9}}>
              {GENRES.map(g=>{
                const count=tracks.filter(t=>t.genre===g.name).length;
                return (
                  <div key={g.name} className="genre-card glass" onClick={()=>{setSelectedGenre(g.name===selectedGenre?null:g.name);scrollTo('releases');}}
                    style={{borderRadius:14,padding:'18px 10px',textAlign:'center',border:`1px solid ${selectedGenre===g.name?'rgba(139,92,246,0.5)':'rgba(255,255,255,0.06)'}`,position:'relative',overflow:'hidden',cursor:'pointer',transition:'border-color 0.2s'}}>
                    <div style={{position:'absolute',inset:0,background:g.gradient,opacity:selectedGenre===g.name?0.14:0.07,transition:'opacity 0.2s'}}/>
                    <div style={{fontSize:'1.5rem',marginBottom:6}}>{g.icon}</div>
                    <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.78rem',marginBottom:2}}>{g.name}</div>
                    <div style={{fontSize:'0.6rem',color:'#475569'}}>{count>0?`${count} тр.`:'Нет'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── NEW RELEASES ─── */}
        <section id="releases" style={{padding:'clamp(44px,6vw,80px) 0'}}>
          <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px'}}>
            <div className="reveal" style={{marginBottom:22}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'#34d399',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>🆕 НОВИНКИ</div>
              <h2 style={{fontSize:'clamp(1.3rem,2.8vw,1.85rem)',fontWeight:800,color:'#f8fafc',letterSpacing:'-0.5px'}}>{selectedGenre?`${selectedGenre} — треки`:'Свежие релизы'}</h2>
            </div>
            {(filteredTracks!==null?filteredTracks:newTracks).length>0?(
              <div className="reveal" style={{display:'flex',flexDirection:'column',gap:7}}>
                {(filteredTracks!==null?filteredTracks:newTracks).map((t,i)=>(
                  <ReleaseRow key={t.id} track={t} isCurrentPlaying={currentTrack.id===t.id&&isPlaying} rank={i}
                    onPlay={()=>handlePlay(t)} onLike={()=>handleLike(t.id)} onRepost={()=>handleRepost(t.id)}
                    onComment={()=>setCommentTrack(t)} onDownload={()=>handleDownload(t)}
                    onArtistClick={()=>openArtistProfile(t.artistId)}/>
                ))}
              </div>
            ):(
              <div className="reveal">
                {selectedGenre?(
                  <div style={{textAlign:'center',padding:'44px 0',color:'#475569'}}>
                    <div style={{fontSize:'2.2rem',marginBottom:10}}>🎵</div>
                    <div style={{fontWeight:600,color:'#64748b',marginBottom:14}}>В жанре «{selectedGenre}» пока нет треков</div>
                    <button onClick={()=>setSelectedGenre(null)} style={{background:'none',border:'1px solid rgba(139,92,246,0.3)',borderRadius:100,padding:'7px 18px',cursor:'pointer',color:'#a78bfa',fontFamily:'Inter,sans-serif'}}>Показать все</button>
                  </div>
                ):<EmptyState onUpload={openUpload} onLogin={()=>setModal('register')} user={user}/>}
              </div>
            )}
          </div>
        </section>

        {/* ─── WHY ─── */}
        <section id="why" style={{padding:'clamp(44px,6vw,80px) 0',background:'rgba(255,255,255,0.01)'}}>
          <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px'}}>
            <div className="reveal" style={{textAlign:'center',marginBottom:34}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>💡 ПРЕИМУЩЕСТВА</div>
              <h2 style={{fontSize:'clamp(1.3rem,2.8vw,1.85rem)',fontWeight:800,color:'#f8fafc',letterSpacing:'-0.5px'}}>Почему ClaudMusic?</h2>
            </div>
            <div className="reveal" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12}}>
              {WHY_CARDS.map(card=>(
                <div key={card.title} className="glass track-card" style={{borderRadius:18,padding:22,border:'1px solid rgba(255,255,255,0.06)',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:-12,right:-12,width:70,height:70,borderRadius:'50%',background:`radial-gradient(circle,${card.color}22,transparent)`,pointerEvents:'none'}}/>
                  <div style={{fontSize:'1.6rem',marginBottom:9}}>{card.icon}</div>
                  <div style={{fontWeight:800,color:'#f8fafc',fontSize:'0.9rem',marginBottom:6}}>{card.title}</div>
                  <div style={{fontSize:'0.76rem',color:'#64748b',lineHeight:1.6}}>{card.desc}</div>
                </div>
              ))}
            </div>
            {/* CTA Banner */}
            <div className="reveal" style={{marginTop:40,borderRadius:22,padding:'clamp(28px,4vw,44px)',background:'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.08))',border:'1px solid rgba(139,92,246,0.2)',textAlign:'center'}}>
              <h3 style={{fontSize:'clamp(1.2rem,2.5vw,1.6rem)',fontWeight:800,color:'#f8fafc',marginBottom:12}}>Готов начать?</h3>
              <p style={{color:'#64748b',marginBottom:24,fontSize:'0.9rem'}}>Присоединяйся к ClaudMusic — платформе для настоящих артистов и слушателей.</p>
              <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>setModal('register')} className="btn-glow" style={{border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:100,fontSize:'0.92rem',fontWeight:700,color:'white',fontFamily:'Inter,sans-serif'}}><span>Присоединиться бесплатно</span></button>
                {user?.role==='artist'&&<button onClick={openUpload} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',padding:'12px 28px',borderRadius:100,fontSize:'0.92rem',fontWeight:700,color:'#f8fafc',fontFamily:'Inter,sans-serif'}}>Загрузить трек</button>}
              </div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'clamp(30px,4vw,50px) 20px 24px'}}>
          <div style={{maxWidth:1280,margin:'0 auto'}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:32,justifyContent:'space-between',marginBottom:28}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                  <div style={{width:30,height:30,background:'linear-gradient(135deg,#8B5CF6,#3B82F6)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 12C2 12 4 4 6 4C8 4 8 20 10 20C12 20 12 8 14 8C16 8 16 16 18 16C20 16 22 12 22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{fontWeight:800,color:'#f8fafc',fontSize:'0.95rem'}}>ClaudMusic</span>
                </div>
                <p style={{fontSize:'0.78rem',color:'#475569',maxWidth:200,lineHeight:1.6}}>Музыкальная платформа для настоящих артистов и слушателей.</p>
                <div style={{marginTop:10}}><WsStatus connected={wsConnected}/></div>
              </div>
              {[
                {title:'Платформа',links:['Главная','В тренде','Жанры','Новинки']},
                {title:'Артистам',links:['Загрузить трек','Статистика','Продвижение']},
                {title:'Поддержка',links:['Помощь','Безопасность','Условия','Конфиденциальность']},
              ].map(col=>(
                <div key={col.title}>
                  <div style={{fontWeight:700,color:'#f8fafc',fontSize:'0.83rem',marginBottom:11}}>{col.title}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {col.links.map(l=>{
                      const sectionMap:Record<string,string>={'Главная':'hero','В тренде':'trending','Жанры':'genres','Новинки':'releases'};
                      const sid=sectionMap[l];
                      return (
                        <span key={l} style={{fontSize:'0.76rem',color:'#475569',cursor:sid?'pointer':'default',transition:'color 0.2s'}}
                          onClick={()=>sid&&scrollTo(sid)}
                          onMouseEnter={e=>((e.target as HTMLElement).style.color=sid?'#a78bfa':'#475569')}
                          onMouseLeave={e=>((e.target as HTMLElement).style.color='#475569')}>{l}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:18,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
              <span style={{fontSize:'0.74rem',color:'#334155'}}>© 2026 ClaudMusic. Музыка объединяет.</span>
              {/* Only Telegram */}
              <a href="https://t.me/cloudmucik" target="_blank" rel="noopener noreferrer"
                style={{display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'6px 12px',textDecoration:'none',transition:'all 0.2s',color:'#475569'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(59,130,246,0.5)';(e.currentTarget as HTMLElement).style.color='#60a5fa';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.08)';(e.currentTarget as HTMLElement).style.color='#475569';}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.613c-.149.669-.54.832-1.093.517l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.912.599z"/></svg>
                <span style={{fontSize:'0.75rem',fontWeight:600}}>@cloudmucik</span>
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* ─── FIXED PLAYER ─── */}
      <PlayerBar
        track={playerTrack} isPlaying={isPlaying}
        onPlayPause={()=>setIsPlaying(p=>!p)}
        onNext={handleNext} onPrev={handlePrev}
        onOpenComments={setCommentTrack}
        onDownload={handleDownload}
        wsRef={wsRef}
      />

      {/* ─── MODALS ─── */}
      {(modal==='login'||modal==='register')&&(
        <AuthModal type={modal} onClose={()=>setModal(null)} onSuccess={handleLogin} onNotify={notify} wsRef={wsRef} serverUsers={serverUsers}/>
      )}
      {modal==='upload'&&user&&(
        <UploadModal onClose={()=>setModal(null)} onUpload={handleUpload} onNotify={notify} userName={user.name} userId={user.id}/>
      )}
      {commentTrack&&(
        <CommentsModal
          track={tracks.find(t=>t.id===commentTrack.id)||commentTrack}
          user={user} onClose={()=>setCommentTrack(null)}
          onUpdateTrack={handleUpdateTrack}
          onRequestLogin={()=>setModal('login')}
          wsRef={wsRef}
        />
      )}
      {resolvedProfileArtist&&(
        <ProfileModal
          artist={resolvedProfileArtist}
          tracks={tracks}
          currentUser={user}
          onClose={()=>setProfileArtistId(null)}
          onPlayTrack={handlePlay}
          onFollowToggle={handleFollowToggle}
          followingIds={followingIds}
        />
      )}

      {/* ─── SEARCH RESULTS ─── */}
      {showSearch&&searchQuery.length>=1&&(
        <SearchResults
          query={searchQuery} tracks={tracks}
          currentTrackId={currentTrack.id} isPlaying={isPlaying}
          onPlay={handlePlay} onLike={handleLike} onRepost={handleRepost}
          onComment={setCommentTrack} onDownload={handleDownload}
          onArtistClick={openArtistProfile}
          onClose={()=>{setShowSearch(false);setSearchQuery('');}}
        />
      )}

      {/* ─── TOASTS ─── */}
      <div style={{position:'fixed',top:74,right:16,zIndex:400,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none',maxWidth:'calc(100vw - 32px)'}}>
        {toasts.map(t=><Toast key={t.id} msg={t.msg} onDone={()=>removeToast(t.id)}/>)}
      </div>
    </div>
  );
}
