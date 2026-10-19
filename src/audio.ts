export class GardenAudio {
  private context?:AudioContext;
  private gain?:GainNode;
  private enabled=false;
  async setEnabled(enabled:boolean){
    this.enabled=enabled;
    if(enabled){this.context??=new AudioContext();await this.context.resume();}
    if(!enabled)this.stopWater();
  }
  startWater(){
    if(!this.enabled||!this.context||this.gain)return;
    const ctx=this.context;
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4;
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1700;
    this.gain=ctx.createGain();this.gain.gain.value=.035;
    noise.connect(filter).connect(this.gain).connect(ctx.destination);noise.start();
    this.noise=noise;
  }
  private noise?:AudioBufferSourceNode;
  stopWater(){this.noise?.stop();this.noise=undefined;this.gain?.disconnect();this.gain=undefined;}
  chime(){
    if(!this.enabled||!this.context)return;
    const ctx=this.context;
    [523.25,659.25,783.99].forEach((freq,i)=>{
      const oscillator=ctx.createOscillator();const gain=ctx.createGain();
      oscillator.type='sine';oscillator.frequency.value=freq;
      const t=ctx.currentTime+i*.16;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+1.5);
      oscillator.connect(gain).connect(ctx.destination);oscillator.start(t);oscillator.stop(t+1.5);
    });
  }
}
