import { albumLimit, preparePhoto, type LocalPhoto, type PhotoGroup, type PhotoRepository } from '../data/photo-repository';
import './photo-settings.css';

const groups:[PhotoGroup,string,string][]=[
  ['mom','Hoa của mẹ','Ảnh mẹ bên bông hoa ở giữa.'],
  ['bisu','Hoa của Bisu','Ảnh Bisu bên bông hoa nhỏ bên trái.'],
  ['ryo','Hoa của Ryo','Ảnh Ryo bên bông hoa nhỏ bên phải.'],
  ['memories','Ảnh kỷ niệm','Chọn nhiều ảnh cho chiếc hộp nhỏ của cả nhà.'],
];
export class PhotoSettings {
  private urls:string[]=[];
  private disposed=false;
  private saving=false;
  private status=document.createElement('p');
  private grid=document.createElement('div');
  constructor(private host:HTMLElement,private repo:PhotoRepository|undefined,private changed:()=>Promise<void>,demo:boolean){
    host.className='photo-settings';
    const title=document.createElement('h2');title.textContent='Ảnh của nhà mình.';
    const note=document.createElement('p');note.textContent=demo?'Đang xem thử: ảnh được chọn chỉ giữ tạm đến khi tải lại trang.':'Ảnh chỉ lưu trên thiết bị này, không gửi lên mạng. Mẹ có thể chọn ảnh trước; ảnh sẽ hiện khi bông hoa hoặc hộp kỷ niệm được mở.';
    const backup=document.createElement('p');backup.className='muted';backup.textContent='Đổi máy hoặc xóa dữ liệu trình duyệt sẽ cần chọn lại ảnh. Bản sao tiến độ hiện tại không chứa ảnh.';
    this.status.setAttribute('role','status');this.status.className='photo-upload-status';
    host.append(title,note,backup,this.grid,this.status);
    void this.render().catch(()=>this.status.textContent='Chưa đọc được ảnh đã lưu. Mẹ thử tải lại trang nhé.');
  }
  private release(){this.urls.forEach(url=>URL.revokeObjectURL(url));this.urls=[];}
  private url(photo:LocalPhoto){const url=URL.createObjectURL(photo.blob);this.urls.push(url);return url;}
  private async render(){
    const photos=await this.repo?.list()??[];if(this.disposed)return;
    this.release();this.grid.replaceChildren();
    if(!this.repo)this.status.textContent='Trình duyệt chưa cho phép lưu ảnh. Mẹ thử mở trong Safari thông thường rồi tải lại nhé.';
    for(const [group,label,description] of groups){
      const section=document.createElement('section');section.className='photo-upload-group';section.setAttribute('aria-label',label);
      const title=document.createElement('h3');title.textContent=label;
      const note=document.createElement('p');note.textContent=description;
      const selected=photos.filter(photo=>photo.group===group);
      const list=document.createElement('div');list.className=group==='memories'?'local-photo-grid':'local-portrait-row';
      for(const photo of selected){
        const card=document.createElement('div');card.className='local-photo-card';
        const image=document.createElement('img');image.src=this.url(photo);image.alt=photo.caption;
        const caption=document.createElement('p');caption.textContent=photo.caption;
        const remove=document.createElement('button');remove.className='text-button';remove.type='button';remove.textContent='Xóa ảnh';remove.setAttribute('aria-label',`Xóa ảnh ${photo.caption}`);
        remove.onclick=()=>void this.perform(async()=>{await this.repo!.remove(photo.id);},'Đã xóa ảnh trên thiết bị.');
        card.append(image,caption,remove);list.append(card);
      }
      if(!selected.length){const empty=document.createElement('p');empty.className='photo-empty';empty.textContent='Chưa chọn ảnh';list.append(empty);}
      const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=group==='memories';input.id=`choose-photo-${group}`;input.disabled=!this.repo;
      const upload=document.createElement('label');upload.className='secondary-button file-label';upload.htmlFor=input.id;upload.append(document.createTextNode(group==='memories'?'Thêm ảnh kỷ niệm':selected.length?'Thay ảnh':'Chọn ảnh'),input);
      input.onchange=()=>{
        const files=Array.from(input.files??[]);if(!files.length)return;
        void this.perform(async()=>{
          if(group==='memories'&&selected.length+files.length>albumLimit)throw new Error(`Mẹ chọn tối đa ${albumLimit} ảnh kỷ niệm nhé.`);
          const prepared:LocalPhoto[]=[];
          for(const [index,file] of files.entries())prepared.push(await preparePhoto(file,group,group==='memories'?`Kỷ niệm ${selected.length+index+1}`:label.replace('Hoa của ','').replace('mẹ','Mẹ')));
          await this.repo!.put(prepared);
          // iOS may grant persistence only during a direct interaction; failure is optional.
          void navigator.storage?.persist?.().catch(()=>{});
        },'Đã lưu ảnh trên thiết bị này.');
      };
      section.append(title,note,list,upload);
      if(group==='memories'){const count=document.createElement('p');count.className='muted';count.textContent=`${selected.length}/${albumLimit} ảnh · Hộp mở sau “Một khoảng riêng cho mẹ”.`;section.append(count);}
      this.grid.append(section);
    }
  }
  private async perform(action:()=>Promise<void>,success:string){
    if(this.saving||this.disposed||!this.repo)return;
    this.saving=true;this.setBusy(true);this.status.textContent='Đang lưu ảnh…';
    try{
      await action();await this.changed();
      if(!this.disposed){await this.render();this.status.textContent=success;}
    }catch(error){if(!this.disposed)this.status.textContent=error instanceof Error&&!(error instanceof DOMException)?error.message:'Chưa lưu được ảnh. Bộ nhớ có thể đã đầy; mẹ thử ảnh nhỏ hơn nhé.';}
    finally{this.saving=false;if(!this.disposed)this.setBusy(false);}
  }
  private setBusy(busy:boolean){this.host.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(el=>el.disabled=busy||!this.repo);this.host.setAttribute('aria-busy',String(busy));}
  dispose(){this.disposed=true;this.release();}
}
