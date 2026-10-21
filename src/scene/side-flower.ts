import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Template={geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[];layer:number;sepal:boolean};

// Bake only head meshes, preserving relative morph offsets. Main flower remains untouched.
// Five petal materials + sepals become six shared meshes per side flower.
export function headTemplates(meshes:THREE.Mesh[]):Template[]{
  const groups=new Map<THREE.Material|THREE.Material[],{parts:THREE.BufferGeometry[];layer:number;sepal:boolean}>();
  for(const source of meshes){
    const geometry=source.geometry.clone();
    const matrix=source.matrixWorld;
    const linear=new THREE.Matrix3().setFromMatrix4(matrix);
    const rotation=new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().extractRotation(matrix));
    geometry.applyMatrix4(matrix);
    geometry.translate(0,-2.78,0);
    // applyMatrix4 intentionally does not transform morph attributes.
    for(const attribute of geometry.morphAttributes.position??[]){
      for(let i=0;i<attribute.count;i++){
        const v=new THREE.Vector3().fromBufferAttribute(attribute,i);
        if(geometry.morphTargetsRelative)v.applyMatrix3(linear);
        else v.applyMatrix4(matrix).sub(new THREE.Vector3(0,2.78,0));
        attribute.setXYZ(i,v.x,v.y,v.z);
      }
    }
    for(const attribute of geometry.morphAttributes.normal??[]){
      for(let i=0;i<attribute.count;i++){
        const v=new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix3(rotation);
        attribute.setXYZ(i,v.x,v.y,v.z);
      }
    }
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const group=groups.get(source.material)??{parts:[],layer:Number(source.userData.layer??0),sepal:source.name.startsWith('Sepal_')};
    group.parts.push(geometry);groups.set(source.material,group);
  }
  return [...groups].map(([material,{parts,layer,sepal}])=>{
    const geometry=mergeGeometries(parts,false);
    if(!geometry)throw new Error('Cannot merge side flower geometry');
    geometry.morphTargetsRelative=parts[0].morphTargetsRelative;
    parts.forEach(part=>part.dispose());
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return {geometry,material,layer,sepal};
  });
}

export function applyBloom(meshes:THREE.Mesh[],bloom:number){
  for(const mesh of meshes){
    const index=mesh.morphTargetDictionary!.Bloom;
    const layer=Number(mesh.userData.layer??0);
    const sepal=mesh.name.startsWith('Sepal_');
    mesh.morphTargetInfluences![index]=THREE.MathUtils.smoothstep(bloom,sepal?0:.07+layer*.09,sepal?.4:.8+layer*.05);
  }
}

export class SideFlower {
  readonly root=new THREE.Group();
  private stem=new THREE.Group();
  private head=new THREE.Group();
  private leaves=new THREE.Group();
  private meshes:THREE.Mesh[]=[];
  private target=0;
  private progress=0;
  private curve:THREE.QuadraticBezierCurve3;
  constructor(templates:Template[],index:number,petalColor:string){
    this.root.name=`Side_Flower_${index+1}`;
    const origin=index===0?new THREE.Vector3(-.03,1.55,0):new THREE.Vector3(.04,1.3,0);
    const tip=index===0?new THREE.Vector3(-1.05,2.12,.70):new THREE.Vector3(.98,1.85,.70);
    this.root.position.copy(origin);
    const end=tip.sub(origin);
    this.curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(end.x*.8,end.y*.15,end.z*.6),end);
    const green=new THREE.MeshStandardMaterial({color:0x637f54,roughness:.55,side:THREE.DoubleSide});
    this.stem.add(new THREE.Mesh(new THREE.TubeGeometry(this.curve,14,.023,6,false),green));
    const shape=new THREE.Shape();
    shape.moveTo(0,0);shape.bezierCurveTo(.12,.18,.40,.21,.55,.05);shape.bezierCurveTo(.42,-.13,.12,-.12,0,0);
    const leafGeometry=new THREE.ShapeGeometry(shape,10);
    for(let j=0;j<2;j++){
      const leaf=new THREE.Mesh(leafGeometry,green);leaf.position.copy(this.curve.getPoint(.44+j*.23));
      leaf.rotation.set(-.25,j===0?-.4:.6,j===0?.5:2.7);this.leaves.add(leaf);
    }
    for(const template of templates){
      const tint=(source:THREE.Material)=>{
        if(template.sepal||!(source instanceof THREE.MeshStandardMaterial))return source;
        // Petals need independent materials; geometry and green sepals remain shared.
        const material=source.clone();
        const lightness=source.color.getHSL({h:0,s:0,l:0}).l;
        material.color.set(petalColor).multiplyScalar(.62+lightness*.6);
        return material;
      };
      const material=Array.isArray(template.material)?template.material.map(tint):tint(template.material);
      const mesh=new THREE.Mesh(template.geometry,material);
      mesh.name=template.sepal?'Sepal_Side':'Petal_Side';mesh.userData.layer=template.layer;
      mesh.morphTargetDictionary={Bloom:0};mesh.morphTargetInfluences=[0];
      // Side blooms receive light but do not add shadow passes.
      mesh.receiveShadow=true;mesh.castShadow=false;this.head.add(mesh);this.meshes.push(mesh);
    }
    this.root.add(this.stem,this.leaves,this.head);
    this.root.visible=false;
  }
  setProgress(progress:number,snap=false){this.target=progress;if(snap)this.progress=progress;}
  isOpen(){return this.progress>.995;}
  photoAnchor(){return this.head.localToWorld(new THREE.Vector3(0,.62,0));}
  update(dt:number){
    this.progress=THREE.MathUtils.damp(this.progress,this.target,5,dt);
    const p=this.progress;this.root.visible=p>.0001;if(!this.root.visible)return;
    const branch=THREE.MathUtils.smoothstep(p,0,.2);
    this.stem.scale.setScalar(Math.max(.001,branch));
    this.leaves.scale.setScalar(Math.max(.001,THREE.MathUtils.smoothstep(p,.2,.4)));
    this.leaves.visible=p>.2;
    this.head.position.copy(this.curve.getPoint(branch));
    this.head.visible=p>.4;
    this.head.scale.setScalar(.40*THREE.MathUtils.smoothstep(p,.4,.6));
    applyBloom(this.meshes,THREE.MathUtils.smoothstep(p,.6,1));
  }
}
