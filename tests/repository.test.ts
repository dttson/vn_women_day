import 'fake-indexeddb/auto';
import { describe,expect,it } from 'vitest';
import { IndexedDBProgressRepository,MemoryProgressRepository } from '../src/data/progress-repository';
import { newProgress } from '../src/domain/garden';

describe('IndexedDB progress',()=>{
  it('retains a partial watering when a new repository opens the same database',async()=>{
    const name=`test-${crypto.randomUUID()}`;
    const first=new IndexedDBProgressRepository(name);
    await first.update(p=>({...p,usedWater:.45,soilReadyAt:123456,cycleWaterings:2}));
    const second=new IndexedDBProgressRepository(name);const reloaded=await second.load();
    expect(reloaded.usedWater).toBe(.45);expect(reloaded.soilReadyAt).toBe(123456);
    expect(reloaded.cycleWaterings).toBe(2);
  });
  it('serializes concurrent writes rather than losing progress',async()=>{
    const name=`test-${crypto.randomUUID()}`;
    const a=new IndexedDBProgressRepository(name),b=new IndexedDBProgressRepository(name);
    await Promise.all(Array.from({length:10},(_,i)=>(i%2?a:b).update(p=>({...p,waterings:p.waterings+1}))));
    expect((await a.load()).waterings).toBe(10);
  });
  it('rejects invalid imports without replacing the current garden',async()=>{
    const repo=new IndexedDBProgressRepository(`test-${crypto.randomUUID()}`);
    await repo.update(p=>({...p,waterings:2}));
    await expect(repo.replace({...newProgress(),schemaVersion:999} as never)).rejects.toThrow();
    expect((await repo.load()).waterings).toBe(2);
  });
  it('keeps demo state separate from the saved garden',async()=>{
    const repo=new IndexedDBProgressRepository(`test-${crypto.randomUUID()}`);
    await repo.update(p=>({...p,waterings:2}));
    const demo=new MemoryProgressRepository();await demo.update(p=>({...p,waterings:8}));
    expect((await repo.load()).waterings).toBe(2);expect((await demo.load()).waterings).toBe(8);
  });
});
