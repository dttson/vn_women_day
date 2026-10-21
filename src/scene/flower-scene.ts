import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AppConfig } from '../config';
import { SideFlower, headTemplates, applyBloom } from './side-flower';

export class FlowerScene {
  private scene=new THREE.Scene();
  private renderer:THREE.WebGLRenderer;
  private camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,80);
  private flower?:THREE.Group;
  private sway=new THREE.Group();
  private morphs:THREE.Mesh[]=[];
  private sideFlowers:SideFlower[]=[];
  private sideProgress:[number,number]=[0,0];
  private dew:THREE.InstancedMesh;
  private dewUntil=0;
  private soil?:THREE.MeshStandardMaterial;
  private wateringCan=new THREE.Group();
  private drops:THREE.InstancedMesh;
  private dust:THREE.Points;
  private shadow:THREE.Mesh;
  private targetBloom=0;
  private bloom=0;
  private wetness=0;
  private targetWetness=0;
  private pouring=false;
  private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private resizeObserver:ResizeObserver;
  private object=new THREE.Object3D();
  private lastRender=performance.now();
  private elapsed=0;
  private paused=false;
  private contextLost=false;
  private lastMetrics=0;
  private debug=new URLSearchParams(location.search).get('demo')==='1';
  private portraits:{element:HTMLElement;index:number}[]=[];

  constructor(private host:HTMLElement,private config:AppConfig) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,config.visual.pixelRatioCap));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Bông hoa 3D mẹ đang chăm');
    this.renderer.domElement.setAttribute('role','img');
    this.host.append(this.renderer.domElement);
    this.createPortraits();
    this.scene.add(new THREE.HemisphereLight(0xffeee2,0x9c9b80,2));
    const key=new THREE.DirectionalLight(0xffead7,3.0);
    key.position.set(-3,7,5);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;
    key.shadow.camera.top=7;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;
    this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xffd8bf,1.5);fill.position.set(4,4,-3);this.scene.add(fill);
    this.camera.position.set(5,6.7,9);
    this.camera.lookAt(0,2.18,0);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x8d6b56,opacity:.12}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=.005;this.scene.add(floor);
    const shadowMat=new THREE.MeshBasicMaterial({map:this.shadowTexture(),transparent:true,depthWrite:false,opacity:.28});
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7),shadowMat);
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.012;this.scene.add(this.shadow);
    this.makeCan();
    this.drops=new THREE.InstancedMesh(new THREE.SphereGeometry(.022,6,5),new THREE.MeshStandardMaterial({color:0xb0d9d4,roughness:.2,metalness:.1}),28);
    this.drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.drops.visible=false;this.drops.frustumCulled=false;this.scene.add(this.drops);
    this.dew=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,6,5),new THREE.MeshBasicMaterial({color:0xf2e4ff,transparent:true,opacity:.8}),12);
    this.dew.visible=false;this.dew.frustumCulled=false;this.scene.add(this.dew);
    const positions=new Float32Array(config.visual.dustCount*3);
    for(let i=0;i<positions.length;i+=3){positions[i]=(Math.random()-.5)*7;positions[i+1]=Math.random()*6;positions[i+2]=(Math.random()-.5)*3-1;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xd5b292,size:.025,transparent:true,opacity:.45,depthWrite:false}));this.scene.add(this.dust);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.contextLost=true;host.dispatchEvent(new CustomEvent('scene-error',{detail:'Hình ảnh 3D đang tạm nghỉ. Mẹ tải lại để tiếp tục nhé.'}));});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.contextLost=false;host.dispatchEvent(new CustomEvent('scene-restored'));});
    document.addEventListener('visibilitychange',()=>{this.paused=document.hidden;this.lastRender=performance.now();});
    this.renderer.setAnimationLoop(()=>this.render());
  }

  async load(){
    const gltf=await new GLTFLoader().loadAsync(this.config.visual.modelUrl);
    this.flower=gltf.scene;
    this.flower.updateMatrixWorld(true);
    this.flower.traverse(obj=>{
      if(obj instanceof THREE.Mesh){
        obj.castShadow=true;obj.receiveShadow=true;
        if(obj.morphTargetDictionary?.Bloom!==undefined) this.morphs.push(obj);
        if(obj.name.startsWith('Soil_') && obj.material instanceof THREE.MeshStandardMaterial) this.soil=obj.material;
      }
    });
    const templates=headTemplates(this.morphs);
    this.flower.add(this.sway);
    const moving:THREE.Object3D[]=[];
    this.flower.traverse(obj=>{if(obj!==this.sway && /^(Petal_|Sepal_|Stem_|Leaf_)/.test(obj.name))moving.push(obj);});
    moving.forEach(obj=>this.sway.attach(obj));
    for(let index=0;index<2;index++){
      const flower=new SideFlower(templates,index,this.config.visual.sideFlowerColors[index]);flower.setProgress(this.sideProgress[index],true);
      this.sideFlowers.push(flower);this.sway.add(flower.root);
    }
    this.bloom=this.targetBloom;
    this.scene.add(this.flower);
    this.applyMorphs();
  }

  setState(bloom:number,wetness:number,sides:[number,number]=[0,0]){
    this.targetBloom=bloom;this.targetWetness=wetness;this.sideProgress=sides;
    this.sideFlowers.forEach((flower,index)=>flower.setProgress(sides[index]));
  }
  setPouring(active:boolean){if(active)this.dewUntil=this.elapsed+2;else if(this.pouring)this.dewUntil=this.elapsed+1.5;this.pouring=active;}
  refreshPortraits(){
    this.host.querySelector('.family-portraits')?.remove();
    this.portraits=[];this.createPortraits();
  }
  private createPortraits(){
    const overlay=document.createElement('div');overlay.className='family-portraits';
    (['mom','bisu','ryo'] as const).forEach((key,index)=>{
      const photo=this.config.familyPhotos[key];if(!photo)return;
      const badge=document.createElement('figure');badge.className=`flower-portrait portrait-${key}`;badge.hidden=true;
      const frame=document.createElement('div');frame.className='portrait-frame';
      const image=document.createElement('img');image.src=photo.src;image.alt=photo.label;image.decoding='async';
      image.style.width=`${photo.zoom*100}%`;
      image.style.transform=`translate(-${photo.focus[0]}%, -${photo.focus[1]}%)`;
      image.onerror=()=>{badge.dataset.failed='true';badge.hidden=true;};
      const caption=document.createElement('figcaption');caption.textContent=photo.label;
      frame.append(image);badge.append(frame,caption);overlay.append(badge);
      this.portraits.push({element:badge,index});
    });
    this.host.append(overlay);
  }
  private positionPortraits(){
    const w=this.host.clientWidth,h=this.host.clientHeight;
    const compact=w<500;
    this.sway.updateWorldMatrix(true,true);
    this.camera.updateMatrixWorld();
    for(const {element,index} of this.portraits){
      const unlocked=index===0?this.targetBloom>=1:this.sideProgress[index-1]>=1;
      const visuallyOpen=index===0?this.bloom>.98:this.sideFlowers[index-1]?.isOpen();
      element.hidden=!unlocked||!visuallyOpen||element.dataset.failed==='true'||this.contextLost;
      if(element.hidden)continue;
      const anchor=index===0?this.sway.localToWorld(new THREE.Vector3(0,3.44,0)):this.sideFlowers[index-1].photoAnchor();
      anchor.project(this.camera);
      const offset=index===0?(compact?130:188):index===1?-(compact?58:72):(compact?58:72);
      const x=THREE.MathUtils.clamp((anchor.x+1)*w/2+offset,34,w-34);
      const y=THREE.MathUtils.clamp((1-anchor.y)*h/2+(index===0?-8:0),40,h-65);
      element.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    }
  }
  private shadowTexture(){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d')!;const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(104,81,60,0.65)');g.addColorStop(.45,'rgba(104,81,60,0.2)');g.addColorStop(1,'rgba(104,81,60,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(canvas);
  }
  private makeCan(){
    const enamel=new THREE.MeshStandardMaterial({color:0x9aa892,roughness:.36,metalness:.15});
    const metal=new THREE.MeshStandardMaterial({color:0xc4cdbb,roughness:.4,metalness:.2});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.24,.30,.44,32),enamel);this.wateringCan.add(body);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.28,.035,8,32,Math.PI*1.65),metal);handle.position.set(-.27,.12,0);handle.rotation.z=.6;this.wateringCan.add(handle);
    const spoutCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.20,-.1,0),new THREE.Vector3(.46,.02,0),new THREE.Vector3(.72,.16,0)]);
    this.wateringCan.add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve,12,.052,8,false),metal));
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.07,.08,20),metal);nozzle.position.set(.74,.18,0);nozzle.rotation.z=-.95;this.wateringCan.add(nozzle);
    this.wateringCan.position.set(-1.32,.8,.5);this.wateringCan.rotation.y=.15;
    this.wateringCan.scale.setScalar(.85);
    this.wateringCan.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});this.scene.add(this.wateringCan);
  }
  private resize(){
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    const height=w<500?5.5:5.25;
    this.camera.left=-height*w/h/2;this.camera.right=height*w/h/2;this.camera.top=height/2;this.camera.bottom=-height/2;
    this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);
  }
  private applyMorphs(){
    applyBloom(this.morphs,this.bloom);
  }
  private render(){
    if(this.paused||this.contextLost)return;
    const now=performance.now();const dt=Math.min((now-this.lastRender)/1000,.05);this.lastRender=now;this.elapsed+=dt;
    this.bloom=THREE.MathUtils.damp(this.bloom,this.targetBloom,4,dt);this.applyMorphs();
    this.sideFlowers.forEach(flower=>flower.update(dt));
    this.wetness=THREE.MathUtils.damp(this.wetness,this.targetWetness,3,dt);
    if(this.soil)this.soil.color.lerpColors(new THREE.Color(.11,.052,.026),new THREE.Color(.035,.018,.012),this.wetness);
    if(!this.reducedMotion){this.sway.rotation.z=Math.sin(this.elapsed*(this.pouring?2:.65))*this.config.visual.swayAmount*(this.pouring?1.5:1);this.sway.rotation.y=Math.sin(this.elapsed*.23)*.035;this.dust.rotation.y=this.elapsed*.015;}
    this.dew.visible=!this.reducedMotion&&(this.pouring||this.elapsed<this.dewUntil);
    if(this.dew.visible){
      for(let i=0;i<12;i++){
        const angle=i*Math.PI*2/12+this.elapsed*.18;
        this.object.position.set(Math.cos(angle)*(.40+this.bloom*.9),3.3+Math.sin(i*1.7+this.elapsed)*.38,Math.sin(angle)*(.40+this.bloom*.9));
        this.object.scale.setScalar(.6+.5*Math.sin(this.elapsed*3+i));this.object.updateMatrix();this.dew.setMatrixAt(i,this.object.matrix);
      }
      this.dew.instanceMatrix.needsUpdate=true;
    }
    this.wateringCan.position.y=THREE.MathUtils.damp(this.wateringCan.position.y,this.pouring?1.36:.80,5,dt);
    this.wateringCan.rotation.z=THREE.MathUtils.damp(this.wateringCan.rotation.z,this.pouring?-.68:0,5,dt);
    this.drops.visible=this.pouring;
    if(this.pouring){
      const source=this.wateringCan.localToWorld(new THREE.Vector3(.79,.18,0));
      for(let i=0;i<28;i++){
        const t=(this.elapsed*1.35+i/28)%1;
        this.object.position.copy(source).lerp(new THREE.Vector3((i%5-2)*.045,.77,(i%3-1)*.055),t);
        this.object.position.y+=Math.sin(t*Math.PI)*.06;
        this.object.scale.set(.65,1.7,.65);this.object.updateMatrix();this.drops.setMatrixAt(i,this.object.matrix);
      }
      this.drops.instanceMatrix.needsUpdate=true;
    }
    this.positionPortraits();
    this.renderer.render(this.scene,this.camera);
    if(this.debug&&this.elapsed-this.lastMetrics>1){
      this.lastMetrics=this.elapsed;
      this.host.dataset.drawCalls=String(this.renderer.info.render.calls);
      this.host.dataset.triangles=String(this.renderer.info.render.triangles);
    }
  }
}
