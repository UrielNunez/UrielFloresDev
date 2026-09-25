import bpy,os,json,math
from mathutils import Vector
s=bpy.context.scene;r=bpy.data.objects['Armature'];root=os.path.abspath('animation-review')
s.render.engine='BLENDER_WORKBENCH';s.render.resolution_x=480;s.render.resolution_y=480;s.render.resolution_percentage=100;s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL'
previous=None;jump=0
for f in range(130,241):
 s.frame_set(f);now=[r.pose.bones[n].rotation_quaternion.copy() for n in ['UpArm.R','Hand.R']]
 if previous:jump=max(jump,*[a.rotation_difference(b).angle for a,b in zip(previous,now)])
 previous=now
 if (f-130)%3==0:
  s.render.filepath=os.path.join(root,'down-preview-%03d.png'%f);bpy.ops.render.render(write_still=True)
s.frame_set(200);center=r.matrix_world@r.pose.bones['Spine2'].head
s.camera.location=center+Vector((3,-2,0));s.camera.rotation_euler=(center-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.type='ORTHO';s.camera.data.ortho_scale=1.2
s.render.filepath=os.path.join(root,'down-side.png');bpy.ops.render.render(write_still=True)
open(os.path.join(root,'shot-validation.json'),'w').write(json.dumps({'fps':s.render.fps/s.render.fps_base,'max_joint_change_degrees':math.degrees(jump)}))
print('MAX_FRAME_ROTATION',math.degrees(jump))
