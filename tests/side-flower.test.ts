import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { headTemplates } from '../src/scene/side-flower';

describe('shared side-flower geometry',()=>{
  it('preserves actual GLB head morphs and placement while merging 36 meshes to six',async()=>{
    const buffer=readFileSync(new URL('../public/models/flower.glb',import.meta.url));
    const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength) as ArrayBuffer,'');
    gltf.scene.updateMatrixWorld(true);
    const sources:THREE.Mesh[]=[];
    gltf.scene.traverse(obj=>{if(obj instanceof THREE.Mesh&&obj.morphTargetDictionary?.Bloom!==undefined)sources.push(obj);});
    const originalPosition=sources[0].geometry.attributes.position.getX(0);
    const templates=headTemplates(sources);expect(sources).toHaveLength(36);expect(templates).toHaveLength(6);
    expect(sources[0].geometry.attributes.position.getX(0)).toBe(originalPosition);
    for(const weight of [0,.5,1]){
      const expected=new THREE.Box3();const actual=new THREE.Box3();
      for(const source of sources){
        const previous=source.morphTargetInfluences![0];source.morphTargetInfluences![0]=weight;
        for(let i=0;i<source.geometry.attributes.position.count;i++){
          const point=source.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(source.matrixWorld).sub(new THREE.Vector3(0,2.78,0));
          expected.expandByPoint(point);
        }
        source.morphTargetInfluences![0]=previous;
      }
      for(const template of templates){
        expect(template.geometry.morphTargetsRelative).toBe(true);
        expect(template.geometry.morphAttributes.position).toHaveLength(1);
        const mesh=new THREE.Mesh(template.geometry,template.material);mesh.morphTargetInfluences![0]=weight;
        for(let i=0;i<mesh.geometry.attributes.position.count;i++)actual.expandByPoint(mesh.getVertexPosition(i,new THREE.Vector3()));
      }
      expect(actual.min.distanceTo(expected.min)).toBeLessThan(.00001);
      expect(actual.max.distanceTo(expected.max)).toBeLessThan(.00001);
    }
    templates.forEach(t=>t.geometry.dispose());
  });
});
