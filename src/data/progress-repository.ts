import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { newProgress, progressSchema, type Progress } from '../domain/garden';

interface GardenDB extends DBSchema { progress:{key:string,value:Progress} }
export interface ProgressRepository {
  load():Promise<Progress>;
  update(change:(current:Progress)=>Progress):Promise<Progress>;
  replace(progress:Progress):Promise<void>;
}

export class IndexedDBProgressRepository implements ProgressRepository {
  private database:Promise<IDBPDatabase<GardenDB>>;
  constructor(name='smallgif-garden') {
    this.database=openDB<GardenDB>(name,1,{
      upgrade(db){db.createObjectStore('progress',{keyPath:'id'});},
      blocked(){window.dispatchEvent(new CustomEvent('storage-blocked'));},
    });
  }
  async load():Promise<Progress> {
    const db=await this.database;
    const stored=await db.get('progress','garden');
    if(stored) return progressSchema.parse(stored);
    // Create atomically so opening two tabs cannot overwrite an existing garden.
    return this.update(p=>p);
  }
  async update(change:(current:Progress)=>Progress):Promise<Progress> {
    const db=await this.database;
    const tx=db.transaction('progress','readwrite');
    const stored=await tx.store.get('garden');
    const next=progressSchema.parse(change(stored?progressSchema.parse(stored):newProgress()));
    await tx.store.put(next);
    await tx.done;
    return next;
  }
  async replace(progress:Progress):Promise<void> {
    const db=await this.database;
    const tx=db.transaction('progress','readwrite');
    await tx.store.put(progressSchema.parse(progress));
    await tx.done;
  }
}

// Demo is explicitly isolated: it never reads or changes the real saved garden.
export class MemoryProgressRepository implements ProgressRepository {
  private state=newProgress();
  async load(){return structuredClone(this.state);}
  async update(change:(p:Progress)=>Progress){this.state=progressSchema.parse(change(structuredClone(this.state)));return this.load();}
  async replace(p:Progress){this.state=progressSchema.parse(p);}
}
