import bpy,json,os
s=bpy.context.scene;r=bpy.data.objects['Armature']
names=['UPArm.L','LowArm.L','Hand.L','UpArm.R','Bone.002','Hand.R','UpArm_ControlObject.L','UpArm_ControlObject.R','LowArm_ControlObject.L','LowArm_ControlObject.R','UpLegL','LowLegL','FootCONTROL.L']
def pose():return {n:{'q':list(r.pose.bones[n].rotation_quaternion),'loc':list(r.pose.bones[n].location),'parent':r.pose.bones[n].parent.name if r.pose.bones[n].parent else None} for n in names}
out={'saved_frame':s.frame_current,'saved':pose(),'frames':{}}
for f in [1,2,3,60,100,140,160,180,200,220,240]:
 s.frame_set(f);out['frames'][f]=pose()
open('animation-review/inspection.json','w').write(json.dumps(out,indent=2))
print('SAVED',out['saved_frame']);print('DIFF',[(n,out['saved'][n]['q'],out['frames'][1][n]['q'],out['frames'][2][n]['q']) for n in names])
s.frame_set(60);s.render.engine='BLENDER_WORKBENCH';s.render.resolution_x=700;s.render.resolution_y=700;s.render.resolution_percentage=100
s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.render.filepath=os.path.abspath('animation-review/before.png');bpy.ops.render.render(write_still=True)
