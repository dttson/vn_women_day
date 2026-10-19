import type { AppConfig } from '../config';
import './photo-album.css';

type Phase='closed'|'opening'|'spreading'|'ready'|'gathering'|'closing';

/** One lifecycle owns the lid, cards, gestures and cancellable animation waits. */
export class PhotoAlbum {
  private stage=document.createElement('div');
  private cards:HTMLButtonElement[]=[];
  private dots:HTMLButtonElement[]=[];
  private previous=document.createElement('button');
  private next=document.createElement('button');
  private live=document.createElement('p');
  private phase:Phase='closed';
  private active=0;
  private disposed=false;
  private closing?:Promise<void>;
  private abort=new AbortController();
  private timers=new Map<ReturnType<typeof setTimeout>,()=>void>();
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private gesture?:{id:number;x:number;y:number;dx:number;dragging:boolean};
  private suppressClick=false;

  constructor(host:HTMLElement,private config:AppConfig,private onPage:()=>void=()=>{}){
    host.className='photo-album-content animated-album';
    const heading=document.createElement('h2');heading.textContent='Những điều thật thương.';
    const subtitle=document.createElement('p');subtitle.className='album-subtitle';subtitle.textContent='Mở chiếc hộp nhỏ, gặp lại những khoảnh khắc của nhà mình.';
    this.stage.className='album-stage';this.stage.dataset.phase='closed';
    this.stage.setAttribute('role','group');this.stage.setAttribute('aria-roledescription','carousel');
    this.stage.setAttribute('aria-label','Ảnh kỷ niệm gia đình');
    const motion=config.albumAnimation;
    this.stage.style.setProperty('--lid-ms',`${motion.lidOpenMs}ms`);
    this.stage.style.setProperty('--spread-ms',`${motion.spreadMs}ms`);
    this.stage.style.setProperty('--gather-ms',`${motion.gatherMs}ms`);
    this.stage.style.setProperty('--close-ms',`${motion.lidCloseMs}ms`);
    const box=document.createElement('div');box.className='memory-box';box.setAttribute('aria-hidden','true');
    box.innerHTML='<div class="memory-box-back"></div><div class="memory-box-lid"><span>Gia đình SML</span></div><div class="memory-box-front"><span>♡</span></div>';
    const dots=document.createElement('div');dots.className='album-pagination';dots.setAttribute('aria-label','Chọn ảnh');
    config.photoMemories.forEach((photo,index)=>{
      const card=document.createElement('button');card.className='memory-card';card.disabled=true;
      card.setAttribute('aria-label',`Xem ảnh: ${photo.caption}`);
      card.style.setProperty('--deal-delay',`${index*35}ms`);
      card.style.setProperty('--gather-delay',`${index*20}ms`);
      const image=document.createElement('img');image.src=index===0?photo.src:photo.thumbnail??photo.src;image.alt=photo.alt;image.decoding='async';image.draggable=false;
      const caption=document.createElement('span');caption.textContent=photo.caption;
      card.append(image,caption);this.stage.append(card);this.cards.push(card);
      card.onclick=()=>{if(!this.suppressClick)this.go(index);};
      const dot=document.createElement('button');dot.className='album-dot';dot.disabled=true;
      dot.setAttribute('aria-label',`Ảnh ${index+1}: ${photo.caption}`);dot.onclick=()=>this.go(index);
      dots.append(dot);this.dots.push(dot);
    });
    this.stage.append(box);
    this.live.className='album-active-caption';this.live.setAttribute('aria-live','polite');this.live.setAttribute('aria-atomic','true');
    const navigation=document.createElement('div');navigation.className='fan-navigation';
    this.previous.className='album-arrow';this.previous.textContent='←';this.previous.setAttribute('aria-label','Ảnh trước');
    this.next.className='album-arrow';this.next.textContent='→';this.next.setAttribute('aria-label','Ảnh tiếp theo');
    this.previous.onclick=()=>this.go(this.active-1);this.next.onclick=()=>this.go(this.active+1);
    this.previous.disabled=true;this.next.disabled=true;
    navigation.append(this.previous,dots,this.next);
    const hint=document.createElement('p');hint.className='album-swipe-hint';hint.textContent='Vuốt trái / phải hoặc dùng phím ← → để xem ảnh';
    host.append(heading,subtitle,this.stage,this.live,navigation,hint);
    this.layout();this.bindGestures(host);
  }

