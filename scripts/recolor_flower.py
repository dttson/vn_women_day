"""Run in Blender MCP: load only the flower scene, recolor and re-export it."""
import bpy, os, re
ROOT='/Users/ryan/Documents/02. Others/Projects /SmallGif/assets/flower'
scene=next((s for s in bpy.data.scenes if s.name.startswith('SmallGif_Flower_Concept')),None)
if scene is None:
    with bpy.data.libraries.load(os.path.join(ROOT,'flower.blend'),link=False) as (source,target):
        target.scenes=[name for name in source.scenes if name.startswith('SmallGif_Flower_Concept')][:1]
    scene=target.scenes[0]
if scene is None:
    raise RuntimeError('Flower concept scene is missing')
bpy.context.window.scene=scene
palette=[(.22,.055,.38),(.33,.10,.52),(.46,.20,.65),(.62,.35,.78),(.74,.50,.86)]
changed=set()
for obj in scene.objects:
    if not obj.name.startswith('Petal_'):
        continue
    for slot in obj.material_slots:
        mat=slot.material
        if not mat or mat in changed:
            continue
        match=re.match(r'Petal_(\d+)_',mat.name)
        if not match:
            raise RuntimeError('Unknown petal material: '+mat.name)
        index=int(match.group(1))
        color=(*palette[index],1)
        mat.diffuse_color=color
        node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        node.inputs['Base Color'].default_value=color
        mat.name='Petal_%02d_Violet'%index
        changed.add(mat)
print('Recolored',len(changed),'materials in isolated scene',scene.name)
exec(compile(open(os.path.join(ROOT,'../../scripts/export_flower.py')).read(),'export_flower.py','exec'))
