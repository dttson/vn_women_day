import './style.css';
import { loadConfig } from './config';
import { bloomProgress, currentMessage, formatWait, gardenGrowth, newProgress, progressSchema, remainingWait, seasons, water, type Progress } from './domain/garden';
import { IndexedDBProgressRepository, MemoryProgressRepository, type ProgressRepository } from './data/progress-repository';
import { FlowerScene } from './scene/flower-scene';
import { GardenAudio } from './audio';
import { PhotoAlbum } from './ui/photo-album';
import { IndexedDBPhotoRepository, MemoryPhotoRepository, type PhotoRepository } from './data/photo-repository';
import { PhotoSettings } from './ui/photo-settings';

const icons={
  flower:'<path d="M12 13c-7 0-9-8-4-8 0-5 8-5 8 0 5 0 3 8-4 8Zm0 0v9m0-3c-5 0-7-3-7-5 4 0 7 1 7 5Zm0-3c4 0 6-3 6-5-4 0-6 2-6 5Z"/>',
  book:'<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',
  settings:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
  sound:'<path d="m11 4-5 4H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  drop:'<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  heart:'<path d="M20.8 4.6c-2.4-2.4-6.2-1.8-8.8 1.2-2.6-3-6.4-3.6-8.8-1.2-3.3 3.3-.9 7.1 1.7 9.7L12 21l7.1-6.7c2.6-2.6 5-6.4 1.7-9.7Z"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  leaf:'<path d="M20 3C9 3 3 8 5 15c7 3 15-2 15-12ZM4 21l11-12"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  photos:'<rect x="5" y="3" width="16" height="16" rx="2"/><path d="M2 7v13a2 2 0 0 0 2 2h13M5 15l4-4 4 4 3-3 5 5"/><circle cx="15.5" cy="7.5" r="1.5"/>',
  box:'<path d="m3 9 2-5h14l2 5v12H3V9Zm0 0h18M9 9v4h6V9"/><path d="M9 5V3h6v2"/>',
};
const svg=(name:keyof typeof icons)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Khu vườn của mẹ">${svg('flower')}<span>một chút yêu thương</span></a>
      <nav aria-label="Khu vườn">
        <button class="icon-button" id="sound" title="Bật âm thanh" aria-label="Bật âm thanh" aria-pressed="false">${svg('sound')}<span class="mute-slash"></span></button>
        <button class="icon-button" id="memories" title="Hộp kỷ niệm" aria-label="Hộp kỷ niệm">${svg('book')}</button>
        <button class="icon-button" id="photo-memories-nav" title="Hộp ảnh kỷ niệm" aria-label="Hộp ảnh kỷ niệm" hidden>${svg('photos')}</button>
        <button class="icon-button" id="settings" title="Cài đặt" aria-label="Cài đặt">${svg('settings')}</button>
      </nav>
    </header>
    <main>
      <div class="intro">
        <p class="eyebrow occasion" id="occasion"></p>
        <h1><span id="title">Một bông hoa</span><br><em id="subtitle">dành cho mẹ.</em></h1>
        <p class="intro-note">Một chút nước. Một chút kiên nhẫn. Thật nhiều yêu thương.</p>
        <p class="sound-reminder">${svg('sound')} Mẹ nhớ bật âm thanh để trải nghiệm trọn vẹn nhé ♡</p>
      </div>
      <section class="garden" aria-label="Bông hoa của mẹ">
        <div class="halo"></div>
        <div id="scene" class="scene"></div>
        <div id="loading" class="loading"><span class="loader"></span><span>Ba đang chuẩn bị bông hoa…</span></div>
        <div id="scene-fallback" class="scene-fallback" hidden><img alt="Bông hoa của mẹ"/><p id="scene-error"></p><button class="text-button" id="retry">Thử lại</button></div>
        <aside class="side-note"><span class="tiny-line"></span><span id="stage-caption">Mọi điều đẹp đẽ<br>đều bắt đầu từ một chút chăm chút.</span></aside>
        <div class="growth-note"><span class="growth-icon">${svg('leaf')}</span><span id="growth-label">Một nụ hoa đang chờ mẹ</span><div id="growth-dots" class="growth-dots" aria-hidden="true"></div></div>
        <p class="garden-caption" id="garden-caption">Khu vườn nhỏ, dành riêng cho mẹ</p>
      </section>
      <section class="care-area" aria-label="Chăm hoa">
        <div class="message" aria-live="polite" aria-atomic="true"><p id="message-label" class="eyebrow"></p><p id="message-text"></p></div>
        <div class="water-card">
          <div class="water-info"><div class="water-icon">${svg('drop')}</div><div><p id="water-status">Bình nước đã sẵn sàng</p><p class="muted" id="water-hint">Nhấn giữ để tưới cho hoa</p></div><span id="water-percent">100%</span></div>
          <div class="water-track" role="progressbar" aria-label="Nước trong bình" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div id="water-fill"></div></div>
          <button class="water-button" id="water" disabled>${svg('drop')}<span id="water-button-label">Đang chuẩn bị…</span><span class="button-spark">✧</span></button>
          <p id="wait-status" class="wait-status" role="timer" aria-live="off"></p>
        </div>
        <div class="growth-card" id="growth-card" hidden>
          <div class="family-flowers" id="family-flowers"></div>
          <p id="next-growth"></p>
          <div class="growth-track"><div id="growth-fill"></div></div>
          <p class="growth-detail" id="growth-detail"></p>
        </div>
        <button class="letter-button" id="letter" hidden>${svg('mail')} Ba có đôi lời gửi mẹ <span>↗</span></button>
        <button class="photo-box-button" id="photo-memories" hidden><span class="box-icon">${svg('box')}</span><span><strong>Hộp ảnh kỷ niệm</strong><small>Mở những khoảnh khắc của nhà mình</small></span><span class="box-arrow">↗</span></button>
        <p class="gentle-note">${svg('heart')} Cứ thong thả nhé mẹ. Hoa luôn ở đây.</p>
      </section>
    </main>
    <footer><span>Gia đình SML</span><span>Được chăm bằng yêu thương ♡</span></footer>
  </div>
  <div class="notice" id="notice" role="status" hidden></div>
  <div class="demo-bar" id="demo-bar" hidden><span>BẢN XEM THỬ · KHÔNG LƯU</span><select id="demo-stage" aria-label="Mốc xem thử"></select><button id="skip-wait">Bỏ qua chờ</button><button id="restart-demo">Làm lại</button><a href="/">Về khu vườn thật ↗</a></div>
  <dialog id="dialog"><div class="dialog-top"><span class="eyebrow" id="dialog-label"></span><button class="icon-button" id="close-dialog" aria-label="Đóng">${svg('close')}</button></div><div id="dialog-content"></div></dialog>
