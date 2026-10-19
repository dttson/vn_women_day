import { z } from 'zod';
import type { AppConfig } from '../config';

export const progressSchema = z.object({
  schemaVersion:z.literal(1), id:z.literal('garden'),
  createdAt:z.number().finite().nonnegative(), updatedAt:z.number().finite().nonnegative(),
  waterings:z.number().int().min(0), usedWater:z.number().min(0).max(1),
  soilReadyAt:z.number().finite().nonnegative(), firstBloomAt:z.number().finite().nonnegative().nullable(),
  soundEnabled:z.boolean(),
});
export type Progress = z.infer<typeof progressSchema>;
export function newProgress(now=Date.now()): Progress {
  return {schemaVersion:1,id:'garden',createdAt:now,updatedAt:now,waterings:0,usedWater:0,soilReadyAt:0,firstBloomAt:null,soundEnabled:false};
}
export function bloomProgress(p:Progress,c:AppConfig):number {
  if(p.firstBloomAt!==null)return 1;
  return Math.min(1,(p.waterings+p.usedWater)/c.watering.firstBloomWaterings);
}
export function remainingWait(p:Progress,now:number):number { return Math.max(0,p.soilReadyAt-now); }
export function water(p:Progress,elapsedMs:number,now:number,c:AppConfig):Progress {
  if (remainingWait(p,now)>0 || !Number.isFinite(elapsedMs) || elapsedMs<=0) return p;
  // Bound each tick: background/resume time must never become free watering.
  const amount=Math.min(elapsedMs,300)/c.watering.durationMs;
  const used=p.usedWater+amount;
  if(used<1-1e-8) return {...p,usedWater:used,updatedAt:now};
  const waterings=p.waterings+1;
  const bloomed=waterings>=c.watering.firstBloomWaterings;
  return {...p,waterings,usedWater:0,updatedAt:now,
    soilReadyAt:now+(bloomed?c.watering.dailyCooldownMs:c.watering.absorptionMs),
    firstBloomAt:p.firstBloomAt ?? (bloomed?now:null)};
}
export function currentMessage(p:Progress,c:AppConfig) {
  const garden=gardenGrowth(p,c);
  if(garden.keepsakes.length){
    const memory=garden.keepsakes.at(-1)!;
    return {id:memory.id,afterWaterings:garden.bouquetAt,label:memory.title,text:memory.text};
  }
  return [...c.messages].reverse().find(m=>m.afterWaterings<=p.waterings) ?? c.messages[0];
}
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
export function gardenGrowth(p:Progress,c:AppConfig) {
  const first=c.watering.firstBloomWaterings,perFlower=c.watering.seasonWaterings;
  const extra=Math.max(0,p.waterings+p.usedWater-first);
  const sideProgress:[number,number]=[clamp(extra/perFlower),clamp((extra-perFlower)/perFlower)];
  const bouquetAt=first+perFlower*2;
  const bouquetComplete=p.waterings>=bouquetAt;
  const memoryCycles=bouquetComplete?Math.floor((p.waterings-bouquetAt)/perFlower)+1:0;
  const sideIndex=extra>=perFlower?1:0;
  const completedSteps=Math.min(perFlower,Math.max(0,p.waterings-first-sideIndex*perFlower));
  const steps=['Nhánh nhỏ đang nhú','Mở thêm lá mới','Một nụ tím xuất hiện','Nụ hoa đang hé','Hoa sắp nở rồi'];
  const nextStage=steps[Math.min(4,Math.floor(completedSteps/perFlower*5))];
  return {sideProgress,bouquetAt,bouquetComplete,memoryCycles,
    flowerCount:Math.min(3,(p.firstBloomAt!==null||p.waterings>=first?1:0)+Math.floor(Math.max(0,p.waterings-first)/perFlower)),
    sideIndex,completedSteps,nextStage,
    growingName:c.growth.flowerNames[sideIndex+1],
    keepsakes:c.growth.keepsakes.slice(0,memoryCycles),
    memoryProgress:clamp(((Math.max(0,p.waterings-bouquetAt)%perFlower)+p.usedWater)/perFlower),
    nextMemory:c.growth.keepsakes[memoryCycles]??null,
  };
}
export function seasons(p:Progress,c:AppConfig):number {
  return Math.floor(Math.max(0,p.waterings-c.watering.firstBloomWaterings)/c.watering.seasonWaterings);
}
export function formatWait(ms:number):string {
  const seconds=Math.ceil(ms/1000);
  if(seconds>=3600) return `${Math.floor(seconds/3600)} giờ ${Math.floor(seconds%3600/60)} phút`;
  return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
}
