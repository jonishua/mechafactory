# Style sheet (LOCKED)

The art director locked this direction after round 6 of the Style Lab. Every new or restyled unit follows these rules. The history is in `STYLE-REFS.md`, and the reference images are in `ImageRefs/`.

## Humans: "Dark heroic" (A grim heroic × B dark stylized)

Implemented as `style: 'blend'` in `js/humans.js`. It's the default for new human units.

| Rule | Spec |
| --- | --- |
| Proportions | ≈4.5 heads tall. Oversized hands, forearms and shoulders; a V-taper (big chest, narrow waist); chunky weapons. |
| Height at size 1 | Rogue ≈47 px, soldier ≈50 px, berserker ≈57 px. It fits a 64 px cell at rest. The berserker's overhead windup needs a 96 px cell for attack frames. |
| Posture | Upright and confident. The spine is vertical and the head level. There's no hunch or forward lean. |
| Idle | Relaxed and natural: daggers low in a reverse grip, guns carried low across the body, and the greatsword resting over the shoulder with the free arm hanging loose. Weapons come up only to attack. Breathing is subtle. |
| Legs | Two clearly separate legs from the front and ¾ views. Hip joints are wider than the belt, and the feet land about 1.6× the hip width apart. The stance is staggered (left foot forward). The inner thighs are slim, and no plates or cloth fill the gap. |
| Shapes | Angular, chamfered armour. Rounded bevels only on fur, cloth and muscle, never on armour or heads. |
| Faces | Hidden or shadowed: hoods with dark faces, T-slit and eye-slit helms. Eyes are at most 1 px. Sci-fi lenses glow only as thin slits. |
| Gear | Diablo-style armour rather than "RPG skin and leather". The barbarian wears dark plate, bladed pauldrons and a crested war helm with no animal horns. Skin shows only on the upper arms at most. |
| Palette | Low value, low saturation, one accent colour: Night Watch, Iron Pilgrim, Ashen, Oxblood, Grave Moss, Bone & Rust. |
| Lighting | The `dusk` look: low key, deep shadows and a cool rim light on the back edges. |

## Mechs: "Military frame"

Implemented as `sdStyle: 'frame'` in `js/sdmechs.js` (the "Mech frame" line). It's the default for new mechs.

| Rule | Spec |
| --- | --- |
| Head | Tiny (≈1/10 of the height) and recessed: under a chest hood or sunk between the shoulders. Only a visor slit or mono-eye shows. |
| Body | A big faceted upper chest over a narrow mechanical waist, with side skirts. |
| Legs | Massive thighs (the widest part of the body) tapering to slim shins, with knee guards. Long feet with a toe cap and rear spur. Knees slightly bent, a wide stance and a clear leg gap. |
| Surfaces | Faceted, low-poly wedge armour. Hazard stripes, stencil numbers, emblem plates and small orange marks. |
| Loadouts | Asymmetric: stacked-plate or tower shields, arm cannons, rifles, missile boxes, containers and antenna fins. |
| Idle | Weapons lowered, raised on attack. Upright, with the chest slightly forward and the head never drooping. |
| Height at size 1 | ≈85–100 px. Use 128 px cells. |
| Palette | Sand Frame, Field Olive, Navy Anchor, Bone White and Titans Navy for military units. Costume mechs like the Corsair get vivid signature colours. |

## Animation rules
- **Idle:** the stance described above, plus subtle breathing and a slow weight shift.
- **Walk:** a real walk, not a waddle. Legs travel straight under the hips with no A-frame splay or sideways swing. Heel strike, passing pose and push-off, with the knee lifting forward. Minimal side-to-side sway and hip roll, arms counter-swinging, and a stable torso and head. The idle stance blends out as the walk starts.
- **Attack:** the weapon comes up from the relaxed carry, strikes or fires, and returns.
- **Run:** a separate cycle with a flight phase. Heavier roles are more ponderous.
- **Hit:** directional. Humans flinch with a blood spurt; mechs stagger with sparks and smoke.
- **Deaths:** gruesome, StarCraft II-style.
  - Humans: collapse (bleed out), dismember (the head is severed, with a blood fountain) and gib (burst into chunks with a wide pool).
  - Mechs: explode (parts blown off, burning wreck), collapse (crash onto the chest) and meltdown (the core overheats, then a massive blast).
  - Modular chassis: explode and collapse.
- **Extras:** reload (guns and pods), aim (kneel and brace for rifles) and block (shields, weapon parries).

## Roll-out order
1. Fix the human walk cycle (done: foot-path IK walk, stance blends out, no splay or wobble).
2. Apply the locked rules to the remaining human roles: sniper, knight, heavy (done).
3. Apply Military frame to all mech archetypes (done).
4. Restyle the Modular line to the frame rules. It is not being retired (done).