`;

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const text=(id:string,value:string)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
const demo=new URLSearchParams(location.search).get('demo')==='1';
const audio=new GardenAudio();
const dialog=$<HTMLDialogElement>('dialog');
let repository:ProgressRepository;
let progress:Progress;
let config:Awaited<ReturnType<typeof loadConfig>>;
let scene:FlowerScene|undefined;
let holding=false,busy=false,modelReady=false,storageAvailable=true;
let lastTick=0,noticeTimer:ReturnType<typeof setTimeout>|undefined;
let channel:BroadcastChannel|undefined;
let waterPointer:number|undefined;
let photoAlbum:PhotoAlbum|undefined;
let photoSettings:PhotoSettings|undefined;
let photoRepository:PhotoRepository|undefined;
let photoUrls:string[]=[];
let photosPending=false;

async function refreshLocalPhotos(){
  const photos=await photoRepository?.list()??[];
  const oldUrls=photoUrls;photoUrls=[];
  config.familyPhotos={};config.photoMemories=[];
  for(const photo of photos){
    const src=URL.createObjectURL(photo.blob);photoUrls.push(src);
    if(photo.group==='memories')config.photoMemories.push({id:photo.id,src,caption:photo.caption,alt:photo.caption});
    else config.familyPhotos[photo.group]={src,label:photo.caption,focus:[50,50],zoom:1};
  }
  scene?.refreshPortraits();oldUrls.forEach(url=>URL.revokeObjectURL(url));render();
}

function openPhotoSettings(){
  openDialog('ẢNH GIA ĐÌNH');
  photoSettings=new PhotoSettings($('dialog-content'),photoRepository,async()=>{
    await refreshLocalPhotos();channel?.postMessage('photos');
  },demo);
}

function notify(message:string,persistent=false){
  clearTimeout(noticeTimer);text('notice',message);$('notice').hidden=false;
  if(!persistent)noticeTimer=setTimeout(()=>$('notice').hidden=true,5000);
}
function stop(){
  holding=false;scene?.setPouring(false);audio.stopWater();$('water').classList.remove('pouring');
  if(waterPointer!==undefined&&$('water').hasPointerCapture(waterPointer))$('water').releasePointerCapture(waterPointer);
  waterPointer=undefined;
}
async function persistStorage(){
  try{if(navigator.storage?.persist)await navigator.storage.persist();}catch{/* Persistence is optional; saving is handled separately. */}
}
function start(){
  if(!modelReady||!progress||remainingWait(progress,Date.now())>0||dialog.open||holding||document.hidden)return;
  holding=true;lastTick=performance.now();scene?.setPouring(true);$('water').classList.add('pouring');
  void audio.setEnabled(progress.soundEnabled).then(()=>{if(holding)audio.startWater();}).catch(()=>{});
  void persistStorage();
}
function render(){
  if(!progress||!config)return;
  const now=Date.now(),wait=remainingWait(progress,now),waiting=wait>0;
  const bloom=bloomProgress(progress,config);
  const growth=gardenGrowth(progress,config);
  const photosUnlocked=growth.keepsakes.some(memory=>memory.id==='little-rest');
  $('photo-memories').hidden=!photosUnlocked;
  $('photo-memories-nav').hidden=!photosUnlocked;
  const message=currentMessage(progress,config);
  const percent=waiting?0:Math.max(0,Math.round((1-progress.usedWater)*100));
  text('message-label',message.label);text('message-text',message.text);
  text('water-percent',`${percent}%`);$('water-fill').style.width=`${percent}%`;
  document.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow',String(percent));
  const button=$<HTMLButtonElement>('water');button.disabled=!modelReady||waiting;
  text('water-button-label',!modelReady?'Đang chuẩn bị…':waiting?'Để hoa uống từ từ nhé':holding?'Hoa đang uống nước…':'Giữ để tưới cho hoa');
  text('water-status',waiting?'Đất đang ngấm nước':progress.usedWater>0?'Còn một chút nước cho hoa':'Bình nước đã sẵn sàng');
  text('water-hint',waiting?(bloom>=1?(growth.bouquetComplete?'Ngày mai mình giữ thêm một chút yêu thương nhé.':'Ngày mai mình chăm nhánh hoa mới nhé mẹ.'):'Đủ nước rồi mẹ ơi. Hoa cần nghỉ một chút.'):'Nhấn giữ, thả tay để dừng');
  text('wait-status',waiting?`Có thể tưới tiếp sau ${formatWait(wait)}`:growth.bouquetComplete?'Mỗi lần chăm, thêm một chút yêu thương.':'Mỗi lần chăm, hoa lại lớn thêm một chút.');
  $('water-status').closest('.water-card')?.classList.toggle('waiting',waiting);
  $('letter').hidden=!progress.firstBloomAt;
  const first=config.watering.firstBloomWaterings;
  const count=Math.min(progress.waterings,first);
  const dots=$('growth-dots');
  if(dots.children.length!==first){dots.replaceChildren(...Array.from({length:first},()=>document.createElement('span')));}
  [...dots.children].forEach((el,i)=>el.classList.toggle('filled',i<count));
  text('growth-label',bloom>=1?`${growth.flowerCount}/3 bông hoa ở bên mẹ`:progress.waterings===0?'Một nụ hoa đang chờ mẹ':`Đã chăm ${count}/${first} lượt · Hoa đang hé nở`);
  text('stage-caption',growth.bouquetComplete?'Ba và hai con,\nluôn ở bên mẹ.':bloom>=1?`Cùng mẹ chăm thêm\nbông hoa của ${growth.growingName}.`:'Mọi điều đẹp đẽ\nđều bắt đầu từ một chút chăm chút.');
  text('garden-caption',growth.bouquetComplete?`${config.growth.flowerNames.join(' · ')} — Cả nhà thương mẹ`:'Khu vườn nhỏ, dành riêng cho mẹ');
  $('growth-card').hidden=bloom<1;
  const family=$('family-flowers');
  if(!family.children.length)config.growth.flowerNames.forEach(name=>{const item=document.createElement('span');item.append(document.createTextNode('✿ '+name));family.append(item);});
  [...family.children].forEach((el,index)=>{el.classList.toggle('grown',index<growth.flowerCount);el.setAttribute('aria-label',`${config.growth.flowerNames[index]}: ${index<growth.flowerCount?'đã nở':'đang chờ nở'}`);});
  text('next-growth',growth.bouquetComplete?(growth.nextMemory?'Một kỷ niệm mới đang chờ mẹ':'Cả nhà luôn ở bên mẹ'):`Hoa của ${growth.growingName} · Tiếp theo: ${growth.nextStage}`);
  const part=growth.sideProgress[growth.sideIndex];
  $('growth-fill').style.width=`${Math.round((growth.bouquetComplete?growth.nextMemory?growth.memoryProgress:1:part)*100)}%`;
  text('growth-detail',growth.bouquetComplete?(growth.nextMemory?`Thêm ${config.watering.seasonWaterings-(Math.max(0,progress.waterings-growth.bouquetAt)%config.watering.seasonWaterings)} lượt chăm để mở “${growth.nextMemory.title}”`:'Mẹ có thể xem lại những điều ba gửi trong Hộp kỷ niệm.'):`${growth.completedSteps}/${config.watering.seasonWaterings} lượt chăm · Nhánh nhỏ → lá → nụ → hé cánh → nở hoa`);
  const wetness=waiting?Math.min(1,wait/(bloom>=1?config.watering.dailyCooldownMs:config.watering.absorptionMs)):progress.usedWater;
  scene?.setState(bloom,wetness,growth.sideProgress);
  $('sound').setAttribute('aria-pressed',String(progress.soundEnabled));
  $('sound').setAttribute('aria-label',progress.soundEnabled?'Tắt âm thanh':'Bật âm thanh');
  $('sound').title=progress.soundEnabled?'Tắt âm thanh':'Bật âm thanh';
  document.body.classList.toggle('sound-on',progress.soundEnabled);
  document.body.classList.toggle('bloomed',bloom>=1);
}

async function tick(){
  if(!progress)return;
  if(!holding||busy){render();return;}
  const now=performance.now(),elapsed=now-lastTick;lastTick=now;
  const before=progress.waterings;busy=true;
  try{
    progress=await repository.update(p=>water(p,elapsed,Date.now(),config));
    channel?.postMessage('changed');
    if(progress.waterings>before){
      stop();
      const afterGrowth=gardenGrowth(progress,config),beforeGrowth=gardenGrowth({...progress,waterings:before},config);
      if(before<config.watering.firstBloomWaterings||afterGrowth.flowerCount>beforeGrowth.flowerCount){
        if(progress.waterings>=config.watering.firstBloomWaterings)audio.bloom();
      }else if(afterGrowth.keepsakes.length>beforeGrowth.keepsakes.length)audio.page();
      notify(progress.firstBloomAt&&before<config.watering.firstBloomWaterings?'Hoa đã nở rồi mẹ ơi. Ba có một lá thư dành cho mẹ ♡':afterGrowth.flowerCount>beforeGrowth.flowerCount?`Bông hoa của ${config.growth.flowerNames[afterGrowth.flowerCount-1]} đã nở rồi mẹ ơi ♡`:afterGrowth.keepsakes.length>beforeGrowth.keepsakes.length?'Ba vừa gửi mẹ một kỷ niệm mới trong Hộp kỷ niệm ♡':afterGrowth.bouquetComplete?'Cảm ơn mẹ đã chăm khu vườn của cả nhà ♡':progress.waterings<config.watering.firstBloomWaterings?'Bông hoa của mẹ lại lớn thêm một chút rồi mẹ ơi.':`Hoa của ${afterGrowth.growingName} lại lớn thêm một chút rồi mẹ ơi.`);
    }
  }catch(error){
    stop();notify('Chưa lưu được lượt tưới. Mẹ thử lại hoặc xuất bản sao trong Cài đặt nhé.',true);console.error(error);
  }finally{busy=false;render();}
}

function openDialog(label:string){stop();photoAlbum?.dispose();photoAlbum=undefined;photoSettings?.dispose();photoSettings=undefined;dialog.classList.remove('photo-album-dialog');text('dialog-label',label);$('dialog-content').replaceChildren();dialog.showModal();dialog.scrollTop=0;}
function requestDialogClose(){
  const album=photoAlbum;
  if(album)void album.close().then(()=>{if(photoAlbum===album&&dialog.open)dialog.close();});
  else dialog.close();
}
function paragraph(content:string,className=''){const p=document.createElement('p');p.textContent=content;p.className=className;return p;}
function openLetter(){
  if(!progress.firstBloomAt)return;
  openDialog('MỘT LÁ THƯ TỪ BA');
  const content=$('dialog-content');content.className='letter-content';
  const title=document.createElement('h2');title.textContent=config.letter.title;content.append(title);
  config.letter.paragraphs.forEach(p=>content.append(paragraph(p)));
  content.append(paragraph(config.letter.signature,'signature'));
}
function openMemories(){
  openDialog('HỘP KỶ NIỆM');const content=$('dialog-content');content.className='memories-content';
  const heading=document.createElement('h2');heading.textContent='Những điều ba gửi mẹ.';content.append(heading);
  content.append(paragraph(`${progress.waterings} lượt chăm hoa · ${seasons(progress,config)+1} mùa yêu thương`,'muted'));
  if(progress.firstBloomAt)content.append(paragraph(`Hoa nở lần đầu ngày ${new Intl.DateTimeFormat('vi-VN',{dateStyle:'long'}).format(progress.firstBloomAt)}`,'bloom-date'));
  config.messages.filter(m=>m.afterWaterings<=progress.waterings).forEach(m=>{
    const item=document.createElement('article');item.className='memory-item';item.append(paragraph(m.label,'eyebrow'),paragraph(m.text));content.append(item);
  });
  gardenGrowth(progress,config).keepsakes.forEach(memory=>{
    const item=document.createElement('article');item.className='memory-item';item.append(paragraph(memory.title,'eyebrow'));
    if(memory.imageUrl){const image=document.createElement('img');image.src=memory.imageUrl;image.alt=memory.title;image.loading='lazy';item.append(image);}
    item.append(paragraph(memory.text));content.append(item);
  });
}
function openPhotoMemories(){
  if(!gardenGrowth(progress,config).keepsakes.some(memory=>memory.id==='little-rest'))return;
  if(!config.photoMemories.length){openPhotoSettings();return;}
  openDialog('HỘP ẢNH KỶ NIỆM');dialog.classList.add('photo-album-dialog');
  photoAlbum=new PhotoAlbum($('dialog-content'),config,()=>audio.page());
  void photoAlbum.open();
}
function downloadBackup(){
  stop();const data=JSON.stringify({app:'smallgif',exportedAt:new Date().toISOString(),progress},null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`hoa-cua-me-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function openSettings(){
  openDialog('KHU VƯỜN CỦA MẸ');const content=$('dialog-content');content.className='settings-content';
  content.innerHTML=`<h2>Một chút chăm chút.</h2>
    <div class="settings-group"><h3>Ảnh của nhà mình</h3><p>Chọn ảnh cho hoa của mẹ, Bisu, Ryo và hộp kỷ niệm. Ảnh chỉ lưu trên thiết bị này.</p><button class="secondary-button" id="manage-photos">Chọn ảnh gia đình</button></div>
    <div class="settings-group"><h3>Lưu những mùa hoa</h3><p>Tiến độ được lưu trên trình duyệt này. Safari có thể tự xóa dữ liệu; mẹ có thể giữ một bản sao để khôi phục. Bản sao này chỉ chứa tiến độ, không chứa ảnh; nếu đổi máy mẹ cần chọn lại ảnh.</p><div class="settings-actions"><button class="secondary-button" id="export">Xuất bản sao</button><label class="secondary-button file-label">Nhập bản sao<input id="import" type="file" accept="application/json,.json"/></label></div><p id="import-status" class="muted" role="status"></p></div>
    <div class="settings-group"><h3>Đặt khu vườn ra màn hình chính</h3><p>Trên Safari iPhone, chọn Chia sẻ → Thêm vào MH chính. Mở khu vườn từ biểu tượng đó để chăm hoa thuận tiện hơn.</p><p class="muted" id="persistent-status">Đang kiểm tra lưu trữ…</p></div>
    <div class="settings-group"><h3>Ba bông hoa ở bên mẹ</h3><p>Sau bông hoa đầu, mỗi ${config.watering.seasonWaterings} lượt chăm sẽ giúp một nhánh mới mọc lá, có nụ rồi nở hoa. Khi đủ ba bông, mình tiếp tục giữ thêm lời nhắn và kỷ niệm. Không có ngày bị bỏ lỡ. Hoa vẫn luôn ở đây.</p></div>
    <a class="demo-link" href="/?demo=1">Xem thử hành trình nở hoa ↗</a>`;
  $('export').onclick=downloadBackup;
  $('manage-photos').onclick=openPhotoSettings;
  $<HTMLInputElement>('import').onchange=async event=>{
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{
      if(file.size>100000)throw new Error('File quá lớn.');
      const raw=JSON.parse(await file.text());if(raw.app!=='smallgif')throw new Error('Không đúng bản sao khu vườn.');
      const restored=progressSchema.parse(raw.progress);
      // Explicit confirmation protects a more advanced garden from accidental replacement.
      if(!confirm('Thay tiến độ hiện tại bằng bản sao này?'))return;
      await repository.replace(restored);progress=restored;if(!restored.soundEnabled)void audio.setEnabled(false);channel?.postMessage('changed');render();text('import-status','Đã khôi phục khu vườn của mẹ.');
    }catch{ text('import-status','Không nhập được bản sao. Mẹ kiểm tra lại file nhé.'); }
  };
  void (async()=>{try{const persistent=await navigator.storage?.persisted?.();text('persistent-status',demo?'Bản xem thử không lưu tiến độ.':!storageAvailable?'Phiên này chưa lưu được trên thiết bị.':persistent?'Trình duyệt đã cấp lưu trữ bền vững. Vẫn nên giữ bản sao.':'Đang lưu trên thiết bị. Nên giữ thêm bản sao tiến độ.');}catch{text('persistent-status','Có thể xuất bản sao để giữ lại tiến độ.');}})();
}

