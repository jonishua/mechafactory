# Architecture and roadmap

Mecha Factory is the **art pipeline** for a future RTS / party dungeon-crawler: StarCraft II / Total Annihilation-style control, Armored Core-style loadouts, and mobile, Steam and Xbox targets. This note records the decisions that keep the factory reusable for that game.

## 1. Author in 3D, ship baked sprites

The factory renders units live: convex primitives are ray-cast into pixel art. That's ideal for designing, but it's too expensive to run per unit in a game with 50+ units on screen, especially on mobile.

So the game never runs this renderer. It plays **baked sprite sheets**:

- The sprite-sheet export produces 8 direction rows, with columns for `idle`, the `walk` loop and `attack`. Choose between a tight crop and **fixed 64 / 96 / 128 px cells**, where the feet sit at the same anchor in every frame.
- The JSON beside each sheet lists the cell size, the feet anchor, animation ranges (`from`, `count`, `loop`), and the full blueprint, so a unit can always be re-baked.
- Target cells: humans 64 px (≈36–42 px tall, heavies ≈52 px). Mechs use 96–128 px.

Still to do on the pipeline:
- Batch-bake a whole roster into texture atlases.
- Death and hit animations.
- Palette-swap and team-colour masks, so each blueprint only needs baking once per team.
- Optional 16 directions for large units.

## 2. Blueprints are the source of truth

A unit is a small JSON **blueprint**: product line, part slots, proportions, size and paint. Building from a blueprint is deterministic, so a blueprint (or its `MF1.` share code) always rebuilds the same unit. The game can store blueprints and bake them at build time.

## 3. Product lines

`MF.Gen.registerLine(id, def)` adds a family of units. Each line defines:

- its own part slots (the UI builds dropdowns from them)
- random rules that respect locks
- a builder that assembles the rig and pushes animators
- palettes, a size range and a naming scheme

Current lines:

| Line | File | What it is |
| --- | --- | --- |
| `modular` | `js/mechgen.js` | The original mechs: 7 chassis types, and interchangeable torso, head, arm, shoulder and back parts |
| `sd` | `js/sdmechs.js` | "Heroic frame": super-deformed, Gundam-inspired archetypes |
| `human` | `js/humans.js` | Heroic super-deformed infantry (rogue, soldier, berserker…), in fantasy or sci-fi gear |

## 4. Loadouts (Armored Core direction)

Players will customise units by swapping weapons and parts. The groundwork:

- **Hardpoints.** Every chassis exposes named mount nodes: right arm, left arm, right back, left back, plus shoulders. Weapons attach to mounts, not to a specific chassis.
- **Weapon library.** Each weapon is a self-contained builder, `build(ctx, mountNode, side)`, that owns its muzzle flash and its attack animation (keyed off `st.fire`). Weapons live in shared tables (`MF.Gen.sdWeapons`, `MF.Gen.humanWeapons`), so any line can mount them.
  - Weapon families: guns, cannons, rocket launchers, heat-seeking and homing missile pods, plasma swords and beam sabers, shields, flamers, drills.
- **Frames.** The Armored Core parts map onto the modular slots: head, core (torso), arms, legs (biped, reverse-joint, tetrapod/quadruped, treads, hover), and a back booster or generator.

Next steps:
- Merge the per-line weapon tables into one registry, with tags for mount size and hand/back.
- Add per-part stats (weight, energy, armour) alongside the art.
- A loadout editor that validates slot compatibility.

## 5. Animation contract

Every rig's animators receive one state object each frame (built by `animState()` in `js/app.js`, and sampled per frame by the sprite export):

| Field | Meaning |
| --- | --- |
| `phase` | Walk phase in radians. It advances with distance walked, so one cycle equals the rig's `stride`. |
| `move` | 0..1 walk blend. |
| `run` | 0..1 run blend (Shift). The ground speed is 1.8×. |
| `t` | Time in seconds, for idle life. |
| `fire`, `fireN` | Attack. `fire` jumps to 1 and decays at `rig.fireDecay` per second. `fireN` counts attacks, for alternating hands. |
| `hit`, `hitN`, `hitDir` | Seconds since the last hit (`null` if none), a hit counter, and the direction the hit came from (radians, unit-local). |
| `death`, `deathType`, `deathSeed` | Seconds since death (`null` while alive), which death variant, and a per-unit seed. |
| `act` | `{ name, t }` for an extra action (`reload`, `aim`, `block`, `cast`), with `t` in seconds since it started, or `null`. |

Each rig declares what it supports in `ctx.info` (exposed as `rig.info`):

```js
ctx.info.deaths = ['collapse', 'dismember', 'gib'];   // variants the K key cycles through and the export bakes
ctx.info.extras = ['reload', 'aim'];                  // actions the E key cycles through and the export bakes
ctx.info.dur = { hit: 0.45, death: 3, reload: 1.3, aim: 1.6, block: 1.1 };   // seconds; the export samples these
ctx.info.customHit = true;                            // set when the line animates its own hit reaction
```

If a line declares no deaths and no custom hit, `addFallbackReactions()` in `js/mechgen.js` adds generic ones: humans bleed and topple, mechs spark and explode.

### Effects (`js/fx.js`)
`MF.FX` builds effects out of real prims parented to the rig. Every effect is deterministic in time: `fx.update(seconds)`. Presets are `bloodBurst`, `gibs`, `explosion`, `hitBlood`, `hitSparks` and `smokeTrail`. The building blocks are `burst` (particle kinds: `blood`, `mist`, `gib`, `debris`, `spark`, `fire`, `flash`, `smoke`, `ember`) and `pool` (floor decals: blood pools, scorch marks). The materials `blood`, `bloodDark`, `fire`, `spark`, `smoke` and `scorch` have their own colour ramps. `fire` and `spark` glow. Parent effects to the root and animate the body's own nodes, so effects stay in world space while the body falls.

### Tone
It's a battle game: deaths should be gruesome, like StarCraft II. Humans get blood sprays, dismemberment and gibbing, with pools of blood. Mechs get fireballs, secondary explosions, flying debris, sparks and smoking wrecks.

### Sprite export
Columns are grouped into named animations: `idle`, `walk`, `run`, `attack`, `hit`, `death_<variant>` for each death, and one per extra action. The JSON lists `animations: { name: { from, count, loop } }` and `durations`.
