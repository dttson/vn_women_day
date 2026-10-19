import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { IndexedDBPhotoRepository,MemoryPhotoRepository,albumLimit,type LocalPhoto } from '../src/data/photo-repository';
import { IndexedDBProgressRepository } from '../src/data/progress-repository';
const photo=(id='mom',group:LocalPhoto['group']='mom'):LocalPhoto=>({id,group,caption:'Ảnh riêng',blob:new Blob(['jpeg-test'],{type:'image/jpeg'})});

describe('local private photos',()=>{
  it('restores blobs and categories after reopening, without altering garden progress',async()=>{
    const name=`photos-${crypto.randomUUID()}`,repo=new IndexedDBPhotoRepository(name);
    const progress=new IndexedDBProgressRepository(`${name}-progress`);await progress.update(p=>({...p,waterings:9}));
    await repo.put([photo(),photo('bisu','bisu'),photo('memory-1','memories')]);
    const reopened=new IndexedDBPhotoRepository(name),saved=await reopened.list();
    expect(saved).toHaveLength(3);expect(await saved.find(p=>p.id==='mom')!.blob.text()).toBe('jpeg-test');
    expect((await progress.load()).waterings).toBe(9);
    await reopened.remove('bisu');expect((await repo.list()).map(p=>p.id)).toEqual(['memory-1','mom']);
  });
  it('replaces one portrait without overwriting the other groups',async()=>{
    const repo=new IndexedDBPhotoRepository(`photos-${crypto.randomUUID()}`);
    await repo.put([photo(),photo('ryo','ryo')]);
    await repo.put([{...photo(),caption:'Ảnh mới'}]);
    expect(await repo.list()).toHaveLength(2);expect((await repo.list()).find(p=>p.id==='mom')!.caption).toBe('Ảnh mới');
  });
  it('rejects invalid batches atomically and preserves existing photos',async()=>{
    const repo=new IndexedDBPhotoRepository(`photos-${crypto.randomUUID()}`);await repo.put([photo()]);
    await expect(repo.put([photo('bisu','bisu'),{...photo('ryo','ryo'),blob:new Blob(['bad'],{type:'text/html'})}])).rejects.toThrow();
    expect((await repo.list()).map(p=>p.id)).toEqual(['mom']);
  });
  it('enforces the album limit even with concurrent tabs',async()=>{
    const name=`photos-${crypto.randomUUID()}`,a=new IndexedDBPhotoRepository(name),b=new IndexedDBPhotoRepository(name);
    await a.put(Array.from({length:albumLimit-1},(_,i)=>photo(`memory-${i}`,'memories')));
    const outcomes=await Promise.allSettled([a.put([photo('last-a','memories')]),b.put([photo('last-b','memories')])]);
    expect(outcomes.filter(p=>p.status==='rejected')).toHaveLength(1);expect(await a.list()).toHaveLength(albumLimit);
  });
  it('keeps preview photos in memory and out of the real photo database',async()=>{
    const repo=new IndexedDBPhotoRepository(`photos-${crypto.randomUUID()}`),demo=new MemoryPhotoRepository();
    await repo.put([photo()]);await demo.put([photo('bisu','bisu')]);
    expect((await repo.list())[0].group).toBe('mom');expect((await new MemoryPhotoRepository().list())).toEqual([]);
  });
});
