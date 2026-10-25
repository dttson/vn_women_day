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
  it('allows three doses with 30-minute gaps, then waits 24 hours from the third dose',()=>{
    // Start before midnight: the calendar boundary must not grant extra turns.
    let p=newProgress(Date.UTC(2026,9,24,16,50));
    for(let dose=1;dose<=3;dose++){
      p=waterOneSession(p,Math.max(p.createdAt,p.soilReadyAt));
      expect(p.cycleWaterings).toBe(dose);
      expect(p.soilReadyAt-p.updatedAt).toBe(dose===3?86400000:1800000);
      expect(water(p,100,p.soilReadyAt-1,config)).toEqual(p);
      p=progressSchema.parse(JSON.parse(JSON.stringify(p)));
    }
    const ready=p.soilReadyAt;
    const partial=water(p,100,ready,config);
    expect(partial.cycleWaterings).toBe(0);
    expect(partial.waterings).toBe(3);
    expect(partial.usedWater).toBeGreaterThan(0);
    const fourth=waterOneSession(p,ready);
    expect(fourth.cycleWaterings).toBe(1);
    expect(fourth.soilReadyAt-fourth.updatedAt).toBe(1800000);
  });
  it('imports older saves without losing progress or changing their existing wait',()=>{
    const {cycleWaterings:_,...legacy}={...newProgress(1000),waterings:8,soilReadyAt:123456,firstBloomAt:2000};
    const restored=progressSchema.parse(legacy);
    expect(restored).toEqual({...legacy,cycleWaterings:0});
    expect(bloomProgress(restored,config)).toBe(1);
  });
  it('preserves a partially used can and bloom across save/reload',()=>{
    let p=newProgress(1000);
    for(let i=0;i<20;i++)p=water(p,100,1000+i*100,config);
    const restored=progressSchema.parse(JSON.parse(JSON.stringify(p)));
    expect(restored.usedWater).toBeCloseTo(2/7);
    expect(bloomProgress(restored,config)).toBeCloseTo(2/35);
    expect(restored.waterings).toBe(0);
  });
  it('finishes exactly one dose and blocks all watering until soil is ready',()=>{
    const p=waterOneSession();
    expect(p.waterings).toBe(1);expect(p.usedWater).toBe(0);
    expect(bloomProgress(p,config)).toBeCloseTo(1/5);
    expect(water(p,300,p.soilReadyAt-1,config)).toEqual(p);
    expect(water(p,100,p.soilReadyAt,config).usedWater).toBeGreaterThan(0);
  });
  it('elapsed time alone never grows or penalizes the flower',()=>{
    const p=waterOneSession();
    const saved=structuredClone(p);const later=p.soilReadyAt+365*86400000;
    expect(remainingWait(p,later)).toBe(0);
    expect(p).toEqual(saved);expect(bloomProgress(p,config)).toBeCloseTo(1/5);
    expect(water(p,0,later,config)).toEqual(p);
  });
  it('opens the letter on dose five and switches to family care without closing the flower',()=>{
    let p=newProgress(1000);
    for(let i=0;i<config.watering.firstBloomWaterings;i++)p=waterOneSession(p,Math.max(1000,p.soilReadyAt));
    expect(p.waterings).toBe(5);expect(p.firstBloomAt).not.toBeNull();expect(bloomProgress(p,config)).toBe(1);
    expect(p.soilReadyAt-p.updatedAt).toBe(config.watering.absorptionMs);
    expect(currentMessage(p,config).id).toBe('first-bloom');
    const firstBloom=p.firstBloomAt;
    for(let i=0;i<config.watering.seasonWaterings*3;i++){
      expect(p.soilReadyAt-p.updatedAt).toBe(p.cycleWaterings===3?86400000:1800000);
      expect(water(p,100,p.soilReadyAt-1,config)).toEqual(p);
      p=waterOneSession(p,p.soilReadyAt);
    }
    expect(p.firstBloomAt).toBe(firstBloom);expect(bloomProgress(p,config)).toBe(1);expect(seasons(p,config)).toBe(3);
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
    expect(gardenGrowth(saved(5),config).sideProgress).toEqual([0,0]);
    expect(gardenGrowth(saved(5,.5),config).sideProgress).toEqual([.1,0]);
    expect(gardenGrowth(saved(6),config).sideProgress).toEqual([.2,0]);
    expect(gardenGrowth(saved(10,.5),config).sideProgress).toEqual([1,.1]);
    expect(gardenGrowth(saved(14,.5),config).sideProgress).toEqual([1,.9]);
  });
  it('restores existing progress without a reset and caps the bouquet at three blooms',()=>{
    const restored=progressSchema.parse(JSON.parse(JSON.stringify(saved(15))));
    expect(gardenGrowth(restored,config).flowerCount).toBe(3);
    expect(gardenGrowth(restored,config).sideProgress).toEqual([1,1]);
    const muchLater=gardenGrowth(saved(1002),config);
    expect(muchLater.flowerCount).toBe(3);expect(muchLater.sideProgress).toEqual([1,1]);
  });
  it('unlocks a keepsake only at a completed milestone, not a partial can',()=>{
    expect(gardenGrowth(saved(9,.99),config).flowerCount).toBe(1);
    expect(gardenGrowth(saved(10),config).flowerCount).toBe(2);
    expect(gardenGrowth(saved(14,.99),config).flowerCount).toBe(2);
    expect(gardenGrowth(saved(15),config).flowerCount).toBe(3);
    expect(gardenGrowth(saved(14,.99),config).keepsakes).toHaveLength(0);
    expect(gardenGrowth(saved(15),config).keepsakes).toHaveLength(1);
    expect(gardenGrowth(saved(19,.99),config).keepsakes).toHaveLength(1);
    expect(gardenGrowth(saved(20),config).keepsakes).toHaveLength(2);
    expect(currentMessage(saved(20),config).id).toBe(config.growth.keepsakes[1].id);
  });
  it('shows milestones matching configured cycle length and never awards growth from time',()=>{
    const changed=structuredClone(config);changed.watering.seasonWaterings=10;
    expect(gardenGrowth(saved(10),changed).sideProgress).toEqual([.5,0]);
    expect(gardenGrowth(saved(25),changed).bouquetComplete).toBe(true);
    expect(gardenGrowth(saved(15),config)).toEqual(gardenGrowth({...saved(15),updatedAt:999999999},config));
  });
});

describe('dashboard configuration contract',()=>{
  it('rejects invalid timing, duplicate message IDs, and missing welcome messages',()=>{
    expect(()=>configSchema.parse({...rawConfig,watering:{...rawConfig.watering,durationMs:0}})).toThrow();
    expect(()=>configSchema.parse({...rawConfig,messages:[rawConfig.messages[0],rawConfig.messages[0]]})).toThrow();
    expect(()=>configSchema.parse({...rawConfig,messages:rawConfig.messages.slice(1)})).toThrow();
  });
});
