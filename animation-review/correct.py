import bpy, math, os, json
from mathutils import Vector,Quaternion
s=bpy.context.scene;r=bpy.data.objects['Armature']; root=os.path.abspath('animation-review')
frames=range(s.frame_start,s.frame_end+1)
def curves(action):return [f for l in action.layers for st in l.strips for cb in st.channelbags for f in cb.fcurves]
a=r.animation_data.action
# Keep the user's keyed frame 1 exactly as the reference for the arms.
names=['UPArm.L','LowArm.L','Hand.L','UpArm.R','Hand.R','Bone.002']
s.frame_set(1);ref={n:r.pose.bones[n].rotation_quaternion.copy() for n in names}
s.frame_set(2);oldref={n:r.pose.bones[n].rotation_quaternion.copy() for n in names}
changed=[n for n in names if ref[n].rotation_difference(oldref[n]).angle>math.radians(5)]
print('CORRECTED JOINTS',changed)
webnames=['Telarana de suspension','Sujecion tobillo L','Sujecion tobillo R','Telarana lanzada desde muneca derecha','Vueltas de seda tobillo L','Vueltas de seda tobillo R']
data={}
for f in frames:
 s.frame_set(f)
 data[f]={'q':{n:r.pose.bones[n].rotation_quaternion.copy() for n in changed},'legs':{n:r.pose.bones[n].rotation_quaternion.copy() for n in ['UpLegL','UpLegR','LowLegL','LowLegR']},'mat':{n:(r.matrix_world@r.pose.bones[n].matrix).copy() for n in ['FootL','FootR','Hand.R']},'web':{n:[(bpy.data.objects[n].matrix_world@p.co.xyz).copy() for p in bpy.data.objects[n].data.splines[0].points] for n in webnames}}
a.use_fake_user=True;r.animation_data.action=a.copy();r.animation_data.action.name='SPIDERMAN - Brazos corregidos y rodillas suaves'
for n in webnames:
 o=bpy.data.objects[n]
 if o.data.animation_data and o.data.animation_data.action:
  o.data.animation_data.action=o.data.animation_data.action.copy()
# Relative rotation offset retains the existing performance and its timing.
offsets={n:ref[n]@oldref[n].inverted() for n in changed}
for f in frames:
 s.frame_set(f); d=data[f]
 for n in changed:
  bone=r.pose.bones[n]; bone.rotation_quaternion=ref[n] if f==1 else offsets[n]@d['q'][n]
  bone.rotation_quaternion.normalize();bone.keyframe_insert('rotation_quaternion',frame=f,group=n)
 # This action disables IK, so animate the deform bones directly.
 for side in 'LR':
  for prefix,angle in [('UpLeg',-10),('LowLeg',24 if side=='L' else 21)]:
   bone=r.pose.bones[prefix+side]
   bone.rotation_quaternion=d['legs'][bone.name]@Quaternion((1,0,0),math.radians(angle))
   bone.keyframe_insert('rotation_quaternion',frame=f,group=bone.name)
 bpy.context.view_layer.update()
 transforms={n:(r.matrix_world@r.pose.bones[n].matrix)@d['mat'][n].inverted() for n in ['FootL','FootR','Hand.R']}
 oldL=d['web']['Sujecion tobillo L'][0];oldR=d['web']['Sujecion tobillo R'][0]
 newL=transforms['FootL']@oldL;newR=transforms['FootR']@oldR
 junctionShift=((newL-oldL)+(newR-oldR))/2
 for n in webnames:
  o=bpy.data.objects[n]; pts=d['web'][n]; new=[]
  for i,p in enumerate(pts):
   t=i/max(1,len(pts)-1)
   if n=='Telarana de suspension':v=p+junctionShift*(1-t)
   elif n.startswith('Sujecion'):
    v=(newL if n.endswith('L') else newR) if i==0 else p+junctionShift
   elif n.startswith('Vueltas'):
    v=transforms['FootL' if n.endswith('L') else 'FootR']@p
   else:
    # Keep the target end while reattaching the launch end to the corrected wrist.
    delta=transforms['Hand.R']@pts[0]-pts[0]
    v=p+delta*(1-t)
   local=o.matrix_world.inverted()@v
   point=o.data.splines[0].points[i];point.co=(*local,1);point.keyframe_insert('co',frame=f)
for fcurve in curves(r.animation_data.action):
 for k in fcurve.keyframe_points:k.interpolation='LINEAR'
s.frame_set(1)
# Store self-contained textures when available; leave missing reference images alone.
for image in bpy.data.images:
 if image.has_data and image.source=='FILE' and not image.packed_file:
  try:image.pack()
  except:pass
output=os.path.join(root,'nueva animacion lego spiderman - corregida.blend')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=output)
# Workbench previews show the pose without requiring external textures.
s.render.engine='BLENDER_WORKBENCH';s.render.resolution_x=600;s.render.resolution_y=600;s.render.resolution_percentage=100
s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL'
for f in [1,60,150,175,195,240]:
 s.frame_set(f);s.render.filepath=os.path.join(root,'pose-%03d.png'%f);bpy.ops.render.render(write_still=True)
print('OUTPUT',output)
