import { openDB, type DBSchema } from 'idb';

export type PhotoGroup='mom'|'bisu'|'ryo'|'memories';
export type LocalPhoto={id:string;group:PhotoGroup;caption:string;blob:Blob};
export const albumLimit=20;
interface PhotoDB extends DBSchema {photos:{key:string;value:LocalPhoto}}
export interface PhotoRepository {
  list():Promise<LocalPhoto[]>;
  put(photos:LocalPhoto[]):Promise<void>;
  remove(id:string):Promise<void>;
}
function validate(photos:LocalPhoto[]){
  if(photos.filter(p=>p.group==='memories').length>albumLimit)throw new Error(`Hộp kỷ niệm chứa tối đa ${albumLimit} ảnh.`);
  if(new Set(photos.map(p=>p.id)).size!==photos.length)throw new Error('Ảnh bị trùng.');
  for(const photo of photos){
    if(!['mom','bisu','ryo','memories'].includes(photo.group)||!photo.id||photo.caption.length>120||photo.blob.type!=='image/jpeg'||photo.blob.size>3_000_000||!photo.blob.size)throw new Error('Ảnh không hợp lệ.');
    if(photo.group!=='memories'&&photo.id!==photo.group)throw new Error('Mục ảnh không hợp lệ.');
  }
}
export class IndexedDBPhotoRepository implements PhotoRepository {
  private database;
  constructor(name='smallgif-photos'){
    this.database=openDB<PhotoDB>(name,1,{upgrade(db){db.createObjectStore('photos',{keyPath:'id'});}});
  }
  async list(){return (await this.database).getAll('photos');}
  async put(photos:LocalPhoto[]){
    const db=await this.database,tx=db.transaction('photos','readwrite');
    try{
      const combined=new Map((await tx.store.getAll()).map(p=>[p.id,p]));
      photos.forEach(photo=>combined.set(photo.id,photo));validate([...combined.values()]);
      for(const photo of photos)await tx.store.put(photo);
      await tx.done;
    }catch(error){try{tx.abort();}catch{/* Already aborted. */}await tx.done.catch(()=>{});throw error;}
  }
  async remove(id:string){await (await this.database).delete('photos',id);}
}
export class MemoryPhotoRepository implements PhotoRepository {
  private photos=new Map<string,LocalPhoto>();
  async list(){return [...this.photos.values()];}
  async put(photos:LocalPhoto[]){const next=new Map(this.photos);photos.forEach(p=>next.set(p.id,p));validate([...next.values()]);this.photos=next;}
  async remove(id:string){this.photos.delete(id);}
}

/** Decode and re-encode locally: reduce size and discard source metadata. No upload. */
export async function preparePhoto(file:File,group:PhotoGroup,caption:string):Promise<LocalPhoto>{
  if(file.size>25_000_000)throw new Error('Mỗi ảnh cần nhỏ hơn 25 MB.');
  let url=URL.createObjectURL(file);const image=new Image();
  try{
    image.src=url;
    try{await image.decode();}catch{
      // Native HEIC decoding varies by browser. Load the local decoder only on demand.
      const header=await file.slice(0,64).text();
      if(!/\.hei[cf]$/i.test(file.name)&&!/^image\/hei[cf]/i.test(file.type)&&!(/ftyp/.test(header)&&/heic|heix|hevc|hevx|mif1|msf1/.test(header)))throw new Error('Không đọc được ảnh này. Mẹ thử một ảnh JPEG, PNG hoặc HEIC khác nhé.');
      try{
        const {isHeic,heicTo}=await import('heic-to/csp');
        if(!await isHeic(file))throw new Error('Invalid HEIC');
        const jpeg=await heicTo({blob:file,type:'image/jpeg',quality:.95});
        URL.revokeObjectURL(url);url=URL.createObjectURL(jpeg);image.src=url;
        await image.decode();
      }catch{throw new Error('Chưa đọc được ảnh HEIC này. Mẹ thử ảnh khác hoặc xuất ảnh thành JPEG nhé.');}
    }
    if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>65_000_000)throw new Error('Ảnh quá lớn.');
    const portrait=group!=='memories',side=Math.min(image.naturalWidth,image.naturalHeight);
    const sw=portrait?side:image.naturalWidth,sh=portrait?side:image.naturalHeight;
    const scale=Math.min(1,(portrait?640:1280)/Math.max(sw,sh));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không mở được ảnh.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Không lưu được ảnh.')),'image/jpeg',.86));
    return {id:group==='memories'?`memory-${Date.now()}-${crypto.randomUUID()}`:group,group,caption:caption.slice(0,120),blob};
  }catch(error){
    if(error instanceof DOMException&&error.name==='EncodingError')throw new Error('Trình duyệt chưa đọc được ảnh này. Mẹ thử chọn bản JPEG hoặc PNG nhé.');
    throw error;
  }finally{URL.revokeObjectURL(url);image.src='';}
}
