import musicUrl from '../assets/sound/alexgrohl-gentle-499635.mp3?url';
import clickUrl from '../assets/sound/mixkit-select-click-1109.wav?url';
import bloomUrl from '../assets/sound/mixkit-fairy-magic-sparkle-871.wav?url';
import pageUrl from '../assets/sound/mixkit-page-turn-chime-1106.wav?url';
import type { AppConfig } from './config';

type Effect='click'|'bloom'|'page';
const effectUrls={click:clickUrl,bloom:bloomUrl,page:pageUrl};
export class GardenAudio {
  private context?:AudioContext;
  private music?:HTMLAudioElement;
  private musicGain?:GainNode;
  private waterGain?:GainNode;
  private noise?:AudioBufferSourceNode;
  private enabled=false;
  private visible=true;
  private revision=0;
  private settings:AppConfig['audio']={musicVolume:.18,clickVolume:.14,bloomVolume:.35,pageVolume:.22};
  private buffers=new Map<Effect,Promise<AudioBuffer>>();
  private effects=new Set<AudioBufferSourceNode>();
  private lastEffect=new Map<Effect,number>();

  configure(settings:AppConfig['audio']){this.settings=settings;}
  private initialize(){
    if(this.context)return;
    const ctx=this.context=new AudioContext();
    const music=this.music=new Audio(musicUrl);music.loop=true;music.preload='none';
    music.id='garden-music';music.hidden=true;document.body.append(music);
    // Web Audio gain also controls volume on iPhone, where element volume is restricted.
    this.musicGain=ctx.createGain();this.musicGain.gain.value=0;
    ctx.createMediaElementSource(music).connect(this.musicGain).connect(ctx.destination);
  }
  async setEnabled(enabled:boolean){
    if(!enabled){
      this.enabled=false;this.revision++;this.stopAll();return;
    }
    this.enabled=true;
    if(!this.visible)return;
    this.initialize();
    if(this.context!.state==='running'&&!this.music!.paused)return;
    // Start both directly inside the user gesture, before awaiting either promise.
    const resume=this.context!.resume(),play=this.music!.play();
    const now=this.context!.currentTime,gain=this.musicGain!.gain;
    gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.linearRampToValueAtTime(this.settings.musicVolume,now+.7);
    await Promise.all([resume,play]);
    if(!this.enabled||!this.visible){this.stopAll();return;}
    // Fetch/decode effects only after sound has been enabled.
    for(const kind of ['click','bloom','page'] as const)void this.load(kind).catch(()=>{});
  }
  setVisible(visible:boolean){
    this.visible=visible;
    if(!visible){this.revision++;this.stopAll();void this.context?.suspend().catch(()=>{});}
    else if(this.enabled)void this.setEnabled(true).catch(()=>{});
  }
  private stopAll(){
    this.stopWater();this.music?.pause();
    for(const source of this.effects){try{source.stop();}catch{/* Already ended. */}}
    this.effects.clear();
    if(this.context&&this.musicGain){this.musicGain.gain.cancelScheduledValues(this.context.currentTime);this.musicGain.gain.value=0;}
  }
  private load(kind:Effect):Promise<AudioBuffer>{
    let pending=this.buffers.get(kind);
    if(!pending){
      pending=fetch(effectUrls[kind]).then(response=>{if(!response.ok)throw new Error('Audio unavailable');return response.arrayBuffer();}).then(bytes=>this.context!.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(kind);throw error;});
      this.buffers.set(kind,pending);
    }
    return pending;
  }
  private effect(kind:Effect){
    if(!this.enabled||!this.visible||!this.context)return;
    const now=performance.now();if(now-(this.lastEffect.get(kind)??-Infinity)<(kind==='page'?180:80))return;
    this.lastEffect.set(kind,now);
    const revision=this.revision,requestedAt=now;
    void this.load(kind).then(buffer=>{
      // Muting, leaving the page, or a slow download must never cause a delayed sound.
      if(!this.enabled||!this.visible||revision!==this.revision||performance.now()-requestedAt>1200)return;
      const ctx=this.context!,source=ctx.createBufferSource(),gain=ctx.createGain();
      source.buffer=buffer;gain.gain.value=this.settings[`${kind}Volume`];
      source.connect(gain).connect(ctx.destination);this.effects.add(source);
      source.onended=()=>{this.effects.delete(source);source.disconnect();gain.disconnect();};source.start();
      if(kind==='bloom'&&this.musicGain){
        const level=this.musicGain.gain,t=ctx.currentTime;
        level.cancelScheduledValues(t);level.setValueAtTime(level.value,t);
        level.linearRampToValueAtTime(this.settings.musicVolume*.4,t+.12);
        level.linearRampToValueAtTime(this.settings.musicVolume,t+buffer.duration+.6);
      }
    }).catch(()=>{});
  }
  click(){this.effect('click');}
  bloom(){this.effect('bloom');}
  page(){this.effect('page');}
  startWater(){
    if(!this.enabled||!this.visible||!this.context||this.waterGain)return;
    const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4;
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1700;
    const gain=this.waterGain=ctx.createGain();gain.gain.value=.035;
    noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();this.noise=noise;
  }
  stopWater(){this.noise?.stop();this.noise=undefined;this.waterGain?.disconnect();this.waterGain=undefined;}
}
