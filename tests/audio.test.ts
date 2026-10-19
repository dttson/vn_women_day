import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { GardenAudio } from '../src/audio';
let music:{paused:boolean;play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>};
let sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[];
let fetchAudio:ReturnType<typeof vi.fn>;
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
beforeEach(()=>{
  sources=[];
  music={paused:true,play:vi.fn(async()=>{music.paused=false;}),pause:vi.fn(()=>{music.paused=true;})};
  vi.stubGlobal('Audio',class{constructor(){return music;}});
  vi.stubGlobal('document',{body:{append:vi.fn()}});
  fetchAudio=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));vi.stubGlobal('fetch',fetchAudio);
  const node=()=>({connect:vi.fn().mockReturnThis(),disconnect:vi.fn()});
  vi.stubGlobal('AudioContext',class{
    state='suspended';currentTime=0;sampleRate=44100;destination={};
    async resume(){this.state='running';}async suspend(){this.state='suspended';}
    createMediaElementSource(){return node();}
    createGain(){return {...node(),gain:{value:0,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()}};}
    async decodeAudioData(){return {duration:1};}
    createBufferSource(){const source={...node(),start:vi.fn(),stop:vi.fn()};sources.push(source);return source;}
  });
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('garden soundtrack lifecycle',()=>{
  it('loads nothing until enabled and resumes one looping music element without restarting it',async()=>{
    const audio=new GardenAudio();audio.click();expect(fetchAudio).not.toHaveBeenCalled();
    await audio.setEnabled(true);await flush();
    expect(music.play).toHaveBeenCalledTimes(1);expect(fetchAudio).toHaveBeenCalledTimes(3);
    expect(music).toMatchObject({loop:true,hidden:true,preload:'none'});
    await audio.setEnabled(true);expect(music.play).toHaveBeenCalledTimes(1);
    audio.click();audio.click();await flush();expect(sources).toHaveLength(1);
  });
  it('mutes active effects and blocks all subsequent effect playback',async()=>{
    const audio=new GardenAudio();await audio.setEnabled(true);await flush();audio.bloom();await flush();
    expect(sources).toHaveLength(1);await audio.setEnabled(false);
    expect(sources[0].stop).toHaveBeenCalledOnce();expect(music.paused).toBe(true);
    audio.page();audio.click();await flush();expect(sources).toHaveLength(1);
  });
  it('does not play a pending effect after muting and enabling again',async()=>{
    const finish=new Map<string,(value:unknown)=>void>();
    fetchAudio.mockImplementation((url:string)=>new Promise(resolve=>{finish.set(url,resolve);}));
    const audio=new GardenAudio();await audio.setEnabled(true);audio.bloom();
    await audio.setEnabled(false);await audio.setEnabled(true);
    for(const resolve of finish.values())resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
    await flush();expect(sources).toHaveLength(0);
  });
  it('pauses when hidden, resumes when visible, and preserves a muted preference',async()=>{
    const audio=new GardenAudio();await audio.setEnabled(true);audio.setVisible(false);
    expect(music.paused).toBe(true);audio.page();await flush();expect(sources).toHaveLength(0);
    audio.setVisible(true);await flush();expect(music.paused).toBe(false);
    await audio.setEnabled(false);const calls=music.play.mock.calls.length;
    audio.setVisible(false);audio.setVisible(true);await flush();expect(music.play).toHaveBeenCalledTimes(calls);
  });
});