async function boot(){
  config=await loadConfig();
  audio.configure(config.audio);
  if(demo){config=structuredClone(config);config.watering.durationMs=2500;config.watering.absorptionMs=5000;config.watering.dailyCooldownMs=8000;$('demo-bar').hidden=false;document.body.classList.add('is-demo');}
  text('occasion',config.occasion);text('title',config.title);text('subtitle',config.subtitle);
  document.documentElement.style.setProperty('--background',config.visual.background);
  try{
    repository=demo?new MemoryProgressRepository():new IndexedDBProgressRepository();
    progress=await repository.load();
  }catch(error){
    console.error(error);storageAvailable=false;repository=new MemoryProgressRepository();progress=await repository.load();
    notify('Trình duyệt chưa lưu được tiến độ. Phiên này chỉ lưu tạm; mẹ có thể xuất bản sao trong Cài đặt.',true);
  }
  try{
    photoRepository=demo?new MemoryPhotoRepository():new IndexedDBPhotoRepository();
    await refreshLocalPhotos();
  }catch{photoRepository=undefined;config.familyPhotos={};config.photoMemories=[];}
  if(!demo&&'BroadcastChannel' in window){channel=new BroadcastChannel('smallgif-garden');channel.onmessage=event=>{
    if(event.data==='photos'){if(photoAlbum)photosPending=true;else void refreshLocalPhotos().catch(()=>{});return;}
    if(!busy)void repository.load().then(p=>{progress=p;if(!p.soundEnabled)void audio.setEnabled(false);render();}).catch(()=>{});
  };}
  const waterButton=$<HTMLButtonElement>('water');
  waterButton.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();waterPointer=event.pointerId;waterButton.setPointerCapture(event.pointerId);start();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>waterButton.addEventListener(name,()=>{stop();render();}));
  waterButton.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)start();}});
  waterButton.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();stop();render();}});
  waterButton.addEventListener('contextmenu',event=>event.preventDefault());
  window.addEventListener('blur',stop);
  window.addEventListener('pagehide',()=>{stop();audio.setVisible(false);});
  window.addEventListener('pageshow',()=>audio.setVisible(!document.hidden));
  document.addEventListener('visibilitychange',()=>{stop();audio.setVisible(!document.hidden);if(!document.hidden&&!busy)void repository.load().then(p=>{progress=p;if(!p.soundEnabled)void audio.setEnabled(false);render();}).catch(()=>{});});
  const resumeAudio=()=>{if(progress.soundEnabled)void audio.setEnabled(true).catch(()=>{});};
  document.addEventListener('pointerdown',resumeAudio,{capture:true});
  document.addEventListener('keydown',resumeAudio,{capture:true});
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:undefined;
    if(!target||target.closest('#sound,#water,#photo-memories,#photo-memories-nav,.animated-album'))return;
    if(target.closest('button,.file-label'))audio.click();
  },{capture:true});
  $('sound').onclick=async()=>{
    const button=$<HTMLButtonElement>('sound');button.disabled=true;
    try{const enabled=!progress.soundEnabled;await audio.setEnabled(enabled);progress=await repository.update(p=>({...p,soundEnabled:enabled,updatedAt:Date.now()}));channel?.postMessage('changed');render();if(enabled)audio.click();}
    catch{void audio.setEnabled(false);notify('Chưa bật được âm thanh. Mẹ thử lại nhé.');}
    finally{button.disabled=false;}
  };
  $('memories').onclick=openMemories;$('settings').onclick=openSettings;$('letter').onclick=openLetter;
  $('photo-memories').onclick=openPhotoMemories;$('photo-memories-nav').onclick=openPhotoMemories;
  $('close-dialog').onclick=requestDialogClose;
  dialog.addEventListener('close',()=>{photoAlbum?.dispose();photoAlbum=undefined;photoSettings?.dispose();photoSettings=undefined;$('dialog-content').replaceChildren();dialog.classList.remove('photo-album-dialog');if(photosPending){photosPending=false;void refreshLocalPhotos().catch(()=>{});}});
  dialog.addEventListener('cancel',event=>{if(photoAlbum){event.preventDefault();requestDialogClose();}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)requestDialogClose();}});
  $('skip-wait').onclick=async()=>{stop();progress=await repository.update(p=>({...p,soilReadyAt:0}));render();};
  $('restart-demo').onclick=async()=>{stop();void audio.setEnabled(false);await repository.replace(newProgress());progress=await repository.load();render();};
  if(demo){
    const select=$<HTMLSelectElement>('demo-stage');
    const first=config.watering.firstBloomWaterings,perFlower=config.watering.seasonWaterings;
    const stages:[number,string][]=[[0,'Bắt đầu'],[first,'Bông đầu đã nở']];
    for(let side=0;side<2;side++){
      ['Nhánh mới','Mở lá','Có nụ','Hé cánh','Nở hoa'].forEach((label,index)=>stages.push([first+side*perFlower+Math.ceil((index+1)*perFlower/5),`${config.growth.flowerNames[side+1]} · ${label}`]));
    }
    stages.push([first+perFlower*3,'Kỷ niệm tiếp theo']);
    stages.forEach(([count,label])=>{const option=document.createElement('option');option.value=String(count);option.textContent=label;select.append(option);});
    select.onchange=async()=>{
      stop();const count=Number(select.value);
      await repository.replace({...newProgress(),soundEnabled:progress.soundEnabled,waterings:count,firstBloomAt:count>=first?Date.now():null});
      progress=await repository.load();render();
    };
  }
  $('retry').onclick=()=>location.reload();
  $<HTMLImageElement>('scene-fallback').querySelector('img')!.src=config.visual.fallbackUrl;
  $('scene').addEventListener('scene-error',event=>{stop();modelReady=false;text('scene-error',(event as CustomEvent).detail);$('scene-fallback').hidden=false;render();});
  $('scene').addEventListener('scene-restored',()=>{modelReady=true;$('scene-fallback').hidden=true;render();});
  try{
    scene=new FlowerScene($('scene'),config);render();await scene.load();modelReady=true;
  }catch(error){
    console.error(error);text('scene-error','Chưa mở được bông hoa 3D. Mẹ thử tải lại nhé.');
    $<HTMLImageElement>('scene-fallback').querySelector('img')!.src=config.visual.fallbackUrl;
    $('scene-fallback').hidden=false;
  }
  $('loading').hidden=true;render();setInterval(()=>void tick(),100);
}

boot().catch(error=>{
  console.error(error);$('loading').hidden=true;
  text('message-label','KHU VƯỜN ĐANG CHUẨN BỊ');text('message-text','Chưa tải được khu vườn. Mẹ kiểm tra kết nối rồi thử lại nhé.');
  const retry=document.createElement('button');retry.className='secondary-button';retry.textContent='Tải lại';retry.onclick=()=>location.reload();document.querySelector('.message')!.append(retry);
});
