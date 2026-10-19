"""Run after build_flower.py in Blender. Export model, previews and editable scene."""
import bpy, os, math
ROOT='/Users/ryan/Documents/02. Others/Projects /SmallGif/assets/flower'
scene=bpy.context.scene
collection=next(c for c in scene.collection.children if c.name.startswith('FLOWER_Export'))

# Sepals cradle the closed bud and unfold before the petals.
for obj in collection.objects:
    if obj.name.startswith('Sepal_') and not obj.data.shape_keys:
        opened=[v.co.copy() for v in obj.data.vertices]
        angle=int(obj.name.split('_')[1].split('.')[0])*math.tau/5
        for j in range(17):
            t=j/16
            radius=.065+.27*math.sin(math.pi*t*.72)
            z=2.77+.76*t
            width=.12*math.sin(math.pi*t)**.8
            for i,u in enumerate([-1,0,1]):
                obj.data.vertices[j*3+i].co=(radius*math.cos(angle)-u*width*math.sin(angle),radius*math.sin(angle)+u*width*math.cos(angle),z-.025*u*u)
        obj.shape_key_add(name='Basis')
        key=obj.shape_key_add(name='Bloom')
        for v,co in zip(key.data,opened): v.co=co
        for f,val in [(1,0),(20,0),(100,1),(180,1)]:
            key.value=val; key.keyframe_insert(data_path='value',frame=f)

# Enlarge the entire flower head around its attachment to the unchanged stem.
# Object transforms preserve every petal/sepal morph target.
HEAD_SCALE = 1.4
for obj in collection.objects:
    if obj.name.startswith(('Petal_', 'Sepal_')):
        obj.scale = (HEAD_SCALE,) * 3
        obj.location = (0, 0, 2.78 * (1 - HEAD_SCALE))
scene.camera.location = (5, -9, 7.22)
from mathutils import Vector
scene.camera.rotation_euler = (Vector((0, 0, 2.55)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera.data.ortho_scale = 6.2

for frame,name in [(1,'flower-bud.png'),(85,'flower-opening.png'),(180,'flower-bloom.png')]:
    scene.frame_set(frame)
    scene.render.filepath=os.path.join(ROOT,name)
    bpy.ops.render.render(write_still=True)

scene.frame_set(180)
scene.render.filepath=os.path.join(ROOT,'flower-bloom.png')
# Curves are converted only in temporary export copies; editable originals stay intact.
bpy.ops.object.select_all(action='DESELECT')
temporary=[]
for obj in collection.objects:
    if obj.type=='CURVE':
        dup=obj.copy(); dup.data=obj.data.copy(); collection.objects.link(dup)
        dup.name=obj.name+'_ExportMesh'
        bpy.context.view_layer.objects.active=dup; dup.select_set(True)
        bpy.ops.object.convert(target='MESH')
        temporary.append(bpy.context.view_layer.objects.active)
        bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type!='CURVE': obj.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in collection.objects if o.name.startswith('Flower_Root'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'flower.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_morph=True,export_extras=True,export_apply=False)
for obj in temporary: bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.name.startswith('Flower_Root'): obj.select_set(True); bpy.context.view_layer.objects.active=obj
# Write only this asset scene and its dependencies, preserving unrelated live work.
bpy.data.libraries.write(os.path.join(ROOT,'flower.blend'),{scene},fake_user=True)
print('Saved flower.blend, flower.glb, and three portrait previews.')
