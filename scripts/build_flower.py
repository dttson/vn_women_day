"""Run in Blender via Blender MCP. Editable procedural flower concept v1."""
import bpy, math, random, os
from mathutils import Vector

ROOT = '/Users/ryan/Documents/02. Others/Projects /SmallGif/assets/flower'
os.makedirs(ROOT, exist_ok=True)
random.seed(20)
previous=bpy.data.scenes.get('SmallGif_Flower_Concept')
if previous:
    for obj in list(previous.objects): bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(previous)
scene = bpy.data.scenes.new('SmallGif_Flower_Concept')
bpy.context.window.scene = scene
flower = bpy.data.collections.new('FLOWER_Export')
scene.collection.children.link(flower)
stage = bpy.data.collections.new('STUDIO_Preview_Only')
scene.collection.children.link(stage)

def material(name, color, rough=.4, subsurface=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    if 'Subsurface Weight' in p.inputs:
        p.inputs['Subsurface Weight'].default_value = subsurface
    return m

petals = [material('Petal_%02d_Violet'%i, c, .38, .09) for i,c in enumerate([
    (.22,.055,.38), (.33,.10,.52), (.46,.20,.65), (.62,.35,.78), (.74,.50,.86)])]
green = material('Stem_Sage', (.095,.24,.11), .46)
leafmat = material('Leaf_Jade', (.10,.32,.16), .38)
veinmat = material('Leaf_Vein', (.22,.40,.17), .5)
ceramic = material('Pot_Warm_Ivory', (.83,.73,.58), .28)
soilmat = material('Soil_Cocoa', (.11,.052,.026), .95)
gold = material('Pot_RoseGold_Detail', (.51,.25,.13), .3)
groundmat = material('Backdrop_Blush', (.70,.51,.45), .85)

def mesh(name, verts, faces, mat, col=flower):
    data = bpy.data.meshes.new(name+'_Mesh')
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    for p in data.polygons: p.use_smooth = True
    return obj

def curve(name, points, radius, mat, col=flower):
    data=bpy.data.curves.new(name, 'CURVE')
    data.dimensions='3D'; data.bevel_depth=radius; data.bevel_resolution=3
    s=data.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points, points):
        b.co=p; b.handle_left_type='AUTO'; b.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data); col.objects.link(obj); data.materials.append(mat)
    return obj

def lathe(name, profile, mat, segments=96):
    verts=[]; faces=[]
    for r,z in profile:
        verts.extend((r*math.cos(i*math.tau/segments),r*math.sin(i*math.tau/segments),z) for i in range(segments))
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*segments+i; b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name,verts,faces,mat)

lathe('Pot_Ceramic',[(0,.05),(.36,.05),(.40,.09),(.51,.70),(.53,.77),(.53,.83),(.50,.86),(.46,.86),(.45,.80),(.44,.73),(.34,.13),(0,.13)],ceramic)
lathe('Pot_Accent_Line',[(.504,.70),(.510,.715),(.515,.73)],gold)
lathe('Soil_Surface',[(0,.755),(.445,.755),(.446,.735),(0,.735)],soilmat)
curve('Stem_Main',[(0,0,.75),(-.08,.02,1.3),(.08,.015,2.05),(0,0,2.8)],.039,green)

def leaf(name, origin, direction, length, width):
    d=Vector(direction).normalized(); side=Vector((-d.y,d.x,0)).normalized()
    origin=Vector(origin); verts=[]; faces=[]; n=18; w=10
    for j in range(n+1):
        t=j/n; center=origin+d*(length*t)+Vector((0,0,.14*math.sin(math.pi*t)))
        span=width*math.sin(math.pi*t)**.85
        for i in range(w+1):
            u=i/w*2-1
            pos=center+side*(span*u)+Vector((0,0,-.10*u*u*math.sin(math.pi*t)))
            verts.append(tuple(pos))
    for j in range(n):
        for i in range(w):
            a=j*(w+1)+i; faces.append((a,a+1,a+w+2,a+w+1))
    obj=mesh(name,verts,[tuple(reversed(f)) for f in faces],leafmat)
    solid=obj.modifiers.new('Leaf_Thickness','SOLIDIFY'); solid.thickness=.009
    points=[tuple(origin+d*(length*t)+Vector((0,0,.14*math.sin(math.pi*t)+.007))) for t in [0,.25,.5,.75,1]]
    curve(name+'_Midrib',points,.008,veinmat)

curve('Leaf_Left_Petiole',[(-.05,0,1.43),(-.28,0,1.62),(-.39,0,1.67)],.018,green)
leaf('Leaf_Left',(-.35,0,1.64),(-1,-.08,.38),.85,.24)
curve('Leaf_Right_Petiole',[(.07,0,1.97),(.28,.08,2.10),(.38,.10,2.12)],.015,green)
leaf('Leaf_Right',(.32,.09,2.08),(1,.13,.35),.69,.205)

