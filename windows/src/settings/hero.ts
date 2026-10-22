import { COMPANION_COLORS, KIRO_ACCENT, KIRO_SUCCESS } from "../nova/palette";
import { emitTo } from "@tauri-apps/api/event";
import { h } from "../views/dom";
import { IS_TAURI, onEvent } from "../core/bridge";
import type { Settings } from "../core/state";
import { parseOutfit, resolveOutfit } from "../mochi/wardrobe";
import { drawAvatar } from "../nova/character/avatar";
import { BotEngine } from "../mochi/engine";
import { loadCharacter, loadExtraCharacters, spriteIndex } from "../nova/character/sprites";
import { drawPlayingAvatar } from "../nova/character/play-avatar";
import { heroStateText, type HeroSnapshot, type HeroMember } from "./hero-model";

interface Walker { member: HeroMember; bot: BotEngine; button: HTMLButtonElement; ctx: CanvasRenderingContext2D | null; x: number; target: number; rest: number; jump: number; direction: number }

/** Coucou HomeHero composition: floor troupe, urgent lead, reactive light and real events. */
export function settingsHero(read: () => Settings) {
  const headline = h("h2", { text: "Киро рядом" });
  const caption = h("p", { class: "kiro-hero-caption", text: "Пока тихо. Устраивайся поудобнее." });
  const light = h("canvas", { class: "kiro-hero-light", "aria-hidden": "true" }) as HTMLCanvasElement;
  const bigCanvas = h("canvas", { width: 360, height: 360, "aria-hidden": "true" }) as HTMLCanvasElement;
  const big = h("button", { class: "kiro-hero-lead", type: "button", "aria-label": "Поздороваться с Киро" }, bigCanvas) as HTMLButtonElement;
  const troupe = h("div", { class: "kiro-hero-troupe" });
  const toast = h("button", { class: "kiro-hero-toast", type: "button", hidden: true, "aria-label": "Сообщение Киро" }) as HTMLButtonElement;
  const announcement = h("span", { class: "kiro-hero-announcement", role: "status", "aria-live": "polite" });
  const card = h("section", { class: "kiro-hero", "aria-label": "Живой мир Киро" }, light,
    h("div", { class: "kiro-hero-copy" }, h("span", { class: "kiro-hero-eyebrow", text: "ТВОЙ МАЛЕНЬКИЙ МИР" }), headline, caption),
    troupe, big, toast, announcement,
    h("span", { class: "kiro-hero-hint", text: IS_TAURI ? "Нажми на персонажа" : "Превью · нажми на персонажа" }));
  const ctx = light.getContext("2d"), bigCtx = bigCanvas.getContext("2d");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let snapshot: HeroSnapshot = { members: [], quiet: false };
  let walkers: Walker[] = [], disposed = false, visible = false, ready = false, width = 600;
  let height = 274;
  let frame = 0, timer = 0, last = 0, lastDraw = 0, bigJump = -Infinity, toastUntil = 0, taps = 0;
  let primed = false, unlisten: (() => void) | undefined;
  let leadX=1,leadTarget=0,leadRest=performance.now()/1000+1.2,leadDirection=-1,leadClock=0;
  let pointer: {x:number;y:number} | null = null;
  let compact=false;
  function updateCompact() {
    const next=compact ? window.scrollY>16 : window.scrollY>80;
    if(next===compact)return;
    compact=next;card.classList.toggle("kiro-hero-compact",compact);
    document.documentElement.classList.toggle("settings-scene-compact",compact);
  }
  const dots = Array.from({length:42}, () => ({x:Math.random(),y:Math.random(),r:.6+Math.random()*1.1,phase:Math.random()*6.28}));
  const still = () => motion.matches || read().novaDoNotDisturb || snapshot.quiet;
  const seconds = () => performance.now()/1000;
  function say(name: string, text: string, target = "", explicit = false) {
    if (!visible || document.hidden || (!explicit && (read().novaDoNotDisturb || snapshot.quiet))) return;
    toast.replaceChildren(h("span", { class: "kiro-hero-toast-dot" }), h("span", {}, h("strong", {text:name}), h("span", {text})));
    toast.dataset.target = target; toast.setAttribute("aria-label", `${name}: ${text}`);
    toast.hidden = false; toastUntil = seconds()+4.5;
    announcement.textContent = `${name}. ${text}`;
    if (!still()) toast.animate([{opacity:0,transform:"translateY(-14px) scale(.96)"},{opacity:1,transform:"translateY(0) scale(1)"}], {duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});
  }
  function syncCast() {
    const cast = snapshot.members.slice(1);
    const next:HeroMember[] = cast.length ? cast : ["Абрикос","Лаванда","Персик","Слива","Ваниль"].map((name,i)=>({id:`stroller-${i+1}`,name,state:"idle"}));
    walkers = next.map((member,i) => {
      const existing = walkers.find(w => w.member.id===member.id);
      if (existing) { existing.member = member; existing.bot.setState(member.state); existing.button.setAttribute("aria-label", `Поздороваться: ${member.name}`); return existing; }
      const canvas = h("canvas", {width:160,height:160,"aria-hidden":"true"}) as HTMLCanvasElement;
      const button = h("button", {class:"kiro-hero-walker",type:"button","aria-label":`Поздороваться: ${member.name}`,title:member.name},canvas) as HTMLButtonElement;
      const colors = COMPANION_COLORS;
      const bot=new BotEngine();bot.isMini=true;bot.bodyColor=colors[i%colors.length];bot.setState(member.state);
      const w:Walker = {member,bot,button,ctx:canvas.getContext("2d"),x:(i+1)/(next.length+1),target:i%2?.1:.9,rest:seconds()+i*.25,jump:-Infinity,direction:1};
      button.addEventListener("click", () => { w.jump=seconds();w.rest=seconds()+1.5;if(!still())w.bot.triggerEmote("love");say(w.member.name,"Привет! Я здесь.","",true);draw(performance.now()); });
      return w;
    });
    const buttons=walkers.map(w=>w.button);
    if(buttons.length!==troupe.children.length || buttons.some((b,i)=>troupe.children[i]!==b)) {
      const focused=document.activeElement;
      troupe.replaceChildren(...buttons);
      if(focused instanceof HTMLElement && troupe.contains(focused))focused.focus({preventScroll:true});
    }
  }
  function accept(next: HeroSnapshot) {
    if (disposed) return;
    const previous=snapshot; snapshot=next; syncCast();
    if(next.quiet && !previous.quiet){toast.hidden=true;toastUntil=0;}
    if (primed) for (const m of next.members) {
      const old=previous.members.find(x=>x.id===m.id);
      if ((!old || old.state!==m.state) && ["approval","question","error","ratelimit","finished"].includes(m.state)) {
        say(m.name,heroStateText(m.state),m.id==="integration_claude"?"Claude Code":m.id.startsWith("integration_")?"Интеграции":"Агенты");
        bigJump=seconds(); const w=walkers.find(w=>w.member.id===m.id);if(w)w.jump=seconds();
      }
    }
    primed=true; draw(performance.now());
  }
  function watch(active:boolean) { if(IS_TAURI)void emitTo("island","settings-hero-watch",active).catch(()=>{}); }
  function draw(ms:number) {
    if (!ready || disposed || !visible || document.hidden) return;
    const now=ms/1000, reduced=still(), dt=Math.min(.05,Math.max(0,(ms-last)/1000));last=ms;
    const lead=snapshot.members[0], state=lead?.state??"idle";
    const color=["error","ratelimit"].includes(state)?"#ed8996":["approval","question"].includes(state)?"#f4c97d":state==="finished"?KIRO_SUCCESS:KIRO_ACCENT;
    card.style.setProperty("--hero-tone",color);
    const title=heroStateText(state);if(headline.textContent!==title)headline.textContent=title;
    const detail=read().novaDoNotDisturb||snapshot.quiet?"Тихо посижу рядом. Не отвлекаю.":lead?`${lead.name} · ${snapshot.members.length} в сцене`:"Пока тихо. Устраивайся поудобнее.";
    if(caption.textContent!==detail)caption.textContent=detail;
    if(now>toastUntil)toast.hidden=true;
    if(ctx) {
      ctx.clearRect(0,0,width,height);
      const glow=ctx.createRadialGradient(width*.89,20,0,width*.89,20,width*.72);
      glow.addColorStop(0,color+"28");glow.addColorStop(.65,color+"06");glow.addColorStop(1,color+"00");ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(const p of dots) {
        if(!reduced){p.y-=dt*(.017+p.r*.008);if(p.y<0)p.y=1;}
        let x=p.x*width+(reduced?0:Math.sin(now*.7+p.phase)*5),y=p.y*height;
        if(pointer&&!reduced){const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);if(d<95&&d>0){x+=dx/d*(95-d)*.38;y+=dy/d*(95-d)*.38;}}
        ctx.fillStyle=color+"66";ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle=color+"18";ctx.beginPath();ctx.moveTo(18,height-22);ctx.lineTo(width-18,height-22);ctx.stroke();
    }
    const outfit=resolveOutfit(parseOutfit(read().mochiOutfit),new Date());
    const folded=Math.max(0,Math.min(1,(274-height)/178));
    const bigSize=Math.min(width<430?128:144,height-12);
    const end=width-bigSize-10,start=Math.min(end,width*(.46+folded*.18)),track=Math.max(1,end-start);
    let leadWalking=false;
    if(!reduced&&["idle","finished"].includes(state)&&now>leadRest&&now-bigJump>1.2){
      const distance=leadTarget-leadX;
      if(Math.abs(distance)<.002){leadX=leadTarget;leadTarget=1-leadTarget;leadRest=now+2.2;}
      else{leadDirection=distance>0?1:-1;leadX+=Math.sign(distance)*Math.min(Math.abs(distance),dt*32/track);leadClock+=dt;leadWalking=true;}
    }
    big.style.left=`${start+leadX*track}px`;big.style.right="auto";big.style.width=`${bigSize}px`;big.style.height=`${bigSize}px`;
    bigCanvas.style.width=`${bigSize}px`;bigCanvas.style.height=`${bigSize}px`;
    if(bigCtx) {
      const jump=!reduced?Math.sin(Math.min(1,Math.max(0,(now-bigJump)/.65))*Math.PI)*14:0;
      bigCtx.clearRect(0,0,360,360);bigCtx.save();bigCtx.scale(2,2);
      bigCtx.translate(0,-jump+(reduced?0:leadWalking?-Math.abs(Math.sin(leadClock*7))*2:Math.sin(now*1.65)*2));
      if(leadWalking){bigCtx.translate(leadDirection<0?180:0,0);bigCtx.scale(leadDirection<0?-1:1,1);drawPlayingAvatar(bigCtx,"walk",leadClock,180,180,outfit);}
      else{const pose=now-bigJump<1.2?1:!reduced&&state==="idle"&&now%9>7.4?1:spriteIndex(state);drawAvatar(bigCtx,pose,outfit,180,180);}
      bigCtx.restore();
    }
    const size=Math.min(66,height*.55,Math.max(30,width*.43/(walkers.length+.3)));
    const lane=Math.max(25,width*(.43-folded*.05)-size);
    const laneStart=12+folded*(width>=480?width*.23:width*.10);
    for(const [i,w] of walkers.entries()) {
      let walking=false;
      if(!reduced&&now>w.rest&&now-w.jump>.7){const distance=w.target-w.x;
        if(Math.abs(distance)<.005){w.target=w.x>.5?.04+Math.random()*.20:.76+Math.random()*.20;w.rest=now+.35+Math.random()*.35;}
        else{
          w.direction=distance>0?1:-1;
          const nextX=w.x+Math.sign(distance)*Math.min(Math.abs(distance),dt*(22+i*2)/lane);
          const crowded=walkers.some((other,j)=>other!==w&&j%2===i%2&&Math.abs(nextX-other.x)<size*.65/lane&&Math.abs(nextX-other.x)<Math.abs(w.x-other.x));
          if(crowded){w.target=Math.max(.02,Math.min(.98,w.x-w.direction*.35));w.rest=now+.15;}
          else{w.x=nextX;walking=true;}
        }}
      const jump=!reduced?Math.sin(Math.min(1,Math.max(0,(now-w.jump)/.6))*Math.PI)*24:0;
      w.button.style.width=`${size}px`;w.button.style.height=`${size}px`;
      w.button.style.transform=`translate3d(${laneStart+w.x*lane}px,${height-size-9-(i%2)*Math.min(24,size*.45)-jump-(walking?Math.abs(Math.sin(now*9+i))*3:0)}px,0)`;
      if(w.ctx){w.ctx.clearRect(0,0,160,160);w.ctx.save();w.ctx.scale(2,2);
        if(!reduced){w.bot.update(dt);w.bot.yaw=walking?w.direction*.35:w.bot.yaw;}
        if(walking){w.ctx.translate(40,65);w.ctx.rotate(Math.sin(now*9+i)*.065);w.ctx.translate(-40,-65);}
        w.bot.draw(w.ctx,80,80);
        w.ctx.restore();}
    }
  }
  function tick(ms:number){frame=0;if(disposed||!ready||!visible||document.hidden)return;
    if(ms-lastDraw>=(still()?1000:1000/30)){draw(ms);lastDraw=ms;}
    if(still())timer=window.setTimeout(()=>tick(performance.now()),1000);else frame=requestAnimationFrame(tick);}
  function pause(){cancelAnimationFrame(frame);clearTimeout(timer);frame=0;watch(false);}
  function sync(){pause();last=performance.now();lastDraw=0;if(!disposed&&visible&&!document.hidden){watch(true);draw(last);frame=requestAnimationFrame(tick);}}
  const resize=new ResizeObserver(entries=>{width=entries[0].contentRect.width;height=entries[0].contentRect.height;light.width=Math.round(width*2);light.height=Math.round(height*2);ctx?.setTransform(2,0,0,2,0,0);draw(performance.now());});resize.observe(card);
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();});observer.observe(card);
  card.addEventListener("pointermove",e=>{const r=card.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};});card.addEventListener("pointerleave",()=>{pointer=null;});
  big.addEventListener("click",()=>{bigJump=seconds();say("Киро",["Привет! Рад тебя видеть.","Вместе справимся.","Я рядом. Можно творить."][taps++%3],"",true);draw(performance.now());});
  toast.addEventListener("click",()=>{const title=toast.dataset.target;if(!title){toast.hidden=true;return;}Array.from(document.querySelectorAll("#settings-root h2")).find(el=>el.textContent===title)?.scrollIntoView({behavior:motion.matches?"instant":"smooth",block:"start"});});
  document.addEventListener("visibilitychange",sync);motion.addEventListener("change",sync);window.addEventListener("pagehide",pause);window.addEventListener("pageshow",sync);
  window.addEventListener("scroll",updateCompact,{passive:true});updateCompact();
  function dispose(){disposed=true;pause();resize.disconnect();observer.disconnect();unlisten?.();document.removeEventListener("visibilitychange",sync);motion.removeEventListener("change",sync);window.removeEventListener("pagehide",pause);window.removeEventListener("pageshow",sync);window.removeEventListener("scroll",updateCompact);document.documentElement.classList.remove("settings-scene-compact");}
  void onEvent<HeroSnapshot>("settings-hero",accept).then(off=>{if(disposed)off();else{unlisten=off;watch(visible&&!document.hidden);}});
  syncCast();
  void Promise.all([loadCharacter(),loadExtraCharacters()]).then(()=>{ready=true;sync();}).catch(()=>{caption.textContent="Не удалось загрузить Киро. Открой настройки ещё раз.";big.disabled=true;dispose();});
  return {element:card,dispose};
}
