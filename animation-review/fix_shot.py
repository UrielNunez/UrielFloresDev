import bpy, math, os
from mathutils import Vector, Matrix
s=bpy.context.scene;r=bpy.data.objects['Armature'];root=os.path.abspath('animation-review')
web=bpy.data.objects['Telarana lanzada desde muneca derecha'];arm=r.pose.bones['UpArm.R'];fore=r.pose.bones['Hand.R']
def smooth(a,b,f):
 t=max(0,min(1,(f-a)/(b-a)));return t*t*t*(t*(t*6-15)+10)
s.frame_set(140)
base={n:r.pose.bones[n].rotation_quaternion.copy() for n in ['UpArm.R','Hand.R','Bone.002']}
baseWorld={n:(r.matrix_world@r.pose.bones[n].matrix).to_quaternion() for n in base}
length1=(r.matrix_world@arm.tail-r.matrix_world@arm.head).length
length2=(r.matrix_world@fore.tail-r.matrix_world@fore.head).length
# The web's original attachment offset is measured at the wrist, not the elbow.
attach=(r.matrix_world@fore.matrix).inverted()@(web.matrix_world@web.data.splines[0].points[0].co.xyz)
r.animation_data.action.use_fake_user=True;r.animation_data.action=r.animation_data.action.copy();r.animation_data.action.name='SPIDERMAN - Lanzamiento frontal hacia abajo'
web.data.animation_data.action=web.data.animation_data.action.copy()
checks=[]
for f in range(141,241):
 s.frame_set(f)
 for n,q in base.items():r.pose.bones[n].rotation_quaternion=q
 bpy.context.view_layer.update()
 shoulder=r.matrix_world@arm.head
 forward=(r.matrix_world.to_3x3()@Vector((0,1,0))).normalized()
 outward=(r.matrix_world.to_3x3()@Vector((1,0,0))).normalized()
 down=Vector((0,0,-1))
 pull=smooth(216,240,f)
 wrist=shoulder+outward*0.085+forward*0.125+down*(0.19-0.022*pull)
 direction=(wrist-shoulder).normalized();reach=(wrist-shoulder).length
 along=(length1**2-length2**2+reach**2)/(2*reach)
 height=math.sqrt(max(0,length1**2-along**2))
 pole=(forward*0.8+outward*0.6);pole=(pole-direction*pole.dot(direction)).normalized()
 elbow=shoulder+direction*along+pole*height
 blend=smooth(140,183,f)
 for bone,end,start in [(arm,elbow,shoulder),(fore,wrist,elbow)]:
  # Minimal swing preserves the reference roll and avoids twisting the whole limb.
  qref=baseWorld[bone.name]
  q=(qref@Vector((0,1,0))).rotation_difference((end-start).normalized())@qref
  world=Matrix.LocRotScale(start,q,(r.matrix_world@bone.matrix).to_scale())
  bone.matrix=r.matrix_world.inverted()@world
  bpy.context.view_layer.update()
  goal=bone.rotation_quaternion.copy();bone.rotation_quaternion=base[bone.name].slerp(goal,blend)
  bone.keyframe_insert('rotation_quaternion',frame=f,group=bone.name)
  bpy.context.view_layer.update()
 # Keep the hand aligned with the forearm instead of folding it back.
 hand=r.pose.bones['Bone.002'];hand.rotation_quaternion=base['Bone.002'];hand.keyframe_insert('rotation_quaternion',frame=f,group=hand.name)
 bpy.context.view_layer.update()
 origin=(r.matrix_world@fore.matrix)@attach
 # The target is below the wrist, with only a small forward offset for clearance.
 extension=0.01+1.6*smooth(174,197,f)
 for i,point in enumerate(web.data.splines[0].points):
  t=i/(len(web.data.splines[0].points)-1)
  p=origin+down*(extension*t)+forward*(0.055*t)
  point.co=(*(web.matrix_world.inverted()@p),1);point.keyframe_insert('co',frame=f)
 checks.append((f,(r.matrix_world@fore.tail-shoulder).dot(forward)))
for layer in r.animation_data.action.layers:
 for strip in layer.strips:
  for bag in strip.channelbags:
   for fc in bag.fcurves:
    for k in fc.keyframe_points:
     if k.co.x>=140:k.interpolation='LINEAR'
s.frame_set(1);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'nueva animacion lego spiderman - lanzamiento hacia abajo.blend'))
print('FRONT_DISTANCE_LAST',checks[-1])
s.render.engine='BLENDER_WORKBENCH';s.render.resolution_x=600;s.render.resolution_y=600;s.render.resolution_percentage=100;s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL'
for f in [140,155,170,185,200,240]:
 s.frame_set(f);s.render.filepath=os.path.join(root,'shot-%03d.png'%f);bpy.ops.render.render(write_still=True)