  private wait(ms:number){
    if(this.reduced||this.disposed||ms<=0)return Promise.resolve();
    return new Promise<void>(resolve=>{
      const timer=setTimeout(()=>{this.timers.delete(timer);resolve();},ms);
      this.timers.set(timer,resolve);
    });
  }
  private setPhase(phase:Phase){
    this.phase=phase;this.stage.dataset.phase=phase;
    this.stage.setAttribute('aria-busy',String(phase!=='ready'));
    const ready=phase==='ready';
    this.cards.forEach((card,index)=>{card.disabled=!ready;card.tabIndex=ready&&index===this.active?0:-1;});
    this.dots.forEach(dot=>dot.disabled=!ready);
    this.previous.disabled=!ready||this.cards.length<2;this.next.disabled=!ready||this.cards.length<2;
  }
  async open(){
    this.onPage();
    // Commit the closed pose before transitioning the lid.
    void this.stage.offsetWidth;
    this.setPhase('opening');this.live.textContent='Mở những điều thương…';
    await this.wait(this.config.albumAnimation.lidOpenMs);
    if(this.disposed||this.closing)return;
    this.setPhase('spreading');
    await this.wait(this.config.albumAnimation.spreadMs+Math.max(0,this.cards.length-1)*35);
    if(this.disposed||this.closing)return;
    this.setPhase('ready');this.layout();
  }
  close():Promise<void>{
    if(this.closing)return this.closing;
    this.closing=this.gather();return this.closing;
  }
  private async gather(){
    this.onPage();
    this.resetGesture();this.setPhase('gathering');this.live.textContent='Cất những kỷ niệm vào hộp…';
    await this.wait(this.config.albumAnimation.gatherMs+Math.max(0,this.cards.length-1)*20);
    if(this.disposed)return;
    this.setPhase('closing');await this.wait(this.config.albumAnimation.lidCloseMs);
    if(this.disposed)return;
    this.setPhase('closed');await this.wait(70);
  }
  private go(index:number){
    if(this.phase!=='ready'||this.disposed)return;
    const next=(index+this.cards.length)%this.cards.length;
    if(next===this.active)return;
    this.active=next;this.onPage();
    this.cards[this.active].querySelector('img')!.src=this.config.photoMemories[this.active].src;
    this.layout();
  }
  private layout(){
    const count=this.cards.length;
    this.cards.forEach((card,index)=>{
      let offset=(index-this.active+count)%count;if(offset>count/2)offset-=count;
      const distance=Math.abs(offset);
      card.style.setProperty('--card-x',`${Math.max(-175,Math.min(175,offset*80))}px`);
      card.style.setProperty('--card-y',`${distance*17}px`);
      card.style.setProperty('--card-angle',`${offset*10}deg`);
      card.style.setProperty('--card-scale',String(Math.max(.70,1-distance*.1)));
      card.style.zIndex=String(12-distance);
      card.classList.toggle('is-current',offset===0);
      card.tabIndex=this.phase==='ready'&&offset===0?0:-1;
      card.setAttribute('aria-current',String(offset===0));
      this.dots[index].setAttribute('aria-pressed',String(offset===0));
    });
    if(this.phase==='ready')this.live.textContent=`${this.config.photoMemories[this.active].caption} · ${this.active+1}/${count}`;
  }
  private bindGestures(host:HTMLElement){
    const signal=this.abort.signal;
    (host.closest('dialog')??host).addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();this.go(this.active+(event.key==='ArrowLeft'?-1:1));
      }
    },{signal});
    this.stage.addEventListener('pointerdown',event=>{
      if(this.phase!=='ready'||event.button!==0||!event.isPrimary)return;
      this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dragging:false};
    },{signal});
    this.stage.addEventListener('pointermove',event=>{
      const g=this.gesture;if(!g||event.pointerId!==g.id)return;
      g.dx=event.clientX-g.x;
      if(!g.dragging&&Math.abs(g.dx)>8&&Math.abs(g.dx)>Math.abs(event.clientY-g.y)){
        g.dragging=true;this.stage.setPointerCapture(event.pointerId);this.stage.classList.add('is-dragging');
      }
      if(g.dragging){event.preventDefault();this.stage.style.setProperty('--drag',`${Math.max(-90,Math.min(90,g.dx))}px`);}
    },{signal});
    this.stage.addEventListener('pointerup',event=>{
      const g=this.gesture;if(!g||event.pointerId!==g.id)return;
      if(g.dragging){
        this.suppressClick=true;
        if(Math.abs(g.dx)>40)this.go(this.active+(g.dx<0?1:-1));
        void this.wait(250).then(()=>{this.suppressClick=false;});
      }
      this.resetGesture();
    },{signal});
    this.stage.addEventListener('pointercancel',()=>this.resetGesture(),{signal});
    window.addEventListener('blur',()=>this.resetGesture(),{signal});
  }
  private resetGesture(){
    const gesture=this.gesture;this.gesture=undefined;
    if(gesture&&this.stage.hasPointerCapture(gesture.id))this.stage.releasePointerCapture(gesture.id);
    this.stage.classList.remove('is-dragging');this.stage.style.setProperty('--drag','0px');
  }
  dispose(){
    this.disposed=true;this.resetGesture();this.abort.abort();
    for(const [timer,resolve] of this.timers){clearTimeout(timer);resolve();}
    this.timers.clear();
  }
}
