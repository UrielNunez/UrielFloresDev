import bpy
import os
import numpy as np

root = os.path.abspath('.')
source = os.path.join(root, 'Assets', 'Models', 'Player_Idle.fbx')
output = os.path.join(root, 'Assets', 'Models', 'lego-walker.glb')

bpy.ops.import_scene.fbx(filepath=source)
scene = bpy.context.scene

rig = bpy.data.objects.get('Armature')
character = bpy.data.objects.get('Character')
face = bpy.data.objects.get('GEOFaceIdle')
if not all((rig, character, face)):
    raise RuntimeError('The FBX is missing Armature, Character, or GEOFaceIdle')

# Build one self-contained facial material. The unused Run and Jump planes are
# excluded because all three occupy the same position in the source FBX.
sheet = bpy.data.images.load(
    os.path.join(root, 'Assets', 'Models', 'Idle_SpriteSheet.png'),
    check_existing=True,
)
pixels = np.array(sheet.pixels[:], dtype=np.float32).reshape(sheet.size[1], sheet.size[0], 4)
tile = pixels[-256:, :256, :].copy()
white = np.all(tile[:, :, :3] > 0.92, axis=2)
tile[white, 0] = 222 / 255
tile[white, 1] = 170 / 255
tile[white, 2] = 116 / 255
tile[white, 3] = 1

expression = bpy.data.images.new('Walker Face', width=256, height=256, alpha=True)
expression.pixels.foreach_set(tile.ravel())

material = bpy.data.materials.new('Walker Face')
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
output_node = nodes.new('ShaderNodeOutputMaterial')
surface = nodes.new('ShaderNodeBsdfPrincipled')
texture = nodes.new('ShaderNodeTexImage')
texture.image = expression
surface.inputs['Roughness'].default_value = 0.72
surface.inputs['Metallic'].default_value = 0
material.node_tree.links.new(texture.outputs['Color'], surface.inputs['Base Color'])
material.node_tree.links.new(texture.outputs['Alpha'], surface.inputs['Alpha'])
material.node_tree.links.new(surface.outputs['BSDF'], output_node.inputs['Surface'])
material.surface_render_method = 'DITHERED'
face.data.materials.clear()
face.data.materials.append(material)

# A 1024px ceiling is ample for the character's on-page size and reduces the
# embedded texture payload and GPU upload time.
for image in bpy.data.images:
    if image == expression or not image.has_data:
        continue
    width, height = image.size
    if max(width, height) > 1024:
        scale = 1024 / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))

for obj in bpy.context.view_layer.objects:
    obj.select_set(False)
for obj in (rig, character, face):
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='SCENE',
    export_frame_range=True,
    export_force_sampling=False,
    export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True,
    export_apply=False,
    export_image_format='WEBP',
    export_image_quality=70,
    export_image_webp_fallback=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=8,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_yup=True,
)

print('EXPORTED', output, os.path.getsize(output))
