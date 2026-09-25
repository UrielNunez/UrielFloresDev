import bpy
import os

scene = bpy.context.scene
output = os.path.abspath("Assets/Models/spiderman-intro.glb")

# The final animation is the active action in the corrected source file.
scene.frame_start = 1
scene.frame_end = 240

# Keep only renderable character meshes and the rig. Control-shape meshes are
# viewport helpers and add weight without being visible in the final model.
export_names = {
    "Armature",
    "Personaje",
    "GEOFaceIdie",
}

for obj in bpy.context.view_layer.objects:
    obj.select_set(False)
for name in export_names:
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    if obj.name not in bpy.context.view_layer.objects:
        scene.collection.objects.link(obj)
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)

rig = bpy.data.objects["Armature"]
bpy.context.view_layer.objects.active = rig

# glTF requires a Principled surface with an explicit alpha input.
face = bpy.data.objects['GEOFaceIdie']
material = face.data.materials[0]
nodes = material.node_tree.nodes
texture = next(n for n in nodes if n.type == 'TEX_IMAGE')
texture.image = bpy.data.images.load(os.path.abspath('Assets/Models/Idle_SpriteSheet.png'), check_existing=True)
import numpy as np
sheet = texture.image
pixels = np.array(sheet.pixels[:], dtype=np.float32).reshape(sheet.size[1], sheet.size[0], 4)
# The source sheet contains 16 columns and 9 rows. The face UVs expect a
# single expression, not the complete sprite sheet.
tile = pixels[-256:, :256, :].copy()
expression = bpy.data.images.new('Intro Face', width=256, height=256, alpha=True)
expression.pixels.foreach_set(tile.ravel())
texture.image = expression
surface = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
output_node = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
material.node_tree.links.new(texture.outputs['Color'], surface.inputs['Base Color'])
material.node_tree.links.new(texture.outputs['Alpha'], surface.inputs['Alpha'])
material.node_tree.links.new(surface.outputs['BSDF'], output_node.inputs['Surface'])
material.surface_render_method = 'DITHERED'
scene.frame_set(1)

# The model is small on screen, so 1024px textures preserve its appearance and
# save several megabytes compared with the original 4K maps.
for image in bpy.data.images:
    if image.name in {"Cabello Normal Map", "Personaje Base Color"}:
        width, height = image.size
        if max(width, height) > 1024:
            scale = 1024 / max(width, height)
            image.scale(max(1, round(width * scale)), max(1, round(height * scale)))

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="SCENE",
    export_frame_range=True,
    export_force_sampling=True,
    export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True,
    export_apply=False,
    export_image_format="WEBP",
    export_image_quality=72,
    export_image_webp_fallback=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=8,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_yup=True,
)

print("EXPORTED", output, os.path.getsize(output))
