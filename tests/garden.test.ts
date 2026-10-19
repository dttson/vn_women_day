import { describe,expect,it } from 'vitest';
import rawConfig from '../public/config/settings.json';
import { configSchema } from '../src/config';
import { bloomProgress,newProgress,remainingWait,water,currentMessage,seasons,progressSchema,gardenGrowth } from '../src/domain/garden';
const config=configSchema.parse(rawConfig);
const waterOneSession=(initial= newProgress(1000),now=1000)=>{
  let p=initial;
  for(let i=0;i<70;i++)p=water(p,100,now+i*100,config);
  return p;
};

describe('watering lifecycle',()=>{
  it('preserves a partially used can and bloom across save/reload',()=>{
    let p=newProgress(1000);
    for(let i=0;i<20;i++)p=water(p,100,1000+i*100,config);
    const restored=progressSchema.parse(JSON.parse(JSON.stringify(p)));
    expect(restored.usedWater).toBeCloseTo(2/7);
    expect(bloomProgress(restored,config)).toBeCloseTo(2/21);
    expect(restored.waterings).toBe(0);
  });
  it('finishes exactly one dose and blocks all watering until soil is ready',()=>{
    const p=waterOneSession();
    expect(p.waterings).toBe(1);expect(p.usedWater).toBe(0);
    expect(bloomProgress(p,config)).toBeCloseTo(1/3);
    expect(water(p,300,p.soilReadyAt-1,config)).toEqual(p);
    expect(water(p,100,p.soilReadyAt,config).usedWater).toBeGreaterThan(0);
  });
  it('elapsed time alone never grows or penalizes the flower',()=>{
    const p=waterOneSession();
    const saved=structuredClone(p);const later=p.soilReadyAt+365*86400000;
    expect(remainingWait(p,later)).toBe(0);
    expect(p).toEqual(saved);expect(bloomProgress(p,config)).toBeCloseTo(1/3);
    expect(water(p,0,later,config)).toEqual(p);
  });
  it('opens the letter on dose three and switches to daily care without closing the flower',()=>{
    let p=waterOneSession();p=waterOneSession(p,p.soilReadyAt);p=waterOneSession(p,p.soilReadyAt);
    expect(p.waterings).toBe(3);expect(p.firstBloomAt).not.toBeNull();expect(bloomProgress(p,config)).toBe(1);
    expect(p.soilReadyAt-p.updatedAt).toBe(config.watering.dailyCooldownMs);
    expect(currentMessage(p,config).id).toBe('first-bloom');
    const firstBloom=p.firstBloomAt;
    for(let i=0;i<5;i++)p=waterOneSession(p,p.soilReadyAt);
    expect(p.firstBloomAt).toBe(firstBloom);expect(bloomProgress(p,config)).toBe(1);expect(seasons(p,config)).toBe(1);
  });
  it('caps stalled/background ticks rather than spending a whole can',()=>{
    const p=water(newProgress(1000),1800000,2000,config);
    expect(p.waterings).toBe(0);expect(p.usedWater).toBeCloseTo(300/7000);
    expect(water(p,NaN,3000,config)).toEqual(p);
  });
  it('keeps an already bloomed flower open when configuration changes',()=>{
    const p={...newProgress(1000),waterings:3,firstBloomAt:2000};
    const changed=structuredClone(config);changed.watering.firstBloomWaterings=5;
    expect(bloomProgress(p,changed)).toBe(1);
  });
  it('rejects corrupted or unsupported backup versions',()=>{
    expect(()=>progressSchema.parse({...newProgress(),schemaVersion:2})).toThrow();
    expect(()=>progressSchema.parse({...newProgress(),usedWater:-1})).toThrow();
    expect(()=>progressSchema.parse({...newProgress(),waterings:1.5})).toThrow();
  });
});

describe('three-flower garden and keepsakes',()=>{
  const saved=(waterings:number,usedWater=0)=>({...newProgress(1000),waterings,usedWater,firstBloomAt:2000});
  it('starts two sequential branches and grows continuously during a partial can',()=>{
    expect(gardenGrowth(saved(3),config).sideProgress).toEqual([0,0]);
    expect(gardenGrowth(saved(3,.5),config).sideProgress).toEqual([.1,0]);
    expect(gardenGrowth(saved(4),config).sideProgress).toEqual([.2,0]);
    expect(gardenGrowth(saved(8,.5),config).sideProgress).toEqual([1,.1]);
    expect(gardenGrowth(saved(12,.5),config).sideProgress).toEqual([1,.9]);
  });
  it('restores existing progress without a reset and caps the bouquet at three blooms',()=>{
    const restored=progressSchema.parse(JSON.parse(JSON.stringify(saved(13))));
    expect(gardenGrowth(restored,config).flowerCount).toBe(3);
    expect(gardenGrowth(restored,config).sideProgress).toEqual([1,1]);
    const muchLater=gardenGrowth(saved(1000),config);
    expect(muchLater.flowerCount).toBe(3);expect(muchLater.sideProgress).toEqual([1,1]);
  });
  it('unlocks a keepsake only at a completed milestone, not a partial can',()=>{
    expect(gardenGrowth(saved(12,.99),config).keepsakes).toHaveLength(0);
    expect(gardenGrowth(saved(13),config).keepsakes).toHaveLength(1);
    expect(gardenGrowth(saved(17,.99),config).keepsakes).toHaveLength(1);
    expect(gardenGrowth(saved(18),config).keepsakes).toHaveLength(2);
    expect(currentMessage(saved(18),config).id).toBe(config.growth.keepsakes[1].id);
  });
  it('shows milestones matching configured cycle length and never awards growth from time',()=>{
    const changed=structuredClone(config);changed.watering.seasonWaterings=10;
    expect(gardenGrowth(saved(8),changed).sideProgress).toEqual([.5,0]);
    expect(gardenGrowth(saved(23),changed).bouquetComplete).toBe(true);
    expect(gardenGrowth(saved(13),config)).toEqual(gardenGrowth({...saved(13),updatedAt:999999999},config));
  });
});

describe('dashboard configuration contract',()=>{
  it('rejects invalid timing, duplicate message IDs, and missing welcome messages',()=>{
    expect(()=>configSchema.parse({...rawConfig,watering:{...rawConfig.watering,durationMs:0}})).toThrow();
    expect(()=>configSchema.parse({...rawConfig,messages:[rawConfig.messages[0],rawConfig.messages[0]]})).toThrow();
    expect(()=>configSchema.parse({...rawConfig,messages:rawConfig.messages.slice(1)})).toThrow();
  });
});
