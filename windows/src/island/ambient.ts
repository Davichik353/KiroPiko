import { BotEngine } from "../mochi/engine";
import { h } from "../views/dom";
import type { BotStateName } from "../core/layout";

/** Shared decoration for every expanded view. The island owns its clock.
 * Canvas is click-through; existing controls, drag/drop and approvals stay in charge. */
export class IslandAmbient {
  readonly el = h("canvas", { class:"island-ambient", "aria-hidden":"true" }) as HTMLCanvasElement;
  private ctx=this.el.getContext("2d");
  private motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  private pointer:{x:number;y:number}|null=null;
  private last=0;
  private size="";
  private painted=false;
  private dots=Array.from({length:36},()=>({x:Math.random(),y:Math.random(),r:.55+Math.random()*.65}));
  private cast=Array.from({length:5},(_,i)=>{
    const bot=new BotEngine();bot.isMini=true;
    bot.bodyColor=([[.957,.702,.541],[.72,.64,.84],[.91,.62,.65],[.60,.52,.70],[.94,.84,.68]] as const)[i];
    return {bot,x:(i+1)/6,direction:i%2?-1:1};
  });
  observe(host:HTMLElement,wake:()=>void) {
    host.addEventListener("pointermove",event=>{const r=host.getBoundingClientRect();this.pointer={x:event.clientX-r.left,y:event.clientY-r.top};});
    host.addEventListener("pointerleave",()=>{this.pointer=null;});
    this.motion.addEventListener("change",()=>{this.painted=false;wake();});
  }
  draw(ms:number,dt:number,w:number,h:number,visible:boolean,quiet:boolean,state:BotStateName):boolean {
    this.el.hidden=!visible;
    if(!visible||!this.ctx||document.hidden){this.painted=false;return false;}
    const moving=!quiet&&!this.motion.matches;
    const dpr=Math.min(2,window.devicePixelRatio||1),key=`${Math.round(w)}:${Math.round(h)}:${dpr}:${state}:${moving}`;
    const changed=this.size!==key;
    if(changed){this.size=key;this.el.width=Math.max(1,Math.round(w*dpr));this.el.height=Math.max(1,Math.round(h*dpr));this.el.style.width=`${w}px`;this.el.style.height=`${h}px`;this.painted=false;}
    if(!moving&&this.painted)return false;
    if(!changed&&moving&&ms-this.last<1000/30)return true;
    const elapsed=Math.min(.05,Math.max(0,(ms-this.last)/1000));this.last=ms;
    const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const tint=state==="error"||state==="ratelimit"?"#ed8996":state==="approval"||state==="question"?"#f4c97d":state==="finished"?"#c2d9ad":"#f4b38a";
    const wash=ctx.createLinearGradient(0,0,110,h);wash.addColorStop(0,tint+"04");wash.addColorStop(1,tint+"14");ctx.fillStyle=wash;ctx.fillRect(0,38,100,Math.max(0,h-38));
    for(const p of this.dots){if(moving){p.y-=elapsed*.035;if(p.y<0)p.y=1;}
      let x=p.x*w,y=40+p.y*Math.max(0,h-48);
      if(this.pointer&&moving){const dx=x-this.pointer.x,dy=y-this.pointer.y,d=Math.hypot(dx,dy);if(d>0&&d<65){x+=dx/d*(65-d)*.3;y+=dy/d*(65-d)*.3;}}
      ctx.fillStyle=tint+(x<100?"70":"24");ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}
    const count=h>=230?5:3, side=h>=230?34:30;
    for(let i=0;i<count;i++){
      const actor=this.cast[i];
      if(moving){actor.x+=actor.direction*elapsed*(.30+i*.025);if(actor.x>=.95){actor.x=.95;actor.direction=-1;}if(actor.x<=.05){actor.x=.05;actor.direction=1;}actor.bot.update(Math.min(.05,Math.max(0,dt)));actor.bot.yaw=actor.direction*.3;}
      const row=h>=230?i%3:0;
      const x=7+actor.x*(88-side),y=h-side-10-row*27-(moving?Math.abs(Math.sin(ms/1000*8+i))*2:0);
      ctx.save();ctx.translate(x,y);actor.bot.draw(ctx,side,side);ctx.restore();
    }
    this.painted=true;return moving;
  }
}