# Each petal has identical closed/open topology for exported glTF morph targets.
NU=20; NT=24
layers=[(9,1.10,.56,.68),(8,.86,.80,.75),(6,.59,.97,.86),(5,.34,1.06,1.0),(3,.17,1.12,1.12)]
for layer,(count,reach,height,halfangle) in enumerate(layers):
    for k in range(count):
        angle=k*math.tau/count+layer*2.39996+random.uniform(-.06,.06)
        reach_i=reach*random.uniform(.95,1.05)
        phase=random.random()*math.tau
        def coords(opened):
            result=[]
            for j in range(NT+1):
                t=j/NT
                for i in range(NU+1):
                    u=2*i/NU-1
                    phi=angle+u*halfangle*math.sin(math.pi*t/2)**.7 + .12*t*t
                    if opened:
                        s=t*(1-.26*u*u)
                        r=.065+reach_i*math.sin(math.pi*s/2)**1.1*(1-.12*u*u)
                        z=2.78+height*s+.16*math.sin(math.pi*s)-.13*s**7
                        z+=.06*u*u*math.sin(math.pi*s)+.018*math.sin(3*u+phase)*s*s
                    else:
                        r=.055+(.22+.035*(4-layer))*math.sin(math.pi*t*.94)**.8*(1-.08*u*u)
                        z=2.78+(1.15+.02*layer)*t-.09*u*u*t
                    result.append((r*math.cos(phi),r*math.sin(phi),z))
            return result
        faces=[]
        for j in range(NT):
            for i in range(NU):
                a=j*(NU+1)+i; faces.append((a,a+1,a+NU+2,a+NU+1))
        obj=mesh('Petal_L%02d_%02d'%(layer,k),coords(False),[tuple(reversed(f)) for f in faces],petals[max(0,4-layer)])
        obj['layer']=layer; obj['role']='petal'; obj['bloom_delay']=round(layer*.12,2)
        obj.shape_key_add(name='Basis')
        key=obj.shape_key_add(name='Bloom')
        for v,co in zip(key.data,coords(True)): v.co=co
        for frame,value in [(1,0),(35+layer*9,0),(125+layer*9,1),(180,1)]:
            key.value=value; key.keyframe_insert(data_path='value',frame=frame)
        key.value=1
        solid=obj.modifiers.new('Petal_Thickness','SOLIDIFY'); solid.thickness=.012; solid.offset=0

# Slender pointed sepals under the bloom.
for k in range(5):
    a=k*math.tau/5; verts=[]; faces=[]
    for j in range(17):
        t=j/16; r=.06+.53*t; z=2.79+.04*t-.20*t*t
        width=.12*math.sin(math.pi*t)**.8
        for u in [-1,0,1]:
            verts.append((r*math.cos(a)-u*width*math.sin(a),r*math.sin(a)+u*width*math.cos(a),z-.05*u*u))
    for j in range(16):
        for i in range(2):
            p=j*3+i; faces.append((p,p+1,p+4,p+3))
    mesh('Sepal_%02d'%k,verts,[tuple(reversed(f)) for f in faces],green)

root=bpy.data.objects.new('Flower_Root',None); flower.objects.link(root)
for obj in list(flower.objects):
    if obj!=root: obj.parent=root
root['description']='Peach rose concept; individual petal Bloom morphs. Z-up Blender; glTF export converts axes.'
mesh('Studio_Ground',[(-200,-200,0),(200,-200,0),(200,200,0),(-200,200,0)],[(0,1,2,3)],groundmat,stage)

def aim(obj,point): obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size; data.color=color
    obj=bpy.data.objects.new(name,data); stage.objects.link(obj); obj.location=loc; aim(obj,(0,0,2)); return obj
area('Key_Softbox',(-3,-4,7),650,5,(1,.86,.75))
area('Fill_Softbox',(4,-1,5),450,4,(1,.92,.88))
area('Rim_Softbox',(1,4,6),800,3,(1,.78,.62))
world=bpy.data.worlds.new('Flower_Studio_World'); world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.40,.32,.30,1)
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.45
scene.world=world
camdata=bpy.data.cameras.new('Camera_Portrait'); cam=bpy.data.objects.new('Camera_Portrait',camdata); stage.objects.link(cam)
cam.location=(5,-9,6.7); aim(cam,(0,0,2.03)); camdata.type='ORTHO'; camdata.ortho_scale=5.0; scene.camera=cam
scene.render.resolution_x=900; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.fps=30; scene.frame_start=1; scene.frame_end=180; scene.frame_set(180)
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.view_settings.view_transform='AgX'
for screen in bpy.data.screens:
    for ar in screen.areas:
        if ar.type=='VIEW_3D':
            ar.spaces.active.region_3d.view_perspective='CAMERA'
scene.render.filepath=os.path.join(ROOT,'flower-bloom.png')
print('Created scene',scene.name,'with',len(flower.objects),'export objects; 31 petals with Bloom shape keys.')
