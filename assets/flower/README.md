# Purple rose — visual concept v1

Violet/lavender palette updated through Blender MCP; size and morph controls retained.

Built directly in Blender 4.4.3 through Blender MCP. No external asset or generated model service was used.

## Files

- `flower.blend`: editable source, portrait camera, studio lighting, and blooming shape-key animation on frames 1–180 (30 fps).
- `flower.glb`: flower, stem, two leaves, sepals, pot and soil. Studio, camera and the original default scene are excluded.
- `flower-bud.png`, `flower-opening.png`, `flower-bloom.png`: portrait renders at frames 1, 85 and 180.
- Rebuild scripts: `../../scripts/build_flower.py`, then `../../scripts/export_flower.py`, executed inside Blender. They create/replace only the named concept scene and retain the original scene. Scripts currently contain this project's absolute output path.

## Proportions

Flower head (petals and sepals) is scaled 1.4× (30% smaller than the previous 2× revision) around the stem attachment, per visual feedback. Stem, leaves and pot retain their original dimensions. The portrait camera is reframed to keep the larger bloom visible.

## Bloom controls

31 separate petals across five layers, plus five sepals, carry a `Bloom` morph target. Weight 0 is closed; weight 1 is open. The GLB opens fully bloomed by default. It contains morph targets rather than animation clips; the application should set morph weights from its own progress state.

Petal node extras include `role`, `layer` (0 outer to 4 inner), and `bloom_delay`. Open sepals first, followed by outer and then inner petals. The Blender timeline is an illustrative sequence, not the watering schedule.

```js
flower.traverse((object) => {
  const index = object.morphTargetDictionary?.Bloom;
  if (index !== undefined) object.morphTargetInfluences[index] = progress;
});
```

Blender is Z-up; the glTF exporter converts to Y-up. Materials are solid-color PBR with no external textures. Preview lighting, color management, subsurface shading, and thin Solidify modifiers do not all carry into the GLB; match and verify the appearance in Three.js separately. The GLB uses two-sided petal surfaces without baked thickness.

## Validation and remaining work

- Visually inspected bud, intermediate and open states in Blender.
- Inspected GLB container: one scene, 46 meshes, 36 meshes with morph targets, 37,472 triangles, 1,005,436 bytes. No default Cube or studio objects exported.
- Concept model for visual review; no armature or stem/leaf sway rig.
- Three.js import, full-range petal intersection review, mobile GPU performance, and iPhone Safari rendering are not yet verified.
- No watering can, water effects, app UI or gameplay is included in this asset pass.
