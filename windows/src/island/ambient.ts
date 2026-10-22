import { COMPANION_COLORS, KIRO_ACCENT, KIRO_SUCCESS } from "../nova/palette";
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
    bot.bodyColor=COMPANION_COLORS[i];
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
    const tint=state==="error"||state==="ratelimit"?"#ed8996":state==="approval"||state==="question"?"#f4c97d":state==="finished"?KIRO_SUCCESS:KIRO_ACCENT;
    const wash=ctx.createLinearGradient(0,h-36,0,h);wash.addColorStop(0,tint+"00");wash.addColorStop(1,tint+"18");ctx.fillStyle=wash;ctx.fillRect(0,h-36,w,36);
    for(const p of this.dots){if(moving){p.y-=elapsed*.035;if(p.y<0)p.y=1;}
      let x=p.x*w,y=h-36+p.y*32;
      if(this.pointer&&moving){const dx=x-this.pointer.x,dy=y-this.pointer.y,d=Math.hypot(dx,dy);if(d>0&&d<65){x+=dx/d*(65-d)*.3;y+=dy/d*(65-d)*.3;}}
      ctx.fillStyle=tint+"60";ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}
    const count=5, side=32;
    for(let i=0;i<count;i++){
      const actor=this.cast[i];
      if(moving){actor.x+=actor.direction*elapsed*(18+i*3)/Math.max(1,w-side-32);if(actor.x>=.95){actor.x=.95;actor.direction=-1;}if(actor.x<=.05){actor.x=.05;actor.direction=1;}actor.bot.update(Math.min(.05,Math.max(0,dt)));actor.bot.yaw=actor.direction*.3;}
      const x=16+actor.x*Math.max(1,w-side-32),y=h-side-1-(moving?Math.abs(Math.sin(ms/1000*8+i))*2:0);
      ctx.save();ctx.translate(x,y);actor.bot.draw(ctx,side,side);ctx.restore();
    }
    this.painted=true;return moving;
  }
}
