import bpy,os,math,json
from mathutils import Vector
s=bpy.context.scene;r=bpy.data.objects['Armature'];root=os.path.abspath('animation-review')
s.render.engine='BLENDER_WORKBENCH';s.render.resolution_x=480;s.render.resolution_y=480;s.render.resolution_percentage=100;s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL'
maxjump=0;previous=None
for f in range(1,241):
 s.frame_set(f)
 now=[r.pose.bones[n].rotation_quaternion.copy() for n in ['LowArm.L','Hand.R']]
 if previous:maxjump=max(maxjump,*[a.rotation_difference(b).angle for a,b in zip(previous,now)])
 previous=now
 if f%4==1:
  s.render.filepath=os.path.join(root,'preview-%03d.png'%f);bpy.ops.render.render(write_still=True)
print('MAX_ARM_FRAME_CHANGE_DEGREES',math.degrees(maxjump))
s.frame_set(60)
center=r.matrix_world@r.pose.bones['Root'].head
s.camera.location=center+Vector((3,-4,0.5));s.camera.rotation_euler=(center-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.type='ORTHO';s.camera.data.ortho_scale=1.5
s.render.filepath=os.path.join(root,'knees-side.png');bpy.ops.render.render(write_still=True)
