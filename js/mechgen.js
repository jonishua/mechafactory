// Mecha Factory — blueprints, part library, rigs and walk cycles.
// A blueprint is plain JSON (shareable); build(bp) turns it into a node hierarchy + animator.
(function () {
  const MF = window.MF;
  const { RNG } = MF;
  const PI = Math.PI;

  const OPTIONS = {
    frame: ['biped', 'strider', 'spider', 'crawler', 'quadruped', 'tank', 'hover'],
    torso: ['block', 'wedge', 'barrel', 'hunch', 'core', 'cockpit'],
    head: ['visor', 'mono', 'cockpit', 'horned', 'sensor', 'dome', 'skull', 'periscope', 'none'],
    arm: ['cannon', 'gatling', 'missiles', 'fist', 'claw', 'blade', 'shield', 'drill', 'hammer', 'flamer', 'laser', 'twin', 'none'],
    shoulders: ['pauldron', 'round', 'launcher', 'spiked', 'shield', 'none'],
    back: ['missiles', 'exhaust', 'antenna', 'tank', 'radar', 'artillery', 'wings', 'jetpack', 'saw', 'sensor', 'none'],
    scheme: ['mono', 'split', 'inverse'],
  };
  const LABELS = {
    frame: { biped: 'Biped', strider: 'Reverse-joint', spider: 'Quad spider', crawler: 'Hex crawler', quadruped: 'Quadruped walker', tank: 'Treads', hover: 'Hover' },
    torso: { block: 'Block', wedge: 'Wedge chest', barrel: 'Barrel', hunch: 'Hunchback', core: 'Turret core', cockpit: 'Cockpit hull' },
    head: { visor: 'Visor', mono: 'Mono-eye', cockpit: 'Cockpit', horned: 'V-fin', sensor: 'Sensor bar', dome: 'Dome', skull: 'Skull', periscope: 'Periscope', none: 'Headless' },
    arm: { cannon: 'Rail cannon', gatling: 'Gatling', missiles: 'Rocket pod', fist: 'Power fist', claw: 'Claw', blade: 'Energy blade', shield: 'Shield', drill: 'Drill', hammer: 'Hydraulic hammer', flamer: 'Flamer', laser: 'Laser lance', twin: 'Twin cannon', none: 'None' },
    shoulders: { pauldron: 'Pauldrons', round: 'Round guards', launcher: 'Launchers', spiked: 'Spiked', shield: 'Shield plates', none: 'None' },
    back: { missiles: 'Missile rack', exhaust: 'Exhaust stacks', antenna: 'Antenna', tank: 'Fuel tank', radar: 'Radar dish', artillery: 'Artillery', wings: 'Fins', jetpack: 'Jetpack', saw: 'Buzz saw', sensor: 'Sensor mast', none: 'None' },
    scheme: { mono: 'Solid', split: 'Two-tone', inverse: 'Inverted' },
  };

  const NAMES = ['Bulwark', 'Scorpion', 'Mantis', 'Warden', 'Hornet', 'Goliath', 'Talon', 'Jackal', 'Rook', 'Cinder', 'Paladin', 'Vulture', 'Basilisk', 'Kodiak', 'Stinger', 'Harrier', 'Anvil', 'Wraith', 'Ironclad', 'Tarantula', 'Sabre', 'Colossus', 'Marauder', 'Bastion', 'Onager', 'Kestrel', 'Behemoth', 'Scarab', 'Tempest', 'Grendel', 'Halberd', 'Mule', 'Nomad', 'Specter', 'Hammerhead', 'Locust', 'Raptor', 'Titan', 'Viper', 'Yeti'];
  const PREFIX = ['MK', 'RX', 'VT', 'GX', 'AR', 'TX', 'ZR', 'KV', 'HX', 'M'];

  // ------------------------------------------------------------- product lines
  // A line is a family of units with its own part slots, random rules and builder.
  // def: { label, group, slots:[{key,label,options,labels}], weight, random(r, keep, bp), build(ctx),
  //        palettes?:[names], sizeRange?:[a,b], name?(r, bp), sliders?:[keys] }
  const LINES = {};
  function registerLine(id, def) { LINES[id] = Object.assign({ id, weight: 1, group: 'Mechs' }, def); }
  const lineOf = (bp) => LINES[(bp && bp.line) || 'modular'] || LINES.modular;

  // ------------------------------------------------------------- random blueprint
  // opts.line forces a line (used by the gallery filter); locks keep slot values from prev.
  function randomBlueprint(seed, locks = {}, prev = null, opts = {}) {
    const r = new RNG(seed);
    const keep = (k, gen) => (locks[k] && prev && prev[k] !== undefined ? prev[k] : gen());
    const weights = {};
    for (const id in LINES) if (!opts.group || LINES[id].group === opts.group) weights[id] = LINES[id].weight;
    let line = keep('line', () => opts.line || r.weighted(weights));
    if (!LINES[line]) line = 'modular';
    const def = LINES[line];
    const bp = { v: 2, seed, line };
    // a locked slot from another line would be meaningless here
    const keepL = (k, gen) => (locks[k] && prev && (prev.line || 'modular') === line && prev[k] !== undefined ? prev[k] : gen());
    def.random(r, keepL, bp);
    bp.bulk = keep('bulk', () => +r.range(0.8, 1.35).toFixed(2));
    bp.legLen = keep('legLen', () => +r.range(0.75, 1.3).toFixed(2));
    bp.tall = keep('tall', () => +r.range(0.8, 1.3).toFixed(2));
    bp.armLen = keep('armLen', () => +r.range(0.8, 1.25).toFixed(2));
    bp.edge = keep('edge', () => +r.range(0.8, 2.4).toFixed(1));
    const sr = def.sizeRange || [1.0, 1.3];
    bp.size = keepL('size', () => +r.range(sr[0], sr[1]).toFixed(2));
    const pals = def.palettes || Object.keys(MF.PALETTES).filter((k) => !MF.PALETTES[k].human);
    bp.palette = keep('palette', () => r.pick(pals));
    bp.colors = locks.palette && prev && prev.colors ? { ...prev.colors } : { ...MF.PALETTES[bp.palette] };
    bp.number = keep('number', () => String(r.int(100, 999)));
    bp.name = keep('name', () => (def.name ? def.name(r, bp) : `${r.pick(PREFIX)}-${bp.number} ${r.pick(NAMES)}`));
    return bp;
  }

  function randomModular(r, keep, bp) {
    const frame = keep('frame', () => r.weighted({ biped: 5, strider: 3, spider: 3, crawler: 2, quadruped: 3, tank: 2, hover: 2 }));
    const legged = frame === 'biped' || frame === 'strider';
    bp.frame = frame;
    bp.torso = keep('torso', () => {
      if (frame === 'spider') return r.weighted({ core: 7, block: 2, barrel: 1, wedge: 1, cockpit: 1 });
      if (frame === 'crawler') return r.weighted({ core: 4, block: 2, barrel: 2, wedge: 1, cockpit: 2 });
      if (frame === 'quadruped') return r.weighted({ core: 3, block: 2, cockpit: 3, wedge: 2, barrel: 1 });
      if (frame === 'tank') return r.weighted({ block: 3, wedge: 2, barrel: 2, hunch: 1, core: 2, cockpit: 4 });
      return r.weighted({ block: 3, wedge: 4, barrel: 2, hunch: 2, core: 1, cockpit: 1 });
    });
    // Military frame: small recessed sensor heads; the cute / tall ones are rarer
    bp.head = keep('head', () => {
      if (bp.torso === 'core') return r.weighted({ none: 4, sensor: 2, mono: 1, periscope: 1 });
      if (bp.torso === 'cockpit') return r.weighted({ none: 3, periscope: 3, sensor: 2, dome: 1, mono: 1 });
      if (!legged && frame !== 'hover') return r.weighted({ none: 2, sensor: 3, mono: 2, periscope: 2, dome: 1, visor: 1 });
      return r.weighted({ visor: 4, mono: 3, cockpit: 1, horned: 2, sensor: 2, dome: 1, skull: 2, periscope: 1, none: 1 });
    });
    const armPool = legged || frame === 'hover'
      ? { cannon: 3, gatling: 3, missiles: 2, fist: 2, claw: 2, blade: 2, shield: 3, drill: 1, hammer: 2, flamer: 2, laser: 2, twin: 2 }
      : { cannon: 3, gatling: 3, missiles: 3, claw: 1, drill: 1, flamer: 2, laser: 2, twin: 3, hammer: 1, none: 2 };
    bp.armL = keep('armL', () => r.weighted(armPool));
    // asymmetric loadouts are the norm: a matching pair only now and then
    bp.armR = keep('armR', () => (r.chance(0.25) ? bp.armL : r.weighted(armPool)));
    bp.shoulders = keep('shoulders', () => r.weighted({ pauldron: 4, round: 2, launcher: 2, spiked: 1, shield: 3, none: 2 }));
    bp.back = keep('back', () => r.weighted({ missiles: 3, exhaust: 2, antenna: 3, tank: 3, radar: 1, artillery: 2, wings: 1, jetpack: 2, saw: 1, sensor: 2, none: 2 }));
    bp.scheme = keep('scheme', () => r.weighted({ mono: 4, split: 3, inverse: 1 }));
  }

  // ------------------------------------------------------------- build
  function build(bp) {
    const r = new RNG((bp.seed || 1) ^ 0x9e3779b9);
    const root = new MF.Node('root');
    const bulk = bp.bulk || 1, tall = bp.tall || 1, legLen = bp.legLen || 1, armLen = bp.armLen || 1;
    const e = bp.edge == null ? 1.5 : bp.edge;
    const mats = { mono: ['primary', 'primary', 'secondary'], split: ['primary', 'secondary', 'secondary'], inverse: ['secondary', 'secondary', 'primary'] }[bp.scheme || 'split'];
    const k = bp.size || 1;
    // info: the animations this rig supports (see docs/ARCHITECTURE.md, "Animation contract")
    const info = { deaths: [], extras: [], dur: { hit: 0.45, death: 3, reload: 1.3, aim: 1.6, block: 1.1, cast: 1.4 } };
    const ctx = { bp, r, root, bulk, tall, legLen, armLen, e, k, A: mats[0], B: mats[1], T: mats[2], M: 'metal', anims: [], stride: 30, hover: 0, fireDecay: 5, info };
    MF.setBuildScale(k);
    try {
      lineOf(bp).build(ctx);
      addFallbackReactions(ctx, lineOf(bp).group === 'Humans');
    } finally {
      MF.setBuildScale(1);
    }
    ctx.stride *= k; ctx.hover *= k;

    // bounds for shadows / framing
    const prims = MF.updateRig(root, MF.mat(), []);
    let maxY = 0, rad = 0, minY = 1e9;
    for (const p of prims) {
      maxY = Math.max(maxY, p.world[10] + p.brad);
      minY = Math.min(minY, p.world[10] - p.brad);
      rad = Math.max(rad, Math.hypot(p.world[9], p.world[11]) + p.brad * 0.7);
    }
    const nodes = MF.findNodes(root);
    return {
      root, nodes, height: maxY, radius: Math.max(10, rad), stride: ctx.stride, hover: ctx.hover, fireDecay: ctx.fireDecay, info: ctx.info,
      animate(st) {
        root.reset();
        for (const a of ctx.anims) a(st, nodes);
      },
    };
  }

  // Generic hit and death for any rig whose line doesn't provide its own (ctx.info.customHit / info.deaths).
  // Humans bleed and topple; mechs spark, then burn and blow apart. Lines replace these with bespoke versions.
  function addFallbackReactions(ctx, human) {
    const { root, info } = ctx;
    const chestY = 26 * (ctx.tall || 1) + 10;
    // effects hang off the root; the body is every other top-level node, so tip those (not the root)
    const bodyParts = () => root.children.filter((c) => !c.name.startsWith('fx_'));
    const tip = (a, drop) => { for (const c of bodyParts()) { c.rot[0] -= a; c.pos[1] -= drop; } };
    if (!info.customHit) {
      const hfx = human ? MF.FX.hitBlood(root, { name: 'fbHit', origin: [0, chestY * 0.8, 3], dir: [0, 0.3, -1], seed: 3 })
        : MF.FX.hitSparks(root, { name: 'fbHit', origin: [0, chestY, 4], dir: [0, 0.4, 1], seed: 3 });
      ctx.anims.push((st) => {
        if (st.hit == null || st.death != null) return;
        const u = Math.max(0, 1 - st.hit / info.dur.hit);
        tip(0.12 * u * u, 0); // knocked back
        hfx.update(st.hit);
      });
    }
    if (!info.deaths.length) {
      info.deaths.push(human ? 'collapse' : 'explode');
      const dfx = human ? MF.FX.bloodBurst(root, { name: 'fbDie', origin: [0, chestY * 0.7, 0], dir: [0, 0.6, -0.6], seed: 7, poolRadius: 8 })
        : MF.FX.explosion(root, { name: 'fbDie', origin: [0, chestY, 0], seed: 7, scale: 1.2, start: 0.35 });
      ctx.anims.push((st) => {
        if (st.death == null) return;
        const u = Math.min(1, st.death / (human ? 0.7 : 0.9));
        const fall = u * u;
        tip((human ? 1.3 : 0.45) * fall, (human ? 0.45 : 0.15) * chestY * ctx.k * fall); // topple backward
        dfx.update(st.death);
      });
    }
  }

  // =============================================================== modular line: "Military frame" restyle
  // The seven chassis and the swappable torso / head / arm / shoulder / back parts follow the locked mech rules
  // (docs/STYLE.md): tiny recessed heads, faceted wedge armour, a big chest over a narrow mechanical waist,
  // massive thighs over slim shins, hazard stripes, stencil numbers and small orange marks, weapons lowered
  // at rest. The rig also carries its own run, hit, two deaths and the reload / block extras.
  const TAU = PI * 2;
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const clamp01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
  const ramp = (t, a, b) => smooth((t - a) / (b - a));
  const lerp = (a, b, u) => a + (b - a) * u;
  const GLOW = { mat: 'accent', shadow: false };
  const IDENT = MF.mat();
  const RANGED = { cannon: 1, gatling: 1, missiles: 1, flamer: 1, laser: 1, twin: 1 };
  const MELEE = { fist: 'punch', claw: 'punch', drill: 'thrust', hammer: 'slash', blade: 'slash' };
  // idle time that freezes when the unit dies (spinning radars, scanning heads and breathing stop)
  const lifeT = (st) => (st.death != null ? (st.t || 0) - st.death : st.t || 0);
  const alive = (st) => st.death == null;

  // Vertices of a convex prim in its own frame (every triple of planes, kept if inside all the others).
  // Cached; used to rest things exactly on the floor.
  function primVerts(p) {
    if (p._v) return p._v;
    const P = p.planes, n = p.np, out = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let q = j + 1; q < n; q++) {
      const a = i * 4, b = j * 4, c = q * 4;
      const bcx = P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1], bcy = P[b + 2] * P[c] - P[b] * P[c + 2], bcz = P[b] * P[c + 1] - P[b + 1] * P[c];
      const det = P[a] * bcx + P[a + 1] * bcy + P[a + 2] * bcz;
      if (Math.abs(det) < 1e-7) continue;
      const cax = P[c + 1] * P[a + 2] - P[c + 2] * P[a + 1], cay = P[c + 2] * P[a] - P[c] * P[a + 2], caz = P[c] * P[a + 1] - P[c + 1] * P[a];
      const abx = P[a + 1] * P[b + 2] - P[a + 2] * P[b + 1], aby = P[a + 2] * P[b] - P[a] * P[b + 2], abz = P[a] * P[b + 1] - P[a + 1] * P[b];
      const da = P[a + 3], db = P[b + 3], dc = P[c + 3];
      const x = (da * bcx + db * cax + dc * abx) / det, y = (da * bcy + db * cay + dc * aby) / det, z = (da * bcz + db * caz + dc * abz) / det;
      let ok = true;
      for (let m = 0; m < n && ok; m++) if (P[m * 4] * x + P[m * 4 + 1] * y + P[m * 4 + 2] * z > P[m * 4 + 3] + 1e-6) ok = false;
      if (ok) out.push(x, y, z);
    }
    p._v = new Float64Array(out);
    return p._v;
  }
  function primMinY(p) {
    const v = primVerts(p), m = p.world;
    let lo = Infinity;
    for (let i = 0; i < v.length; i += 3) { const y = m[3] * v[i] + m[4] * v[i + 1] + m[5] * v[i + 2] + m[10]; if (y < lo) lo = y; }
    return lo;
  }

  // ------------------------------------------------------------- frames / locomotion
  function setupMod(ctx) {
    const bp = ctx.bp, frame = OPTIONS.frame.includes(bp.frame) ? bp.frame : 'biped';
    ctx.mod = {
      frame,
      legged: frame === 'biped' || frame === 'strider',
      upright: frame === 'biped' || frame === 'strider' || frame === 'hover',
      hard: frame === 'spider' || frame === 'crawler' || frame === 'quadruped' || frame === 'tank',
      wB: 0.8 + 0.2 * (bp.bulk || 1), lL: 0.75 + 0.25 * (bp.legLen || 1), tT: 0.8 + 0.2 * (bp.tall || 1), aL: 0.8 + 0.2 * (bp.armLen || 1),
      MK: ctx.A === 'secondary' ? 'primary' : 'secondary', // stripe / stencil colour that contrasts with the armour
      soles: [], tops: ['pelvis'], spinners: [], reload: [], shields: [], lift: 0, floorY: 0, torsoY: 3,
      armSwing: {},
    };
    return ctx.mod;
  }

  function buildFrame(ctx) {
    if (!ctx.mod) setupMod(ctx);
    switch (ctx.mod.frame) {
      case 'strider': return frameStrider(ctx);
      case 'spider': return frameLegs(ctx, 4);
      case 'crawler': return frameLegs(ctx, 6);
      case 'quadruped': return frameQuad(ctx);
      case 'tank': return frameTank(ctx);
      case 'hover': return frameHover(ctx);
      default: return frameBiped(ctx);
    }
  }

  // Narrow mechanical waist core, faceted crotch plate, rear plate and big side skirts.
  function buildHips(ctx, pelvis, hipX, thW, style) {
    const { A, B, M } = ctx, { wB, MK } = ctx.mod;
    pelvis.box(hipX * 1.45, 5, 8 * wB, { at: [0, 1.5, 0], mat: M, bevel: 1, detail: { type: 'vent', face: 'side', pitch: 1.2, inset: 1 } });
    pelvis.box(5.4 * wB, 6.5, 5.5, { at: [0, -0.5, 3], mat: A, bevel: 0.5, cuts: [[0, -1, 1, 3.2], [1, -1, 0, 2], [-1, -1, 0, 2], [0, 1, 1, 1.2]], detail: { type: 'panel', face: '+z', at: 0, dir: 'v' } });
    pelvis.box(hipX * 1.5, 6, 2.2, { at: [0, -0.2, -4.4 * wB], rot: [-0.2, 0, 0], mat: A, bevel: 0.5, cuts: [[1, -1, 0, 2], [-1, -1, 0, 2]] });
    for (const s of [-1, 1]) {
      pelvis.box(2.4, 11, 11 * wB, { at: [s * (hipX + thW / 2 + 1.5), -2.2, 0], rot: [0, 0, s * 0.3], mat: B, bevel: 0.5, cuts: [[0, -1, 1, 3.6], [0, -1, -1, 2.4], [0, 1, 1, 1.4]], detail: { type: 'band', face: 'side', dir: 'v', at: -2.2, size: 0.8, mat2: MK } });
      if (style === 1) { // front tassets that kick out with the thigh
        const sk = pelvis.child('skF' + s, [s * (hipX * 0.5 + 1), 2.5, 4.4 * wB]);
        sk.box(hipX * 0.72, 7.5, 1.8, { at: [0, -3.8, 0], rot: [-0.15, 0, 0], mat: A, bevel: 0.4, cuts: [[s, -1, 0, 2.2], [-s, -1, 0, 0.8]], detail: { type: 'panel', face: '+z', at: -2, dir: 'h' } });
      }
    }
  }

  // Massive faceted thigh block (the widest part of the leg), tapering toward the knee.
  function thighBox(ctx, hip, s, thW, len, detail) {
    return hip.box(thW, len + 3, thW * 1.05, { at: [s * 0.4, -len * 0.5, 0.3], mat: ctx.A, bevel: 0.7,
      cuts: [[1, 0, 1, 2.4], [-1, 0, 1, 2.4], [1, 0, -1, 2], [-1, 0, -1, 2], [1, -1, 0, thW * 0.3], [-1, -1, 0, thW * 0.3], [0, -1, 1, thW * 0.28], [0, -1, -1, thW * 0.22], [0, 1, 1, 1.6]], detail });
  }

  function frameBiped(ctx) {
    const { root, r, A, B, T, M } = ctx, D = ctx.mod, { wB, lL, MK } = D;
    const thigh = Math.round(17 * lL), shin = Math.round(20 * lL), ankY = 6;
    const thW = 12.5 * wB, legW = 6.3 * wB, hipX = 8.4 * wB;
    const footL = 19.5 * wB, footW = 8.2 * wB, b = 0.2, sp = 0.055;
    const hipY = ankY + (thigh + shin) * Math.cos(b);
    const pelvis = root.child('pelvis', [0, hipY + 1, 0]);
    const skirt = r.int(0, 1), pistons = r.chance(0.6), grille = r.chance(0.55);
    buildHips(ctx, pelvis, hipX, thW, skirt);
    for (const s of [-1, 1]) {
      const hs = pelvis.child('hipS' + s, [s * hipX, -1, 0], [0, 0, s * sp]);
      const hip = hs.child('hip' + s, [0, 0, 0], [-b, 0, 0]);
      hip.cyl('x', 2.8, 5, { mat: M, sides: 8 });
      thighBox(ctx, hip, s, thW, thigh, grille
        ? [{ type: 'vent', face: '+z', pitch: 1.5, inset: 3.4 }, { type: 'number', face: 'side', text: ctx.bp.number, v: thigh * 0.1 }, { type: 'band', face: 'side', dir: 'h', at: -thigh * 0.28, size: 0.8, mat2: MK }]
        : [{ type: 'panel', face: '+z', at: 0, dir: 'v' }, { type: 'number', face: 'side', text: ctx.bp.number, v: thigh * 0.1 }, { type: 'band', face: '+z', dir: 'h', at: thigh * 0.22, size: 0.8, mat2: MK }]);
      const knee = hip.child('knee' + s, [0, -thigh, 0], [2 * b, 0, 0]);
      knee.cyl('x', 2.4, legW * 0.9, { mat: M, sides: 8 });
      knee.box(legW * 1.2, 7, 4.2, { at: [0, 0.6, legW * 0.55 + 1], mat: T, bevel: 0.4, cuts: [[1, 0, 1, 1.8], [-1, 0, 1, 1.8], [0, 1, 1, 2.2], [0, -1, 1, 1.5]] });
      knee.box(legW, shin, legW * 1.15, { at: [0, -shin / 2 - 0.5, 0], mat: B, bevel: 0.6, cuts: [[1, 0, 1, 1.6], [-1, 0, 1, 1.6], [0, 1, -1, 1.8], [1, 0, -1, 1.1], [-1, 0, -1, 1.1]], detail: { type: 'band', dir: 'h', at: shin * 0.18, size: 0.9, mat2: MK } });
      if (pistons) knee.cyl('y', 0.9, shin * 0.55, { at: [0, -shin * 0.45, -legW * 0.64], mat: M, sides: 6 });
      knee.box(legW * 1.25, 4.2, legW * 1.35, { at: [0, -shin + 1.6, 0.3], mat: A, bevel: 0.5, cuts: [[0, 1, 1, 1.6], [1, 1, 0, 1.1], [-1, 1, 0, 1.1]], detail: { type: 'vent', face: '+z', pitch: 1.2, inset: 1.3 } });
      const ank = knee.child('ankle' + s, [0, -shin, 0], [-b, 0, 0]);
      const ft = ank.child('foot' + s, [0, 0, 0], [0, 0, -s * sp]);
      const fz = footL * 0.14;
      D.soles.push(ft.box(footW + 0.4, 1.6, footL, { at: [0, -ankY + 0.8, fz], mat: M, cuts: [[1, 0, 1, footW * 0.3], [-1, 0, 1, footW * 0.3]] }));
      ft.box(footW, 3.8, footL * 0.72, { at: [0, -ankY + 3.3, fz + 0.5], mat: A, bevel: 0.5, cuts: [[1, 0, 1, footW * 0.35], [-1, 0, 1, footW * 0.35], [0, 1, 1, 2.4], [0, 1, -1, 1.3]] });
      ft.box(footW * 0.6, 2.4, 4.2, { at: [0, -ankY + 2.8, fz + footL / 2 - 2.2], mat: 'tertiary', cuts: [[1, 0, 1, 1.5], [-1, 0, 1, 1.5], [0, 1, 1, 1.1]] }); // toe cap
      ft.box(2.2, 2.2, 6, { at: [0, -ankY + 2.1, fz - footL / 2 - 1.5], rot: [-0.2, 0, 0], mat: M, cuts: [[0, 1, -1, 1.5], [1, 0, -1, 0.7], [-1, 0, -1, 0.7]] }); // rear spur
    }
    D.leg = { kind: 'biped', T: thigh, S: shin, dA: (thigh + shin) * Math.cos(b) + ankY * 0.3, hipY };
    addBipedWalk(ctx);
    ctx.gait = 'biped';
    return pelvis;
  }

  // Reverse-joint strider: massive thigh forward-down, slim shin strut back-down, vertical metatarsal, clawed foot.
  function frameStrider(ctx) {
    const { root, r, A, B, T, M } = ctx, D = ctx.mod, { wB, lL, MK } = D;
    const T1 = Math.round(16 * lL), S1 = Math.round(16 * lL), M1 = Math.round(10 * lL), footH = 3;
    const a1 = -0.62, a2 = 1.3, a3 = -(a1 + a2);
    const thW = 12 * wB, legW = 5.6 * wB, hipX = 8.6 * wB, footL = 17 * wB, footW = 8 * wB, sp = 0.05;
    const hipY = footH + T1 * Math.cos(a1) + S1 * Math.cos(a1 + a2) + M1;
    const pelvis = root.child('pelvis', [0, hipY + 1, 0]);
    buildHips(ctx, pelvis, hipX, thW, r.int(0, 1));
    for (const s of [-1, 1]) {
      const hs = pelvis.child('hipS' + s, [s * hipX, -1, 0], [0, 0, s * sp]);
      const hip = hs.child('hip' + s, [0, 0, 0], [a1, 0, 0]);
      hip.cyl('x', 3, 5, { mat: M, sides: 8 });
      thighBox(ctx, hip, s, thW, T1, [{ type: 'vent', face: '-z', pitch: 1.5, inset: 3 }, { type: 'number', face: 'side', text: ctx.bp.number, v: T1 * 0.1 }, { type: 'band', face: 'side', dir: 'h', at: -T1 * 0.28, size: 0.8, mat2: MK }]);
      hip.cyl('y', 0.9, T1 * 0.7, { at: [0, -T1 * 0.5, -thW * 0.62], mat: M, sides: 6 }); // hydraulic ram
      const knee = hip.child('knee' + s, [0, -T1, 0], [a2, 0, 0]);
      knee.cyl('x', 2.8, legW + 1.6, { mat: M, sides: 8 });
      knee.box(legW * 1.25, 6, 4, { at: [0, 1, legW * 0.5 + 1.4], mat: T, bevel: 0.4, cuts: [[1, 0, 1, 1.6], [-1, 0, 1, 1.6], [0, 1, 1, 2], [0, -1, 1, 1.4]] });
      knee.box(legW, S1, legW * 1.1, { at: [0, -S1 / 2, 0], mat: B, bevel: 0.5, cuts: [[1, 0, 1, 1.4], [-1, 0, 1, 1.4], [1, 0, -1, 1], [-1, 0, -1, 1]], detail: { type: 'band', dir: 'h', at: S1 * 0.2, size: 0.9, mat2: MK } });
      const ank = knee.child('ankle' + s, [0, -S1, 0], [a3, 0, 0]);
      ank.cyl('x', 2.3, legW + 1.2, { mat: M, sides: 8 });
      ank.box(legW * 0.8, M1 + 1, legW * 0.85, { at: [0, -M1 / 2, 0], mat: M, bevel: 0.4, detail: { type: 'stripe', face: 'side', width: 1.4, mat2: 'accent' } });
      ank.box(legW * 1.15, M1 * 0.62, 2, { at: [0, -M1 * 0.42, legW * 0.45 + 0.8], mat: A, bevel: 0.3, cuts: [[0, 1, 1, 1], [1, 0, 1, 0.8], [-1, 0, 1, 0.8]] });
      const ft = ank.child('foot' + s, [0, -M1, 0], [0, 0, -s * sp]);
      const fz = footL * 0.2;
      D.soles.push(ft.box(footW, 1.6, footL, { at: [0, -footH + 0.8, fz], mat: M, cuts: [[1, 0, 1, footW * 0.4], [-1, 0, 1, footW * 0.4]] }));
      ft.box(footW * 0.8, 3, footL * 0.55, { at: [0, -footH + 2.8, fz + 1.2], mat: A, bevel: 0.4, cuts: [[1, 0, 1, footW * 0.3], [-1, 0, 1, footW * 0.3], [0, 1, 1, 2], [0, 1, -1, 1.2]] });
      for (const x of [-1, 1]) ft.box(1.8, 2, 4.5, { at: [x * footW * 0.3, -footH + 1.6, fz + footL / 2], rot: [0, x * 0.25, 0], mat: 'tertiary', cuts: [[0, 1, 1, 1.2], [0, -1, 1, 0.5]] }); // toe claws
      ft.box(2, 2, 5.5, { at: [0, -footH + 1.6, fz - footL / 2 - 1.2], rot: [-0.25, 0, 0], mat: M, cuts: [[0, 1, -1, 1.3]] }); // rear spur
    }
    const vz = T1 * Math.sin(-a1) - S1 * Math.sin(a1 + a2), vy = T1 * Math.cos(a1) + S1 * Math.cos(a1 + a2);
    D.leg = { kind: 'strider', T: T1, S: S1, dA: Math.hypot(vz, vy) + M1 * 0.5, hipY };
    addBipedWalk(ctx);
    ctx.gait = 'biped';
    return pelvis;
  }

  // Walk and run for both two-legged chassis: heel strike, passing pose and push-off with a knee lift; the run
  // is a lower, heavier gait (deeper stomp, crouched knees, torso leaning into it, bigger arm swing).
  function addBipedWalk(ctx) {
    const D = ctx.mod, L = D.leg, k = ctx.k, strider = L.kind === 'strider';
    const Aw = strider ? 0.36 : 0.4;
    ctx.stride = 4 * L.dA * Math.sin(Aw);
    ctx.anims.push((st, n) => {
      const m = st.move || 0, ph = st.phase || 0, run = Math.min(1, st.run || 0) * m;
      const A2 = Aw * (1 + 0.1 * run);
      const drop = L.dA * (1 - Math.cos(A2 * m * Math.sin(ph)));
      const stomp = m * (1 + 1.5 * run) * Math.pow(Math.max(0, -Math.cos(2 * ph)), 6); // heavy footfall dip
      n.pelvis.pos[1] -= (drop + stomp + 1.2 * run) * k;
      n.pelvis.rot[1] += Math.sin(ph) * 0.08 * m;
      for (const s of [-1, 1]) {
        const p = s < 0 ? ph : ph + PI;
        const hip = -A2 * Math.sin(p) * m - 0.12 * run;
        const lift = Math.max(0, Math.cos(p)) * m;
        if (strider) {
          const dh = hip - lift * 0.35, dk = lift * (0.55 + 0.3 * run) + 0.18 * run;
          n['hip' + s].rot[0] += dh; n['knee' + s].rot[0] += dk; n['ankle' + s].rot[0] += -(dh + dk) + lift * 0.25;
          n['foot' + s].rot[0] += lift * 0.3;
        } else {
          const knee = lift * (1.05 + 0.45 * run) + 0.24 * run;
          n['hip' + s].rot[0] += hip; n['knee' + s].rot[0] += knee; n['ankle' + s].rot[0] += -(hip + knee) * 0.92;
        }
        if (n['skF' + s]) n['skF' + s].rot[0] += Math.min(0, hip - lift * 0.4) * 0.8;
      }
      n.torso.rot[1] += -Math.sin(ph) * 0.14 * m;
      n.torso.rot[0] += 0.03 * m + 0.09 * run + stomp * 0.03;
      n.torso.rot[2] += Math.sin(ph) * 0.03 * m;
    });
  }

  // Quad spider (4) and hex crawler (6): splayed legs with wedge femurs, round knee joints and spiked feet.
  function frameLegs(ctx, count) {
    const { root, A, B, T, M } = ctx, D = ctx.mod, { wB, lL, MK } = D, hex = count === 6;
    const H = Math.round((hex ? 12 : 15) + 5 * lL);
    const hubR = (hex ? 10 : 10.5) * wB;
    const hub = root.child('pelvis', [0, H, 0]);
    if (hex) hub.box(hubR * 1.7, 5, hubR * 2.7, { at: [0, -0.5, 0], mat: M, bevel: 1, cuts: MF.chamfer('vert', hubR * 0.45), detail: { type: 'vent', face: 'side', pitch: 1.5, inset: 1.2 } });
    else hub.cyl('y', hubR * 0.92, 5, { at: [0, -0.5, 0], mat: M, sides: 8, twist: PI / 8, detail: { type: 'vent', face: 'any', pitch: 1.5, inset: 1.2 } });
    hub.box(hubR * (hex ? 1.3 : 1.25), 3, hubR * (hex ? 2.1 : 1.25), { at: [0, -4, 0], mat: A, bevel: 0.6, cuts: MF.chamfer('vert', hubR * 0.3), detail: { type: 'stripe', face: 'notTop', width: 1.5, mat2: 'accent' } });
    const F = Math.round((hex ? 10 : 13) * lL + 3), alpha = hex ? 0.55 : 0.62, beta = hex ? 0.3 : 0.36;
    const kneeY = H + 1 + F * Math.sin(alpha);
    const Tb = kneeY / Math.cos(beta);
    const angles = hex ? [0.75, -0.75, PI / 2, -PI / 2, 2.4, -2.4] : [PI / 4, -PI / 4, (3 * PI) / 4, (-3 * PI) / 4];
    const groups = hex ? [0, 1, 1, 0, 0, 1] : [0, 1, 1, 0];
    const legs = [];
    angles.forEach((a, i) => {
      const side = Math.sign(Math.sin(a)) || 1;
      const rz = hex ? hubR * 1.15 : hubR * 0.8;
      const rootN = hub.child('leg' + i, [Math.sin(a) * hubR * 0.8, 0, Math.cos(a) * rz], [0, a - PI / 2, 0]);
      const coxa = rootN.child('coxa' + i);
      coxa.cyl('y', 2.6, 5, { mat: M, sides: 6 });
      const fem = coxa.child('femur' + i, [1, 1, 0], [0, 0, alpha]);
      fem.box(F + 2.5, hex ? 6 : 7, (hex ? 5.6 : 6.6) * wB, { at: [F / 2, 0, 0], mat: A, bevel: 0.5, cuts: [[0, 1, 1, 1.8], [0, 1, -1, 1.8], [1, 1, 0, 2.2], [0, -1, 1, 1.2], [0, -1, -1, 1.2], [-1, -1, 0, 1.5]],
        detail: [{ type: 'panel', face: '+y', at: 0, dir: 'v' }, i === 0 || i === (hex ? 1 : 1) ? { type: 'number', face: '+z', text: ctx.bp.number, u: 0, v: 0 } : { type: 'band', face: 'notTop', dir: 'v', at: F * 0.15, size: 0.8, mat2: MK }] });
      if (!hex) fem.cyl('x', 0.8, F * 0.6, { at: [F * 0.5, -3.4, 0], mat: M, sides: 6 }); // hydraulic ram
      const knee = fem.child('knee' + i, [F, 0, 0], [0, 0, beta - alpha]);
      knee.cyl('z', hex ? 2.9 : 4, (hex ? 5.6 : 6.6) * wB + 2, { mat: M, sides: 10 }); // round knee joint
      if (!hex) knee.cyl('z', 2.3, 6.6 * wB + 3.2, { mat: T, sides: 10 });
      knee.box(hex ? 5.2 : 6, Tb * 0.6, (hex ? 5 : 5.8) * wB, { at: [0.6, -Tb * 0.33, 0], mat: B, bevel: 0.5, cuts: [[1, -1, 0, 1.6], [-1, -1, 0, 1.2], [1, 0, 1, 1], [1, 0, -1, 1], [1, 1, 0, 1.2]], detail: { type: 'band', dir: 'h', at: Tb * 0.12, size: 0.8, mat2: MK } });
      knee.cyl('y', 1.2, Tb * 0.42, { at: [0, -Tb * 0.76, 0], mat: M, sides: 6 });
      D.soles.push(knee.cone('y', 0.9, 2.3, 4, { at: [0, -Tb + 2, 0], mat: M, sides: 6 }));
      legs.push({ i, side, g: groups[i] });
    });
    const reach = F * Math.cos(alpha) + Tb * Math.sin(beta) + hubR * 0.8;
    const sweep = 0.3;
    ctx.stride = 4 * reach * Math.sin(sweep);
    const k = ctx.k;
    ctx.anims.push((st, n) => {
      const m = st.move || 0, run = Math.min(1, st.run || 0) * m;
      n.pelvis.pos[1] += Math.sin((st.phase || 0) * 2) * (0.5 + 0.7 * run) * m * k;
      n.pelvis.rot[0] += 0.05 * run;
      for (const L of legs) {
        const p = (st.phase || 0) + L.g * PI;
        const lift = Math.max(0, Math.sin(p)) * m;
        n['coxa' + L.i].rot[1] = L.side * sweep * Math.cos(p) * m;
        n['femur' + L.i].rot[2] += lift * (0.35 + 0.3 * run);
        n['knee' + L.i].rot[2] -= lift * (0.2 + 0.12 * run);
      }
    });
    D.legs = legs; D.hub = { H, hubR, F, Tb, count };
    D.torsoY = 2.5;
    ctx.gait = 'legs';
    return hub;
  }

  // Four legs under a long faceted chassis (mammal walker). Front legs: elbow back, forearm down-forward.
  // Hind legs: massive thigh, Z-shaped (stifle forward, hock back). Diagonal pairs trot; the run is a bound.
  function frameQuad(ctx) {
    const { root, A, B, T, M } = ctx, D = ctx.mod, { wB, lL, MK } = D;
    const legW = 4.6 * wB, thW = 8.5 * wB;
    const bodyW = Math.round(12 * wB + 3), bodyL = Math.round(30 * wB + 6);
    const footH = 2.5;
    const T1 = Math.round(10 * lL + 4), S1 = Math.round(T1 * 0.95), M1 = Math.round(5 * lL + 3);
    const hA = [-0.5, 1.15, -0.65];
    const H = footH + T1 * Math.cos(hA[0]) + S1 * Math.cos(hA[0] + hA[1]) + M1 * Math.cos(hA[0] + hA[1] + hA[2]);
    const fA = [0.4, -0.65, 0.25], F3 = 3;
    const F12 = (H - footH - F3 * Math.cos(fA[0] + fA[1] + fA[2])) / (Math.cos(fA[0]) + Math.cos(fA[0] + fA[1]));
    const hub = root.child('pelvis', [0, H + 1, 0]);
    hub.box(bodyW, 6.5, bodyL, { at: [0, -1.5, 0], mat: M, bevel: 1.2, cuts: [[0, -1, 1, 3], [0, -1, -1, 2]], detail: { type: 'vent', face: 'side', pitch: 1.6, inset: 2 } });
    hub.box(bodyW + 3, 3.5, bodyL * 0.84, { at: [0, 2, -1], mat: A, bevel: 0.6, cuts: [[0, 1, 1, 2.4], [0, 1, -1, 1.6], [1, 1, 0, 1.6], [-1, 1, 0, 1.6]], detail: [{ type: 'panel', face: '+y', at: bodyL * 0.15, dir: 'h' }, { type: 'number', face: 'side', text: ctx.bp.number, u: -bodyL * 0.22, v: 0 }] });
    hub.box(bodyW + 1, 6, 4, { at: [0, -0.5, bodyL / 2 + 1], mat: T, bevel: 0.4, cuts: [[0, -1, 1, 2.4], [1, 0, 1, 1.4], [-1, 0, 1, 1.4], [0, 1, 1, 1]], detail: [{ type: 'light', face: '+z', pts: [[-bodyW * 0.28, 1], [bodyW * 0.28, 1]], size: 0.6 }, { type: 'stripe', face: '+z', width: 1.5, mat2: 'accent', band: -1.6, bandH: 1 }] });
    hub.box(bodyW * 0.8, 4, 3, { at: [0, -0.5, -bodyL / 2 - 1], mat: B, bevel: 0.4, detail: { type: 'vent', face: '-z', pitch: 1.3, inset: 0.8 } });
    const legs = [];
    const hipX = bodyW / 2 + legW / 2 + 0.8;
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([s, f], i) => {
      const front = f > 0, ang = front ? fA : hA, L = front ? [F12, F12, F3] : [T1, S1, M1];
      const z = f * (bodyL / 2 - (front ? legW * 1.2 : thW * 0.7));
      const hip = hub.child('qhip' + i, [s * (front ? hipX : hipX + 1.2), -1, z], [ang[0], 0, 0]);
      hip.cyl('x', 3, legW + 3, { mat: M, sides: 8 });
      if (front) {
        hip.box(legW + 1.5, L[0] + 2, legW + 2, { at: [0, -L[0] / 2, 0], mat: B, bevel: 0.5, cuts: [[1, 0, 1, 1.2], [-1, 0, 1, 1.2], [0, -1, -1, 1.5]], detail: { type: 'band', dir: 'h', at: L[0] * 0.2, size: 0.8, mat2: MK } });
        hip.box(legW + 2.2, L[0] * 0.5, 2, { at: [0, -L[0] * 0.28, legW / 2 + 1.4], mat: A, bevel: 0.4, cuts: [[0, 1, 1, 1], [1, 0, 1, 0.8], [-1, 0, 1, 0.8]] });
      } else {
        thighBox(ctx, hip, s, thW, L[0], [{ type: 'vent', face: 'side', pitch: 1.5, inset: 2.6 }, { type: 'band', face: '+z', dir: 'h', at: 0, size: 0.8, mat2: MK }]);
      }
      const knee = hip.child('qknee' + i, [0, -L[0], 0], [ang[1], 0, 0]);
      knee.cyl('x', 2.3, legW + 1.6, { mat: M, sides: 8 });
      knee.box(legW * 0.9, L[1], legW * 0.9, { at: [0, -L[1] / 2, 0], mat: front ? M : B, bevel: 0.4, cuts: [[1, 0, 1, 1], [-1, 0, 1, 1]] });
      knee.cyl('y', 0.8, L[1] * 0.62, { at: [0, -L[1] * 0.5, (front ? -1 : 1) * (legW / 2 + 1)], mat: M, sides: 6 });
      const ank = knee.child('qank' + i, [0, -L[1], 0], [ang[2], 0, 0]);
      ank.box(legW * 0.9, L[2] + 1, legW, { at: [0, -L[2] / 2, 0], mat: front ? M : A, bevel: 0.4 });
      const foot = ank.child('qfoot' + i, [0, -L[2], 0], [-(ang[0] + ang[1] + ang[2]), 0, 0]);
      D.soles.push(foot.box(legW + 2.5, footH, legW + 5.5, { at: [0, -footH / 2, 1.2], mat: M, bevel: 0.4, bevelSet: 'top', cuts: [[0, 1, 1, 1.4], [1, 0, 1, 1.2], [-1, 0, 1, 1.2]] }));
      foot.box(legW * 0.9, 1.6, 2.2, { at: [0, -0.8, legW / 2 + 3.4], mat: 'tertiary', cuts: [[0, 1, 1, 0.9]] });
      legs.push({ i, s, front, g: i === 0 || i === 3 ? 0 : 1 });
    });
    const Aw = 0.3, k = ctx.k;
    ctx.stride = 4 * H * Math.sin(Aw) * 0.85;
    ctx.anims.push((st, n) => {
      const m = st.move || 0, ph = st.phase || 0, run = Math.min(1, st.run || 0) * m;
      n.pelvis.pos[1] -= (H * (1 - Math.cos(Aw * m * Math.sin(ph))) * 0.85 + run * 1.5 * Math.abs(Math.sin(ph))) * k;
      n.pelvis.rot[0] += Math.sin(ph * 2) * 0.025 * m * (1 - run) + Math.sin(ph) * 0.08 * run;
      n.pelvis.rot[2] += Math.sin(ph) * 0.03 * m * (1 - run);
      for (const L of legs) {
        // trot (diagonal pairs) blends into a bound (front pair, then hind pair) as the run comes in
        const p = ph + L.g * PI * (1 - run) + (L.front ? 0 : PI * 0.8) * run;
        const hip = -Aw * (1 + 0.15 * run) * Math.sin(p) * m;
        const lift = Math.max(0, Math.cos(p)) * m * (1 + 0.4 * run);
        let dh, dk, da;
        if (L.front) { dh = hip - lift * 0.1; dk = -lift * 0.75; da = lift * 0.7; }
        else { dh = hip - lift * 0.3; dk = lift * 0.6; da = -lift * 0.45; }
        n['qhip' + L.i].rot[0] += dh; n['qknee' + L.i].rot[0] += dk; n['qank' + L.i].rot[0] += da;
        n['qfoot' + L.i].rot[0] -= dh + dk + da;
      }
    });
    D.legs = legs; D.quad = { H, bodyL, bodyW };
    D.torsoY = 3.5;
    ctx.gait = 'legs';
    return hub;
  }

  // Treads with faceted track guards, a sloped glacis hull and an engine deck; the torso is the turret.
  function frameTank(ctx) {
    const { root, A, B, T, M } = ctx, D = ctx.mod, { wB, lL, MK } = D;
    const tw = 7 * wB, th = Math.round(9 + 2 * lL), tl = Math.round(34 * wB), gap = 8.5 * wB;
    const hub = root.child('pelvis', [0, th + 1, 0]);
    for (const s of [-1, 1]) {
      const tr = root.child('tread' + s, [s * (gap + tw / 2), th / 2, 0]);
      D.soles.push(tr.box(tw, th, tl, { mat: M, cuts: MF.chamfer('ends', th * 0.45), detail: [{ type: 'tread', face: '+y', axis: 'v', dirSign: 1 }, { type: 'tread', face: '+z', axis: 'v' }, { type: 'tread', face: '-z', axis: 'v' }, { type: 'tread', face: '-y', axis: 'v' }] }));
      for (let q = 0; q < 3; q++) tr.cyl('x', 2.5, 1.2, { mat: M, at: [s * (tw / 2 + 0.3), -0.6, (q - 1) * tl * 0.3], sides: 8 });
      // track guard: faceted skirt plate over the top and outer side, hazard band and a stencil
      tr.box(tw + 2.4, th * 0.62, tl - th * 0.5, { at: [s * 0.9, th * 0.26, 0], mat: A, bevel: 0.5, cuts: [[0, 1, 1, 2.6], [0, 1, -1, 2], [s, 1, 0, 1.4], [0, -1, 1, 1.8], [0, -1, -1, 1.8]],
        detail: [{ type: 'number', face: 'side', text: ctx.bp.number, u: -tl * 0.2, v: 0.3 }, { type: 'band', face: 'side', dir: 'v', at: tl * 0.12, size: 0.9, mat2: MK }, { type: 'panel', face: '+y', at: tl * 0.18, dir: 'h' }] });
      tr.box(tw + 1, 2, 3.5, { at: [0, th * 0.62, tl / 2 - th * 0.25], rot: [-0.5, 0, 0], mat: B, bevel: 0.3, detail: { type: 'stripe', face: 'any', width: 1.2, mat2: 'accent' } }); // mudguard
    }
    hub.box(gap * 2, th - 1, tl * 0.84, { at: [0, -th / 2, 0], mat: M, bevel: 1 });
    hub.box(gap * 2 + 2, 4, tl * 0.8, { at: [0, 0.5, 0], mat: A, bevel: 0.6, cuts: [[0, 1, 1, 3.2], [0, -1, 1, 2], [0, 1, -1, 1.5]], detail: [{ type: 'vent', face: '+y', pitch: 2, inset: 3 }, { type: 'light', face: '+z', pts: [[-gap * 0.7, 0], [gap * 0.7, 0]], size: 0.6 }] });
    hub.box(gap * 1.2, 2.4, 6, { at: [0, 2.6, -tl * 0.33], mat: B, bevel: 0.4, detail: { type: 'vent', face: '+y', pitch: 1.2, inset: 0.6 } }); // engine deck
    D.tops = ['pelvis', 'tread-1', 'tread1'];
    D.tank = { th, tl, gap, tw };
    D.torsoY = 2.6;
    ctx.stride = 40;
    const k = ctx.k;
    ctx.anims.push((st, n) => {
      const m = st.move || 0, run = Math.min(1, st.run || 0) * m;
      n.pelvis.pos[1] += Math.sin((st.t || 0) * 30) * (0.25 + 0.3 * run) * m * k;
      n.pelvis.rot[0] += -0.03 * m - 0.04 * run;
    });
    ctx.gait = 'tread';
    return hub;
  }

  // Faceted hexagonal hover hull with an armour ring, side fins and four glowing thrusters.
  function frameHover(ctx) {
    const { root, A, B, M } = ctx, D = ctx.mod, { wB, lL, MK } = D;
    const R = 13 * wB, lift = Math.round(5 + 3 * lL);
    const hub = root.child('pelvis', [0, 10, 0]);
    hub.cone('y', R * 0.78, R, 5, { at: [0, -2.5, 0], mat: A, sides: 6, twist: PI / 6, detail: [{ type: 'stripe', face: 'notTop', width: 1.5, mat2: 'accent' }] });
    hub.cone('y', R, R * 0.72, 3, { at: [0, 1.5, 0], mat: B, sides: 6, twist: PI / 6, detail: { type: 'panel', face: 'notTop', at: 0, dir: 'h' } });
    hub.cone('y', R * 0.55, R * 0.78, 3, { at: [0, -6.5, 0], mat: M, sides: 6, twist: PI / 6, detail: { type: 'vent', face: 'any', pitch: 1.2, inset: 0.8 } });
    for (const s of [-1, 1]) hub.box(1.8, 5, 9, { at: [s * (R + 0.6), 1, -2], rot: [0.2, 0, s * 0.35], mat: A, cuts: [[0, 1, -1, 3], [0, -1, 1, 1.5]], detail: { type: 'band', face: 'side', dir: 'v', at: -1, size: 0.8, mat2: MK } });
    const jets = hub.child('jets');
    for (let q = 0; q < 4; q++) {
      const a = PI / 4 + (q * PI) / 2, x = Math.sin(a) * R * 0.55, z = Math.cos(a) * R * 0.55;
      hub.cone('y', 1.5, 2.6, 3, { mat: M, sides: 6, at: [x, -8, z] });
      jets.cone('y', 0.5, 1.9, 1.6, { ...GLOW, sides: 6, at: [x, -9.9, z] });
    }
    D.soles.push(hub.prims[2]);
    D.lift = lift;
    ctx.hover = lift;
    ctx.stride = 60;
    D.torsoY = 3;
    const k = ctx.k;
    ctx.anims.push((st, n) => {
      const m = st.move || 0, run = Math.min(1, st.run || 0) * m, t = lifeT(st);
      if (alive(st)) n.pelvis.pos[1] += Math.sin(t * 3) * 1.1 * k;
      n.pelvis.rot[0] += 0.15 * m + 0.13 * run;
      n.pelvis.rot[2] += Math.sin(t * 1.7) * 0.03 * (alive(st) ? 1 : 0);
      n.jets.pos[1] -= (0.4 * m + 0.8 * run) * k;
    });
    ctx.gait = 'hover';
    return hub;
  }

  // ------------------------------------------------------------- torso
  // Upright chassis (biped, strider, hover): a big faceted chest over a narrow mechanical waist.
  // Walker / tank chassis: the same chest shapes sit on a turret ring as the turret body.
  function buildTorso(ctx, hub) {
    const { bp, r, A, B, T, M } = ctx, D = ctx.mod || setupMod(ctx), { wB, tT, MK } = D;
    const up = D.upright, spider = D.frame === 'spider' || D.frame === 'crawler';
    const kind = OPTIONS.torso.includes(bp.torso) ? bp.torso : 'block';
    const torso = hub.child('torso', [0, D.torsoY, D.frame === 'quadruped' ? D.quad.bodyL * 0.08 : 0], [up ? 0.04 : 0, 0, 0]);
    let W = up ? 25 * wB : 21 * wB, H = up ? 16 * tT : 11 * tT, Dp = up ? 17 * wB : 18 * wB;
    if (!up && kind === 'core') { W = (spider ? 30 : 23) * wB; H = (spider ? 17 : 12) * tT; Dp = (spider ? 27 : 20) * wB; }
    if (D.frame === 'tank') { W *= 0.84; Dp *= 0.84; }
    let base;
    if (up) {
      base = 7; // mechanical waist
      torso.box(W * 0.34, base + 0.5, Dp * 0.5, { at: [0, base / 2, 0], mat: M, bevel: 0.8, detail: [{ type: 'vent', face: '+z', pitch: 1.2, inset: 1 }, { type: 'vent', face: 'side', pitch: 1.2, inset: 1 }] });
    } else {
      base = 2.6; // turret ring
      torso.cyl('y', Math.min(W, Dp) * 0.36, 3, { at: [0, 1.3, 0], mat: M, sides: 8, twist: PI / 8, detail: { type: 'bolts', face: 'any', inset: 1 } });
    }
    const cy = base - 0.5 + H / 2, top = base - 0.5 + H;
    const num = (o) => Object.assign({ type: 'number', face: 'side', text: bp.number, v: -H * 0.12 }, o);
    const out = { node: torso, W, D: Dp, Ht: H, chestY: cy, topY: top, frontZ: Dp / 2, shX: W / 2 + 1.6, shY: up ? top - 4.2 : cy, backY: cy + 1, backZ: -Dp / 2 - 0.6, neck: [0, top - 3.6, Dp * 0.1], lean: up ? 0.04 : 0 };
    const frontPlate = (y, w, h, mat) => {
      torso.box(w, h, 2, { at: [0, y, Dp / 2 - 0.3], rot: [0.12, 0, 0], mat: mat || T, bevel: 0.4, cuts: [[1, -1, 0, 2], [-1, -1, 0, 2]], detail: { type: 'panel', face: '+z', at: 0, dir: 'v' } });
      torso.box(3.6, 3.6, 1, { at: [w * 0.25, y + 0.2, Dp / 2 + 1], rot: [0.12, 0, PI / 4], mat: 'tertiary' }); // emblem
      torso.box(1.6, 1.4, 1, { ...GLOW, at: [-w * 0.3, y - h * 0.2, Dp / 2 + 0.9] }); // small orange mark
    };
    switch (kind) {
      case 'wedge': { // sloped carapace; the head hides under a hood plate
        torso.box(W, H, Dp, { at: [0, cy, 0], mat: A, bevel: 0.8,
          cuts: [[0, 1, 1, H * 0.5], [0, -1, 1, H * 0.26], [1, -1, 0, W * 0.24], [-1, -1, 0, W * 0.24], [1, 0, 1, 3.6], [-1, 0, 1, 3.6], [1, 1, 0, 2.6], [-1, 1, 0, 2.6], [0, -1, -1, H * 0.2]],
          detail: [{ type: 'panel', face: 'side', at: H * 0.2, dir: 'h' }, { type: 'vent', face: '-z', pitch: 1.4, inset: 3 }, num()] });
        frontPlate(cy - H * 0.12, W * 0.5, H * 0.34);
        torso.box(W * 0.46, 3, Dp * 0.52, { at: [0, top + 2.4, Dp * 0.24], rot: [0.3, 0, 0], mat: A, bevel: 0.4, cuts: [[1, 0, 1, 2.4], [-1, 0, 1, 2.4], [0, -1, 1, 1.2]], detail: { type: 'panel', face: '+y', at: 0, dir: 'v' } }); // hood
        torso.box(W * 0.58, 3, Dp * 0.5, { at: [0, top - 0.8, -Dp * 0.18], mat: M, bevel: 0.6 });
        out.neck = [0, top - 5, Dp * 0.27]; out.hood = true;
        break;
      }
      case 'barrel': { // hexagonal barrel chest, widest at the shoulders
        const R = W * 0.47;
        torso.cone('y', R * 0.66, R, H, { at: [0, cy, 0], mat: A, sides: 6, detail: [{ type: 'band', at: H * 0.2, size: 0.9, mat2: MK }, num({ v: -H * 0.18 })] });
        torso.cone('y', R, R * 0.72, 3, { at: [0, top + 1.2, -0.5], mat: B, sides: 6, detail: { type: 'bolts', face: 'any', inset: 1 } });
        frontPlate(cy - H * 0.08, W * 0.42, H * 0.36);
        out.neck = [0, top - 1.8, 1]; out.shX = R + 1.4; out.W = R * 2; out.D = R * 2; out.frontZ = R * 0.9; out.backZ = -R - 0.4;
        break;
      }
      case 'hunch': { // hump carapace behind a sunk head; the spine stays upright
        torso.box(W * 0.94, H * 0.86, Dp, { at: [0, cy - H * 0.07, 0.5], mat: A, bevel: 0.8,
          cuts: [[0, 1, 1, H * 0.3], [0, -1, 1, H * 0.24], [1, -1, 0, W * 0.22], [-1, -1, 0, W * 0.22], [1, 0, 1, 3.2], [-1, 0, 1, 3.2]], detail: [{ type: 'panel', face: 'side', at: 0, dir: 'h' }, num()] });
        torso.box(W * 0.78, H * 0.62, Dp * 0.72, { at: [0, top + 0.6, -Dp * 0.24], rot: [-0.22, 0, 0], mat: B, bevel: 0.6,
          cuts: [[0, 1, 1, H * 0.3], [1, 1, 0, 2.6], [-1, 1, 0, 2.6], [0, 1, -1, 2]], detail: [{ type: 'vent', face: '-z', pitch: 1.4, inset: 2 }, { type: 'band', face: 'side', dir: 'h', at: 0, size: 0.8, mat2: MK }] });
        frontPlate(cy - H * 0.16, W * 0.46, H * 0.3);
        out.neck = [0, top - 5.2, Dp * 0.3]; out.backY = cy + 3; out.backZ = -Dp * 0.55;
        break;
      }
      case 'core': { // armoured turret core: octagonal in plan, side lens, big stencil number
        torso.box(W, H, Dp, { at: [0, cy, 0], mat: A, bevel: 0.7,
          cuts: [[1, 0, 1, W * 0.17], [-1, 0, 1, W * 0.17], [1, 0, -1, W * 0.13], [-1, 0, -1, W * 0.13], [0, 1, 1, H * 0.34], [0, 1, -1, 2.2], [1, 1, 0, 2.2], [-1, 1, 0, 2.2], [0, -1, 1, 2], [1, -1, 0, 1.6], [-1, -1, 0, 1.6]],
          detail: [{ type: 'number', face: '-x', text: spider ? '318' : bp.number, u: up ? 0 : Dp * 0.22, v: up ? -H * 0.05 : H * 0.08, scale: up ? 1 : 1.4 }, { type: 'band', face: 'notTop', dir: 'h', at: -H * 0.3, size: 0.8, mat2: MK }, { type: 'panel', face: '+y', at: -Dp * 0.1, dir: 'h' }] });
        // side lens: housing, ring and glass on the +x flank (behind the weapon mount on walkers)
        const lz = up ? Dp * 0.08 : -Dp * 0.2, ly = cy + H * (up ? 0.06 : 0.12);
        torso.box(3, H * 0.5, Dp * 0.3, { at: [W / 2 - 0.2, ly, lz], mat: M, bevel: 0.4 });
        torso.cyl('x', 3.1, 1.6, { at: [W / 2 + 1.2, ly, lz], mat: T, sides: 10 });
        torso.cyl('x', 2, 1.4, { at: [W / 2 + 1.8, ly, lz], mat: 'glass', sides: 10, shadow: false });
        if (!up) out.mountZ = Dp * 0.2;
        // front face plate with a vent and hazard stripes along the chin
        torso.box(W * 0.46, H * 0.44, 2.2, { at: [-W * 0.08, cy - H * 0.08, Dp / 2 - 0.2], mat: T, bevel: 0.4, cuts: [[0, 1, 1, 1]], detail: { type: 'vent', face: '+z', pitch: 1.3, inset: 1 } });
        torso.box(W * 0.66, 2, 1.6, { at: [0, base + 1.2, Dp / 2 - 1.3], mat: M, detail: { type: 'stripe', face: '+z', width: 1.5, mat2: 'accent' } });
        torso.box(1.6, 1.4, 1, { ...GLOW, at: [W * 0.3, cy + H * 0.18, Dp / 2 - W * 0.1 + 0.6] });
        out.neck = [0, top - 2, Dp * 0.12]; out.frontZ = Dp / 2;
        if (!up) out.shY = cy - H * 0.05;
        break;
      }
      case 'cockpit': { // hull with a glass canopy strip on the sloped glacis
        const Hh = H * 0.9, c = Math.min(Hh, Dp) * 0.55, cyh = base - 0.5 + Hh / 2;
        torso.box(W, Hh, Dp * 1.12, { at: [0, cyh, 0], mat: A, bevel: 0.7, cuts: [[0, 1, 1, c], [0, 1, -1, 2.4], [1, 0, 1, 2.6], [-1, 0, 1, 2.6], [1, -1, 0, up ? W * 0.18 : 1.5], [-1, -1, 0, up ? W * 0.18 : 1.5], [0, -1, 1, up ? Hh * 0.22 : 1.5]], detail: [num({ u: -Dp * 0.12, v: -Hh * 0.1 }), { type: 'panel', face: '+y', at: -Dp * 0.2, dir: 'h' }] });
        const hz = Dp * 0.56, hy = Hh / 2;
        torso.box(W * 0.46, 1.3, c * 1.41 * 0.3, { at: [0, cyh + hy - c * 0.4 + 0.3, hz - c * 0.6 + 0.3], rot: [PI / 4, 0, 0], mat: 'glass', bevel: 0.3 });
        torso.box(W * 0.74, 1.6, 2.2, { at: [0, cyh + hy - 0.2, hz - c - 0.6], mat: T, bevel: 0.4, cuts: [[0, 1, 1, 0.8]] }); // canopy brow
        for (const s of [-1, 1]) torso.box(2.4, Hh * 0.55, Dp * 0.7, { at: [s * (W / 2 + 1), cyh - Hh * 0.05, -0.5], mat: B, bevel: 0.4, cuts: [[0, -1, 1, 2], [0, -1, -1, 2]], detail: { type: 'vent', face: 'side', pitch: 1.5, inset: 1.2 } });
        torso.box(2.2, 2, 1, { at: [W * 0.3, cyh - Hh * 0.2, Dp * 0.56 + 0.3], mat: 'tertiary' });
        out.chestY = cyh; out.topY = base - 0.5 + Hh; out.neck = [-W * 0.16, out.topY - 1, -Dp * 0.2]; out.shX = W / 2 + 3; out.shY = up ? out.topY - 3.5 : cyh;
        out.frontZ = Dp * 0.56; out.backZ = -Dp * 0.56 - 0.6; out.backY = cyh + 1;
        break;
      }
      default: { // block: faceted box chest with a V-taper into the waist
        torso.box(W, H, Dp, { at: [0, cy, 0], mat: A, bevel: 0.8,
          cuts: [[0, 1, 1, H * 0.3], [0, -1, 1, H * 0.25], [1, -1, 0, up ? W * 0.22 : 2], [-1, -1, 0, up ? W * 0.22 : 2], [1, 0, 1, 3], [-1, 0, 1, 3], [1, 1, 0, 2.2], [-1, 1, 0, 2.2], [0, -1, -1, H * 0.2]],
          detail: [{ type: 'panel', face: 'side', at: H * 0.2, dir: 'h' }, { type: 'vent', face: '-z', pitch: 1.4, inset: 3 }, num()] });
        frontPlate(cy - H * 0.08, W * 0.5, H * 0.36);
        torso.box(W * 0.6, 3, Dp * 0.55, { at: [0, top - 0.8, -Dp * 0.15], mat: M, bevel: 0.6 }); // collar ring
      }
    }
    if (D.frame === 'tank') { // commander hatch (it blows open when the tank brews up)
      const hatch = torso.child('hatch', [W * 0.18, out.topY - 0.2, -Dp * 0.18 - 2]);
      hatch.cyl('y', 2.6, 1.2, { at: [0, 0.6, 2], mat: M, sides: 8, detail: { type: 'bolts', face: '+y', inset: 1 } });
      hatch.box(1.2, 1.4, 1.2, { at: [0, 1.5, 3.4], mat: B });
      out.hatch = [W * 0.18, out.topY + 1, -Dp * 0.18];
    }
    greebleTorso(ctx, out);
    const k = ctx.k;
    ctx.anims.push((st, n) => {
      const m = st.move || 0, t = lifeT(st);
      if (!alive(st)) return;
      if (up) n.torso.pos[1] += Math.sin(t * 2.2 + 0.6) * 0.25 * (1 - m) * k; // breathing
      else n.torso.rot[1] += Math.sin(t * 0.5) * 0.1 * (1 - m); // slow turret scan
    });
    D.tor = out;
    return out;
  }

  // small asymmetric greebles: side vent pods, antenna stubs, exhaust pipes, a stencil plate
  function greebleTorso(ctx, t) {
    const { r, M, T } = ctx, n = t.node;
    if (r.chance(0.5) && ctx.bp.torso !== 'barrel') {
      const s = r.chance(0.5) ? 1 : -1;
      n.box(2, 4, Math.max(4, t.D * 0.4), { at: [s * (t.W / 2 + 0.6), Math.max(5, t.shY - 5.5), -1], mat: M, bevel: 0.4, detail: { type: 'vent', face: 'side', pitch: 1.3, inset: 0.4 } });
    }
    if (r.chance(0.5)) for (const s of [-1, 1]) n.cyl('z', 1, 3.5, { at: [s * t.W * 0.2, t.chestY - t.Ht * 0.3, t.backZ - 1], mat: M, sides: 6 });
    if (r.chance(0.55)) {
      const s = r.chance(0.5) ? 1 : -1;
      n.box(0.8, 6, 0.8, { at: [s * t.W * 0.3, t.topY + 2.6, t.backZ + 2], rot: [-0.25, 0, s * 0.1], mat: M });
    }
  }

  // ------------------------------------------------------------- head
  // Tiny (about a tenth of the height) and sunk between the shoulders or under the hood plate: only a visor
  // slit, a mono-eye or a sensor bar shows.
  function buildHead(ctx, tor) {
    const { bp, r, A, B, T, M } = ctx, D = ctx.mod || setupMod(ctx);
    const kind = OPTIONS.head.includes(bp.head) ? bp.head : 'visor';
    if (kind === 'none') { // headless: a sensor slit under the collar
      tor.node.box(tor.W * 0.3, 2, 1.4, { at: [0, tor.topY - 2.2, tor.frontZ - 1.2], mat: M, detail: { type: 'eye', face: '+z', at: 0, h: 0.45, w: tor.W * 0.12 } });
      return;
    }
    const neck = tor.node.child('neck', tor.neck, [-(tor.lean || 0), 0, 0]);
    neck.cyl('y', 1.8, 3, { mat: M, sides: 6 });
    const h = neck.child('head', [0, 0.8, 0]);
    const MK = D.MK;
    switch (kind) {
      case 'mono': {
        h.cone('y', 3.9, 3, 4.6, { at: [0, 2.4, 0], mat: A, sides: 6, twist: PI / 6, detail: { type: 'panel', face: 'side', at: 0.4, dir: 'h' } });
        h.box(6, 1.8, 1.4, { at: [0, 2.4, 3.2], mat: M });
        const eye = h.child('monoEye', [0, 2.4, 3.9]);
        eye.box(1.4, 1.1, 0.8, { mat: 'glass', shadow: false });
        h.box(0.9, 2.8, 3.8, { at: [0, 5.2, -0.6], mat: T, cuts: [[0, 1, 1, 1.2]] });
        ctx.anims.push((st, n) => { n.monoEye.pos[0] += Math.sin(lifeT(st) * 1.3) * 2 * ctx.k * (1 - (st.move || 0) * 0.7); });
        break;
      }
      case 'cockpit': {
        h.box(8, 4.2, 7, { at: [0, 2, 0.4], mat: A, bevel: 0.4, cuts: [[0, 1, 1, 2.4], [1, 0, 1, 1.4], [-1, 0, 1, 1.4], [1, 1, 0, 1]] });
        h.box(5.2, 1, 1.2, { at: [0, 3, 3], rot: [-0.78, 0, 0], mat: 'glass', shadow: false });
        for (const s of [-1, 1]) h.box(1.5, 1.8, 3, { at: [s * 4.4, 1.6, 0.4], mat: M });
        break;
      }
      case 'horned': { // small helm with swept antenna blades
        h.box(6.2, 4.8, 6.4, { at: [0, 2.6, 0], mat: A, bevel: 0.4, cuts: [[0, 1, 1, 2], [1, 0, 1, 1.4], [-1, 0, 1, 1.4], [1, 1, 0, 1], [-1, 1, 0, 1]], detail: { type: 'eye', face: '+z', at: 0.2, h: 0.45, w: 2 } });
        for (const s of [-1, 1]) h.box(0.9, 5, 1.2, { at: [s * 2, 6, 1.4], rot: [-0.3, 0, -s * 0.6], mat: MK, cuts: [[s, 1, 0, 0.5]] });
        h.box(1.3, 1.2, 1, { ...GLOW, at: [0, 4.6, 2.8] });
        break;
      }
      case 'sensor': { // wide flat sensor bar
        h.box(9.5, 3.2, 5, { at: [0, 1.8, 0.4], mat: A, bevel: 0.3, cuts: [[0, 1, 1, 1.4], [1, 0, 1, 1.6], [-1, 0, 1, 1.6]], detail: { type: 'light', face: '+z', pts: [[-2.6, 0], [0, 0], [2.6, 0]], size: 0.55 } });
        const sx = r.chance(0.5) ? 1 : -1;
        h.box(0.8, 7, 0.8, { at: [sx * 3.8, 5.6, -1.5], rot: [-0.25, 0, 0], mat: M });
        h.box(1.1, 1.1, 1.1, { ...GLOW, at: [sx * 3.8, 9, -2.4] });
        break;
      }
      case 'dome': { // hexagonal sensor turret with a thin slit
        h.cyl('y', 3.8, 2.4, { at: [0, 1.4, 0], mat: A, sides: 6, twist: PI / 6 });
        h.cyl('y', 3.5, 1.4, { at: [0, 3.2, 0], mat: M, sides: 6, twist: PI / 6, detail: { type: 'eye', face: '+z', at: 0, h: 0.4, w: 1.6 } });
        h.cone('y', 3.7, 1.8, 2.6, { at: [0, 5.2, 0], mat: A, sides: 6, twist: PI / 6 });
        h.box(0.9, 2.2, 3, { at: [0, 6.6, -0.8], mat: T, cuts: [[0, 1, 1, 1]] });
        break;
      }
      case 'skull': { // brute cranium: brow ridge over two eye slits, grille jaw
        h.box(6.4, 4.2, 6, { at: [0, 3.2, -0.5], mat: A, bevel: 0.4, cuts: [[0, -1, 1, 2], [1, 1, 0, 1.4], [-1, 1, 0, 1.4], [0, 1, 1, 1]] });
        h.box(7, 1.5, 2.2, { at: [0, 4.4, 2.2], mat: T, cuts: [[0, 1, 1, 1], [0, -1, 1, 0.7]] });
        for (const s of [-1, 1]) h.box(1.5, 0.9, 0.8, { at: [s * 1.4, 3.3, 2.6], rot: [0, 0, s * 0.3], mat: 'glass', shadow: false });
        h.box(4.6, 2.6, 4.2, { at: [0, 1.4, 1.2], mat: B, bevel: 0.3, cuts: [[1, 0, 1, 1.8], [-1, 0, 1, 1.8], [0, -1, 1, 1.2]], detail: { type: 'vent', face: '+z', pitch: 1.1, inset: 0.4 } });
        break;
      }
      case 'periscope': { // tiny head with an offset sensor mast
        h.box(5.4, 3.6, 5.4, { at: [0, 2, 0], mat: A, bevel: 0.3, cuts: [[0, 1, 1, 1.4], [1, 0, 1, 1], [-1, 0, 1, 1]], detail: { type: 'eye', face: '+z', at: 0.1, h: 0.4, w: 1.6 } });
        const sx = r.chance(0.5) ? 1 : -1;
        const scope = h.child('scope', [sx * 3, 3.4, -1.2]);
        scope.cyl('y', 1.2, 1.4, { at: [0, 0.4, 0], mat: T, sides: 6 });
        scope.cyl('y', 0.7, 8, { at: [0, 4.6, 0], mat: M, sides: 6 });
        scope.box(2.4, 2.2, 4.2, { at: [0, 9.2, 0.6], mat: A, bevel: 0.3, cuts: [[0, 1, 1, 0.9]] });
        scope.box(1.6, 1.1, 0.8, { ...GLOW, at: [0, 9, 3] });
        ctx.anims.push((st, n) => { n.scope.rot[1] = Math.sin(lifeT(st) * 0.8) * 0.6; });
        break;
      }
      default: { // visor: faceted helm with a thin glowing slit under a brow plate
        h.box(6.4, 4.8, 6.4, { at: [0, 2.6, 0], mat: A, bevel: 0.4, cuts: [[0, 1, 1, 2], [1, 0, 1, 1.4], [-1, 0, 1, 1.4], [1, 1, 0, 1], [-1, 1, 0, 1]], detail: { type: 'eye', face: '+z', at: 0.1, h: 0.42, w: 2.1 } });
        h.box(7.2, 1.5, 4.4, { at: [0, 4.9, 0.9], mat: T, bevel: 0.3, cuts: [[0, 1, 1, 1]] });
        h.box(3.2, 1.6, 1.4, { at: [0, 1, 3.1], mat: M, detail: { type: 'vent', face: '+z', pitch: 1, inset: 0.2 } });
      }
    }
    // head stays level; a slow scan at rest, a small look with the stride
    ctx.anims.push((st, n) => {
      if (!alive(st)) return;
      const m = st.move || 0;
      n.head.rot[1] += Math.sin(lifeT(st) * 0.7) * 0.22 * (1 - m) + Math.sin(st.phase || 0) * 0.08 * m;
    });
  }

  // ------------------------------------------------------------- arms
  // Hanging arms (biped, strider, hover): weapons lowered at rest, raised to aim on attack; melee arms use the
  // Mech frame line's shared attack motions. Walker / tank chassis mount the weapon forward on the turret flank.
  const ARM_REST = { ranged: { sh: 0.06, el: -0.42, rz: 0.1 }, melee: { sh: 0.04, el: -0.3, rz: 0.12 }, shield: { sh: 0.02, el: -1.0, rz: 0.2 }, none: { sh: 0.02, el: -0.2, rz: 0.1 } };
  const ARM_AIM = { sh: -0.12, el: -1.38, rz: 0.07 };
  function buildArm(ctx, tor, s, type) {
    const { A, B, T, M } = ctx, D = ctx.mod || setupMod(ctx), { wB, aL, MK } = D;
    if (!OPTIONS.arm.includes(type)) type = 'none';
    const hard = D.hard, k = ctx.k;
    const ranged = !!RANGED[type], shield = type === 'shield';
    const aw = 6 * wB;
    const mz = hard ? tor.mountZ || 0 : 0;
    const pad = tor.node.child('pad' + s, [s * tor.shX, tor.shY, mz]);
    buildShoulderArmor(ctx, pad, s);
    let rest = ARM_REST[ranged ? 'ranged' : shield ? 'shield' : type === 'none' ? 'none' : 'melee'];
    if (D.frame === 'hover' && !shield) rest = { sh: -0.2, el: ranged ? -1.12 : -0.8, rz: 0.12 };
    let sh, el, w;
    if (hard) {
      sh = tor.node.child('shoulder' + s, [s * tor.shX, tor.shY, mz]);
      sh.box(3, 5, 6, { at: [s * 1, 0, 0], mat: M, bevel: 0.4, detail: { type: 'bolts', face: 'side', inset: 1 } });
      if (type === 'none') return;
      el = sh.child('elbow' + s, [s * (2.2 + aw / 2), 0, 1.5], [-PI / 2 + 0.16, 0, 0]);
      el.box(aw + 1, 7, aw + 1.4, { at: [0, -2.2, 0], mat: B, bevel: 0.5, cuts: [[1, 1, 0, 1], [-1, 1, 0, 1], [0, 1, 1, 1.2]], detail: { type: 'band', dir: 'h', at: -1, size: 0.8, mat2: MK } });
      w = el.child('wrist' + s, [0, -5.4, 0]);
    } else {
      sh = tor.node.child('shoulder' + s, [s * tor.shX, tor.shY, 0], [rest.sh, 0, s * rest.rz]);
      sh.cyl('x', 2.4, 4, { at: [s * 0.6, 0, 0], mat: M, sides: 8 });
      if (type === 'none') { D.armSwing[s] = 0; return; }
      const upL = 8.5 * aL, foL = 11 * aL;
      const upper = sh.child('upper' + s, [s * 1.8, -2, 0]);
      upper.box(aw * 0.66, upL + 2, aw * 0.66, { at: [0, -upL / 2, 0], mat: M, bevel: 0.4 });
      upper.box(aw * 0.9, upL * 0.5, aw * 0.9, { at: [0, -upL * 0.62, 0], mat: A, bevel: 0.4, cuts: [[0, 1, 1, 1], [0, 1, -1, 1]], detail: { type: 'panel', face: 'side', at: 0, dir: 'h' } });
      el = upper.child('elbow' + s, [0, -upL, 0], [rest.el, 0, 0]);
      el.cyl('x', 2, aw * 0.8, { mat: M, sides: 8 });
      el.box(aw, foL, aw * 1.05, { at: [0, -foL / 2 - 0.5, 0], mat: B, bevel: 0.5, cuts: [[0, 1, -1, 1.5], [1, 0, 1, 1.2], [-1, 0, 1, 1.2]], detail: { type: 'band', dir: 'h', at: foL * 0.2, size: 0.8, mat2: MK } });
      el.box(1.3, foL * 0.7, 3.4, { at: [s * (aw / 2 + 0.5), -foL * 0.45, -0.6], mat: M, cuts: [[0, -1, -1, 2], [0, 1, -1, 0.8]] }); // forearm blade
      w = el.child('wrist' + s, [0, -foL - 0.5, 0]);
    }
    MF.setBuildScale(k * (hard ? 1.3 : 1.2)); // chunky weapons
    try { buildWeapon(ctx, w, s, type, aw / (hard ? 1.3 : 1.2)); } finally { MF.setBuildScale(k); }
    // ------ animation: carry, raise, fire, melee motions
    const alt = ['armL', 'armR'].filter((key) => MELEE[ctx.bp[key]]).length > 1 ? (s < 0 ? 0 : 1) : null; // two melee arms take turns
    const fireOf = (st) => (alt == null || ((st.fireN | 0) & 1) === alt ? st.fire || 0 : 0);
    if (hard) {
      ctx.anims.push((st, n) => {
        const f = fireOf(st);
        if (!(f > 0)) return;
        const e = n['elbow' + s];
        if (ranged) { e.rot[0] -= 0.16 * smooth(Math.min(1, f * 4)); n['wrist' + s].pos[1] += f * 1.6 * k; }
        else if (type === 'hammer') e.rot[0] += -0.9 * Math.sin(PI * clamp01((1 - f) * 1.4)) + 0.25 * Math.sin(PI * clamp01((1 - f) * 2.5 - 0.6));
        else e.pos[2] += Math.sin(PI * clamp01((1 - f) * 1.6)) * 5 * k; // jab / drill thrust
      });
    } else {
      D.armSwing[s] = ranged ? 0.12 : shield ? 0.08 : 0.3;
      const d = { sh: ARM_AIM.sh - rest.sh, el: ARM_AIM.el - rest.el, rz: s * (ARM_AIM.rz - rest.rz) };
      const J = { sh: 'shoulder' + s, el: 'elbow' + s, torso: 'torso', pelvis: 'pelvis' };
      const others = ['armL', 'armR'].filter((key) => MELEE[ctx.bp[key]] || RANGED[ctx.bp[key]]).length;
      ctx.anims.push((st, n) => {
        const m = st.move || 0, run = Math.min(1, st.run || 0) * m;
        const sw = -s * Math.sin(st.phase || 0) * D.armSwing[s] * m * (1 + 0.6 * run);
        n['shoulder' + s].rot[0] += sw - 0.12 * run;
        n['pad' + s].rot[0] += sw * 0.4;
        if (alive(st)) n['shoulder' + s].rot[2] += s * Math.sin(lifeT(st) * 2.2) * 0.02 * (1 - m);
        const f = fireOf(st);
        if (!(f > 0)) return;
        if (ranged) { // raise from the low carry to aim, then recoil
          const w2 = smooth(Math.min(1, f * 4));
          const a = n['shoulder' + s], e = n['elbow' + s];
          a.rot[0] += d.sh * w2; a.rot[2] += d.rz * w2; e.rot[0] += d.el * w2;
          e.rot[0] -= f * (type === 'gatling' || type === 'flamer' ? 0.04 : 0.18);
        } else if (MELEE[type] && MF.Gen.sdArmMotion) MF.Gen.sdArmMotion(MELEE[type], f, n, J, s, k);
        else if (shield && others === 0 && MF.Gen.sdArmMotion) MF.Gen.sdArmMotion('bash', st.fire || 0, n, J, s, k);
      });
    }
    if (ranged || type === 'missiles') D.reload.push({ s, type });
    if (shield) D.shields.push(s);
  }

  // Arm weapons hang from the wrist and point down its -y axis; +z is the top side when aimed.
  function buildWeapon(ctx, w, s, type, aw) {
    const { A, B, T, M } = ctx, D = ctx.mod, { aL, MK } = D;
    let tip = null, flashKind = 'flash', zs = [0];
    switch (type) {
      case 'cannon': {
        const len = Math.round(14 + 5 * aL);
        w.box(aw + 1.6, 6.5, aw + 2, { at: [0, -2.6, 0], mat: A, bevel: 0.5, cuts: [[0, -1, 1, 1.6], [1, -1, 0, 1], [-1, -1, 0, 1]], detail: [{ type: 'vent', face: 'side', pitch: 1.3, inset: 1.2 }, { type: 'band', face: '+z', dir: 'h', at: 0.6, size: 0.7, mat2: MK }] });
        w.cyl('y', 1.3, len, { at: [0, -5.5 - len / 2, 0], mat: M, sides: 6 });
        w.box(1.2, len * 0.55, 1.4, { at: [0, -5.5 - len * 0.32, 1.9], mat: M });
        w.box(3.2, 3, 3.2, { at: [0, -5.5 - len + 1.3, 0], mat: M, bevel: 0.3, cuts: MF.chamfer('vert', 0.8) });
        const mag = w.child('mag' + s, [0, -3.4, -(aw / 2 + 2)]);
        mag.box(3, 4.2, 2.4, { mat: T, bevel: 0.3, detail: { type: 'band', dir: 'h', at: 0, size: 0.6, mat2: 'accent' } });
        tip = -5.5 - len - 0.3;
        break;
      }
      case 'gatling': {
        w.box(aw + 2.4, 5, aw + 2.4, { at: [0, -2, 0], mat: A, bevel: 0.5, cuts: MF.chamfer('vert', 1.4), detail: { type: 'band', dir: 'h', at: -0.8, size: 0.7, mat2: MK } });
        const spin = w.child('spin' + s, [0, -4.5, 0]);
        for (let q = 0; q < 4; q++) { const a = (q / 4) * TAU; spin.cyl('y', 0.8, 11, { at: [Math.cos(a) * 1.6, -5.5, Math.sin(a) * 1.6], mat: M, sides: 5 }); }
        spin.cyl('y', 2.6, 1.2, { at: [0, -8.5, 0], mat: M, sides: 6 });
        const mag = w.child('mag' + s, [0, -2.5, -(aw / 2 + 2.4)]);
        mag.box(3.6, 5, 3, { mat: T, bevel: 0.3, detail: { type: 'stripe', face: 'side', width: 1.2, mat2: 'accent' } });
        D.spinners.push(['spin' + s, 1]);
        ctx.anims.push((st, n) => { n['spin' + s].rot[1] = lifeT(st) * (4 + 14 * (st.move || 0)) + (st.fire || 0) * lifeT(st) * 30; });
        tip = -15.5;
        break;
      }
      case 'missiles': {
        const pod = w.child('mag' + s, [s * 1.2, -5.2, 0]);
        pod.box(aw + 4.5, 9, aw + 4, { mat: A, bevel: 0.5, cuts: [[0, 1, 1, 1.4], [0, 1, -1, 1.4], [s, 1, 0, 1]], detail: [{ type: 'grid', face: '-y', cell: 2.8, inset: 0.8 }, { type: 'stripe', face: 'side', width: 1.5, band: 2.8, bandH: 1.2, mat2: 'accent' }, { type: 'number', face: '+z', text: ctx.bp.number, v: 0.5 }] });
        tip = -9.8; flashKind = 'puff';
        break;
      }
      case 'claw': {
        w.box(aw + 1.2, 3.4, aw + 1.2, { at: [0, -1.2, 0], mat: M, bevel: 0.5 });
        for (const [dx, dz, rz, rx] of [[-1.8, 1, 0.3, -0.2], [1.8, 1, -0.3, -0.2], [0, -1.8, 0, 0.35]]) {
          const f = w.child('claw' + s + (dx < 0 ? 'a' : dx > 0 ? 'b' : 'c'), [dx, -2.6, dz], [rx, 0, rz]);
          f.box(1.8, 6.5, 1.8, { at: [0, -3.2, 0], mat: T, cuts: [[0, -1, 1, 1.4], [1, -1, 0, 0.5]] });
        }
        break;
      }
      case 'blade': { // heavy combat blade with a thin glowing edge
        w.box(aw + 1.2, 4, aw + 1.2, { at: [0, -1.6, 0], mat: A, bevel: 0.4, cuts: MF.chamfer('vert', 1), detail: { type: 'band', dir: 'h', at: 0, size: 0.6, mat2: MK } });
        const bl = 16 * aL;
        w.box(1.1, bl, 3.4, { at: [0, -3.6 - bl / 2, 0.4], mat: M, cuts: [[0, -1, 1, 2.8], [0, 1, 1, 0.6]], detail: { type: 'panel', face: 'side', at: -0.3, dir: 'v' } });
        w.box(0.6, bl - 3, 0.6, { ...GLOW, at: [0, -3.6 - bl / 2 + 0.6, 2.2] });
        break;
      }
      case 'shield': {
        const SW = MF.Gen.sdWeapons;
        const grip = w.child('grip' + s, [0, -2, 0.3], [PI / 2, 0, 0]);
        w.box(aw + 1.2, 4, aw + 1.2, { at: [0, -1.6, 0], mat: M, bevel: 0.4 });
        if (SW && SW.plateShield) SW.plateShield.build(ctx, grip, s, { id: 'shd' + s, armW: aw });
        else grip.box(2, 24, 14, { at: [s * (aw / 2 + 2), 2, -2], mat: 'primary', bevel: 0.4, cuts: [[0, -1, 1, 5], [0, -1, -1, 5]], detail: { type: 'bolts', face: 'side', inset: 1.3 } });
        break;
      }
      case 'drill': {
        w.box(aw + 2, 4, aw + 2, { at: [0, -1.6, 0], mat: A, bevel: 0.4, cuts: MF.chamfer('vert', 1.2), detail: { type: 'band', dir: 'h', at: 0, size: 0.7, mat2: MK } });
        const d = w.child('spin' + s, [0, -4, 0]);
        d.cone('y', 0.3, 3.6, 12, { at: [0, -6, 0], mat: M, sides: 6, detail: { type: 'band', dir: 'h', at: 0, size: 0.6 } });
        D.spinners.push(['spin' + s, 1]);
        ctx.anims.push((st, n) => { n['spin' + s].rot[1] = lifeT(st) * (3 + 12 * (st.move || 0)) + (st.fire || 0) * lifeT(st) * 25; });
        break;
      }
      case 'hammer': {
        w.box(aw + 1.5, 3.4, aw + 1.5, { at: [0, -1.2, 0], mat: M, bevel: 0.4 });
        for (const sd of [-1, 1]) w.cyl('y', 0.7, 6.5, { at: [sd * 2.1, -5, 0], mat: T, sides: 6 });
        const hl = Math.round(11 + 3 * D.wB);
        w.box(aw + 3.4, 7, hl, { at: [0, -10.5, 0], mat: A, bevel: 0.5, cuts: MF.chamfer('ends', 1.6), detail: [{ type: 'stripe', face: 'side', width: 1.5, mat2: 'accent', band: 0, bandH: 1.2 }, { type: 'bolts', face: 'side', inset: 1.3 }] });
        w.box(aw + 1.6, 5.6, 2.4, { at: [0, -10.5, hl / 2 + 1], mat: M, cuts: MF.chamfer('xends', 1.2) });
        break;
      }
      case 'flamer': {
        w.box(aw + 2, 5, aw + 2, { at: [0, -2, 0], mat: A, bevel: 0.4, cuts: MF.chamfer('vert', 1), detail: { type: 'vent', face: 'side', pitch: 1.4, inset: 0.6 } });
        w.cyl('y', 1.4, 7, { at: [0, -8, 0], mat: M, sides: 6 });
        w.cone('y', 2.6, 1.5, 4, { at: [0, -13, 0], mat: M, sides: 6 });
        w.cyl('y', 1.5, 0.6, { at: [0, -15.2, 0], ...GLOW, sides: 6 });
        const mag = w.child('mag' + s, [0, -5, aw / 2 + 2.6]);
        mag.cyl('y', 2.2, 9, { mat: T, sides: 6, detail: { type: 'stripe', face: 'any', width: 1.4, mat2: 'accent', band: 2.5, bandH: 1 } });
        tip = -16; flashKind = 'flame';
        break;
      }
      case 'laser': {
        const len = Math.round(18 + 6 * aL);
        w.box(aw + 2, 6, aw + 2.4, { at: [0, -2.5, 0], mat: A, bevel: 0.4, cuts: MF.chamfer('vert', 1.2), detail: { type: 'vent', face: 'side', pitch: 1.4, inset: 0.7 } });
        w.cyl('y', 0.9, len, { at: [0, -5 - len / 2, 0], mat: M, sides: 6 });
        for (let q = 0; q < 3; q++) w.cyl('y', 1.8, 1, { ...GLOW, at: [0, -7.5 - q * 3.2, 0], sides: 6 });
        w.box(2.4, 2.4, 2.4, { at: [0, -5 - len + 1.2, 0], mat: M, bevel: 0.4 });
        const mag = w.child('mag' + s, [0, -3, -(aw / 2 + 1.8)]);
        mag.box(2.6, 3.6, 2, { mat: T, detail: { type: 'light', face: '-z', pts: [[0, 0.8]], size: 0.5 } });
        tip = -5 - len - 1.5; flashKind = 'beam';
        break;
      }
      case 'twin': {
        w.box(aw + 2, 5.5, aw + 5, { at: [0, -2.2, 0], mat: A, bevel: 0.5, cuts: [[0, -1, 1, 1.4], [0, -1, -1, 1.4]], detail: [{ type: 'band', face: 'side', dir: 'v', at: 0, size: 0.8, mat2: MK }, { type: 'bolts', face: 'side', inset: 1.2 }] });
        for (const dz of [-2, 2]) { w.cyl('y', 1.2, 10, { at: [0, -9.5, dz], mat: M, sides: 6 }); w.box(2.8, 2.6, 2.8, { at: [0, -14.5, dz], mat: M, bevel: 0.4 }); }
        const mag = w.child('mag' + s, [s * (aw / 2 + 1.8), -2.6, 0]);
        mag.box(2.2, 4, 4, { mat: T, detail: { type: 'band', dir: 'h', at: 0, size: 0.6, mat2: 'accent' } });
        tip = -16; zs = [-2, 2];
        break;
      }
      default: { // fist: big faceted power fist
        w.box(aw + 2.6, 5.5, aw + 2.6, { at: [0, -3, 0.3], mat: A, bevel: 0.5, cuts: [[0, -1, 1, 1.6], [1, -1, 0, 1], [-1, -1, 0, 1], [0, 1, 1, 1]], detail: { type: 'panel', face: 'side', at: -0.5, dir: 'h' } });
        w.box(aw + 2.2, 1.6, aw + 1.6, { at: [0, -6.2, 0.6], mat: M, detail: { type: 'bolts', face: '-y', inset: 1 } });
        w.box(aw + 3, 1.8, aw + 3, { at: [0, -0.3, 0.3], mat: 'tertiary', bevel: 0.3 });
      }
    }
    if (tip != null) {
      zs.forEach((dz, i) => {
        const mz = w.child('muzzle' + s + i, [type === 'missiles' ? s * 1.2 : 0, tip, dz]);
        mz.startHidden = true;
        muzzleFlash(mz, flashKind);
      });
      ctx.anims.push((st, n) => {
        const f = st.fire || 0;
        const on = f > 0.55 || (type === 'flamer' && f > 0.1) || (type === 'gatling' && f > 0.1 && Math.floor((st.t || 0) * 30) % 2 === 0);
        zs.forEach((_, i) => { n['muzzle' + s + i].hidden = !on; });
      });
    }
    if (type === 'claw') ctx.anims.push((st, n) => { // fingers open on the strike
      const o = Math.sin(PI * clamp01(1 - (st.fire || 0))) * 0.5 * ((st.fire || 0) > 0 ? 1 : 0);
      if (n['claw' + s + 'a']) { n['claw' + s + 'a'].rot[2] += o; n['claw' + s + 'b'].rot[2] -= o; n['claw' + s + 'c'].rot[0] += o; }
    });
  }

  // flare shapes pointing down the node's -y axis (the barrel direction)
  function muzzleFlash(n, kind) {
    const glow = { mat: 'accent', shadow: false };
    if (kind === 'flame') {
      n.cone('y', 0.8, 3.2, 14, { ...glow, at: [0, -7, 0], sides: 6 });
      n.cone('y', 2.2, 0.4, 4, { ...glow, at: [0, -15.5, 0], sides: 6 });
    } else if (kind === 'beam') {
      n.cyl('y', 0.8, 40, { ...glow, at: [0, -20, 0], sides: 6 });
      n.box(4, 1, 4, { ...glow, at: [0, -0.5, 0] });
    } else if (kind === 'puff') {
      n.box(5, 3, 5, { ...glow, at: [0, -1.5, 0], bevel: 1.2 });
      n.cone('y', 0.2, 2, 6, { ...glow, at: [0, -6, 0], sides: 5 });
    } else {
      n.cone('y', 0.2, 2.6, 6, { ...glow, at: [0, -3, 0], sides: 6 });
      n.box(7, 1.2, 1.2, { ...glow, at: [0, -0.8, 0] });
      n.box(1.2, 1.2, 7, { ...glow, at: [0, -0.8, 0] });
    }
  }

  // Shoulder armour: faceted wedge pauldrons with hazard bands, hexagonal guards, launcher boxes, spiked
  // plates or layered Frame-Arms shoulder shields. Smaller on the walker / tank hardpoints.
  function buildShoulderArmor(ctx, p, s) {
    const { bp, A, B, T, M } = ctx, D = ctx.mod || setupMod(ctx), { wB, MK } = D;
    const S = D.hard ? 0.78 : 1;
    const w = 9.5 * S * wB, h = 7.5 * S, d = 12 * S * wB, x = s * (w * 0.42 + (D.hard ? 1 : 0));
    switch (bp.shoulders) {
      case 'pauldron':
        p.box(w, h, d, { at: [x, 2 * S, 0], mat: A, bevel: 0.5, cuts: [[s, 1, 0, 2.8 * S], [0, 1, 1, 1.8 * S], [0, 1, -1, 1.4 * S], [0, -1, 1, 1.2], [-s, 1, 0, 0.8]], detail: { type: 'band', face: 'side', dir: 'h', at: -0.6 * S, size: 0.8, mat2: MK } });
        p.box(w + 0.6, 1.5, d + 0.4, { at: [x, -1.9 * S, 0], mat: M });
        break;
      case 'round': // hexagonal guards: a round silhouette built from flat facets
        p.cyl('x', 4.8 * S, w, { at: [x, 1.8 * S, 0], mat: T, sides: 6, twist: PI / 6, detail: [{ type: 'bolts', face: 'side', inset: 1.6 }, { type: 'number', face: 'side', text: bp.number, v: 0 }] });
        p.box(w - 1, 1.4, 4 * S, { at: [x, 1.8 * S + 4.6 * S, 0], mat: MK });
        break;
      case 'launcher': {
        p.box(w, h - 1, d, { at: [x, 1.4 * S, 0], mat: A, bevel: 0.5, cuts: [[s, 1, 0, 2 * S], [0, 1, 1, 1]] });
        const lb = p.child('launch' + s, [x, 5.6 * S, -0.5], [-0.2, 0, 0]);
        lb.box(w - 1, 4.6 * S, d - 2, { mat: T, bevel: 0.3, cuts: [[0, 1, 1, 1]], detail: [{ type: 'grid', face: '+z', cell: 2.4, inset: 0.6 }, { type: 'stripe', face: 'side', width: 1.4, mat2: 'accent' }] });
        const mz = lb.child('lmz' + s, [0, 0, (d - 2) / 2 + 0.2], [-PI / 2, 0, 0]);
        mz.startHidden = true;
        muzzleFlash(mz, 'puff');
        ctx.anims.push((st, n) => { n['lmz' + s].hidden = !((st.fire || 0) > 0.45 && (st.fire || 0) < 0.8); n['launch' + s].rot[0] -= (st.fire || 0) * 0.15; });
        D.reload.push({ s, type: 'launcher' });
        break;
      }
      case 'shield': { // layered plates: a cap sloping out-down, then a big flat side plate with a stencil
        p.box(w + 1, 2, d + 1, { at: [x + s * 0.4, 4 * S, 0], mat: T, rot: [0, 0, -s * 0.38], bevel: 0.4, cuts: [[0, 1, 1, 1], [0, 1, -1, 1]] });
        p.box(w + 2, 2, d + 3, { at: [x + s * 2.4 * S, 2.4 * S, 0], mat: A, rot: [0, 0, -s * 0.62], bevel: 0.4, detail: [{ type: 'band', face: '+y', dir: 'v', at: s * (w / 2 - 0.6), size: 0.7, mat2: MK }, { type: 'bolts', face: '+y', inset: 1.2 }] });
        p.box(1.8, 10 * S, d + 1, { at: [x + s * (w / 2 + 2.6) * S, -3 * S, 0.5], mat: A, rot: [0, 0, s * 0.2], bevel: 0.5, cuts: [[0, -1, 1, 3], [0, -1, -1, 3]], detail: [{ type: 'number', face: 'side', text: bp.number, v: 1 }, { type: 'bolts', face: 'side', inset: 1.3 }] });
        break;
      }
      case 'spiked': // heavy plate with a row of short wedge spikes
        p.box(w, h, d, { at: [x, 2 * S, 0], mat: A, bevel: 0.5, cuts: [[s, 1, 0, 2 * S], [0, 1, 1, 1.2]], detail: { type: 'stripe', face: 'side', width: 1.4, mat2: 'accent', band: -1.5 * S, bandH: 1 } });
        for (const z of [-3, 0, 3]) p.box(1.4, 3.6 * S, 1.8, { at: [x + s * 1.4, 6.6 * S, z * S], rot: [0, 0, -s * 0.35], mat: M, cuts: [[0, 1, 1, 0.8], [0, 1, -1, 0.8], [s, 1, 0, 0.6]] });
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------- back
  // Mounts from the Mech frame line's weapon table (radar, shoulder cannon, missile pods) keep the two lines'
  // kit consistent; the rest are modular packs restyled with stripes and stencils.
  function buildBack(ctx, tor) {
    const { bp, A, B, T, M } = ctx, D = ctx.mod || setupMod(ctx), { wB, tT, MK } = D, k = ctx.k;
    const kind = bp.back;
    if (!kind || kind === 'none') { // slim pack
      const pk = tor.node.child('back', [0, tor.backY, tor.backZ]);
      pk.box(tor.W * 0.5, 8, 3.4, { at: [0, 0, -1.4], mat: B, bevel: 0.5, cuts: [[0, 1, -1, 1.2]], detail: { type: 'vent', face: '-z', pitch: 1.5, inset: 1.2 } });
      for (const s of [-1, 1]) pk.cone('y', 1.5, 2.1, 3, { at: [s * tor.W * 0.14, -5.2, -1.4], mat: M, sides: 6 });
      return;
    }
    const back = tor.node.child('back', [0, tor.backY, tor.backZ]);
    const SW = MF.Gen.sdWeapons;
    const mount = (wKey, s, at, scale) => { // an sd weapon table mount, scaled to the modular body
      if (!SW || !SW[wKey]) return false;
      const m = back.child('bk' + (s < 0 ? 'R' : 'L'), at);
      MF.setBuildScale(ctx.k * scale);
      try { SW[wKey].build(ctx, m, s, { id: s < 0 ? 'bkR' : 'bkL' }); } finally { MF.setBuildScale(ctx.k); }
      return true;
    };
    const pack = (w, h, d, y) => back.box(w, h, d, { at: [0, y || 0, -d / 2 + 0.6], mat: B, bevel: 0.5, cuts: [[0, 1, -1, 1.4], [1, 1, 0, 1], [-1, 1, 0, 1]], detail: [{ type: 'vent', face: '-z', pitch: 1.5, inset: 1.4 }, { type: 'bolts', face: 'side', inset: 1 }] });
    switch (kind) {
      case 'missiles': { // twin missile pods from the weapon table
        pack(tor.W * 0.62, 9, 5);
        const ok = [-1, 1].map((s) => mount('missilePod', s, [s * tor.W * 0.27, 3, -2.5], 0.85));
        if (!ok[0]) for (const s of [-1, 1]) back.box(7, 7, 6, { at: [s * tor.W * 0.27, 6, -3], mat: A, bevel: 0.5, detail: { type: 'grid', face: '+z', cell: 2.6, inset: 0.7 } });
        D.reload.push({ s: 0, type: 'backPods' });
        break;
      }
      case 'exhaust': {
        pack(tor.W * 0.56, 9, 4.5);
        for (const s of [-1, 1]) {
          back.cyl('y', 1.9, 10, { at: [s * 3.2, 5.5, -3.4], rot: [-0.12, 0, 0], mat: M, sides: 6, detail: { type: 'band', at: 2.5, size: 0.6, mat2: MK } });
          back.cyl('y', 1.2, 0.8, { ...GLOW, at: [s * 3.2, 10.7, -4], sides: 6 });
        }
        break;
      }
      case 'antenna': { // tall curved antenna fin with white and dark-red bands (Frame Arms)
        pack(tor.W * 0.58, 10, 5);
        let fn = back.child('fin', [tor.W * 0.14, 4.5, -3], [-0.12, 0, -0.08]);
        for (let q = 0; q < 3; q++) {
          const L2 = (10 - q * 1.8) * tT;
          fn.box(1.3, L2, 4 - q * 0.8, { at: [0, L2 / 2, 0], mat: A, cuts: [[0, 1, 1, 1.2]], detail: { type: 'band', dir: 'h', at: L2 * 0.2, size: 0.6, mat2: q === 1 ? 'tertiary' : MK } });
          fn = fn.child('fin' + q, [0, L2, 0], [-0.3, 0, 0]);
        }
        fn.box(1.1, 2, 1.1, { ...GLOW, at: [0, 1, 0] });
        ctx.anims.push((st, n) => { if (alive(st)) n.fin.rot[0] += Math.sin(lifeT(st) * 1.3) * 0.02 - (st.move || 0) * 0.08; });
        break;
      }
      case 'tank': { // striped cargo container with a stencil number (Navy Anchor)
        const ch = 12.5 * tT, cy = -1;
        back.box(tor.W * 0.8, ch, 8.5, { at: [0, cy, -4.4], mat: B, bevel: 0.5, cuts: [[0, 1, -1, 1.6]], detail: [{ type: 'band', face: '-z', dir: 'h', at: ch * 0.22, size: 0.9, mat2: MK }, { type: 'band', face: 'side', dir: 'h', at: ch * 0.22, size: 0.9, mat2: MK }, { type: 'number', face: '-z', text: bp.number, v: -ch * 0.15 }, { type: 'bolts', face: 'side', inset: 1.3 }] });
        back.box(tor.W * 0.84, 1.6, 9.1, { at: [0, cy + ch / 2 + 0.4, -4.4], mat: M, bevel: 0.3 });
        for (const s of [-1, 1]) back.cone('y', 1.6, 2.3, 3.5, { at: [s * tor.W * 0.2, cy - ch / 2 - 1.8, -3.6], mat: M, sides: 6 });
        back.box(1.3, 1.3, 1, { ...GLOW, at: [tor.W * 0.3, cy + ch * 0.3, -8.9] });
        break;
      }
      case 'radar': {
        pack(tor.W * 0.5, 8, 4.5);
        if (!mount('radar', 1, [tor.W * 0.2, 4, -2.5], 0.9)) back.box(1, 10, 1, { at: [tor.W * 0.2, 9, -2.5], mat: M });
        break;
      }
      case 'artillery': { // shoulder cannon from the weapon table, on the side with the free arm
        const s = bp.armR === 'none' || bp.armR === 'shield' ? 1 : -1;
        pack(tor.W * 0.55, 9, 5);
        if (!mount('cannon', s, [s * tor.W * 0.28, 4, -1.5], 0.9)) back.box(5, 5, 14, { at: [s * tor.W * 0.28, 7, 2], mat: A });
        D.reload.push({ s, type: 'artillery' });
        break;
      }
      case 'wings': { // angled fin binders
        pack(tor.W * 0.5, 8, 4.5);
        for (const s of [-1, 1]) {
          const wg = back.child('wing' + s, [s * 3, 4, -3.5], [0.4, 0, -s * 0.55]);
          wg.box(1.8, 15 * tT, 6.5, { at: [0, 7.5 * tT, 0], mat: A, cuts: [[0, 1, -1, 4], [0, -1, 1, 1.5]], bevel: 0.4, detail: { type: 'band', face: 'side', dir: 'h', at: 3, size: 0.8, mat2: MK } });
          wg.box(2.4, 3.5, 3.5, { mat: M });
        }
        ctx.anims.push((st, n) => { if (!alive(st)) return; const f = Math.sin(lifeT(st) * 1.5) * 0.04 + (st.move || 0) * 0.12; n['wing-1'].rot[2] -= f; n.wing1.rot[2] += f; });
        break;
      }
      case 'jetpack': {
        back.box(tor.W * 0.6, 10, 5, { at: [0, 2, -2.4], mat: A, bevel: 0.5, cuts: [[0, 1, -1, 1.6]], detail: [{ type: 'vent', face: '-z', pitch: 2, inset: 2 }, { type: 'number', face: '-z', text: bp.number, v: 3 }] });
        const jx = Math.max(4, tor.W * 0.27);
        for (const s of [-1, 1]) {
          const j = back.child('jet' + s, [s * jx, 3, -6.2], [0.3, 0, s * -0.1]);
          j.cone('y', 3, 2.1, 11, { at: [0, 1, 0], mat: T, sides: 6, detail: [{ type: 'band', at: 3, size: 0.8, mat2: MK }, { type: 'panel', at: -2.5, dir: 'h' }] });
          j.cone('y', 3.2, 2.5, 3, { at: [0, -6, 0], mat: M, sides: 6 });
          const f = j.child('flame' + s, [0, -7.5, 0]);
          f.cone('y', 0.5, 2.4, 4, { ...GLOW, at: [0, -1.5, 0], sides: 6 });
        }
        ctx.anims.push((st, n) => {
          for (const s of [-1, 1]) {
            const f = n['flame' + s];
            f.hidden = !alive(st);
            f.pos[1] += (Math.sin((st.t || 0) * 37 + s) * 0.35 - 0.6 * (st.move || 0) - 0.8 * Math.min(1, st.run || 0)) * k;
          }
        });
        break;
      }
      case 'saw': { // buzz saw on a boom over one shoulder
        const sd = bp.armL === 'none' || bp.armL === 'shield' ? -1 : 1;
        back.box(5.5, 7, 5, { at: [sd * tor.W * 0.25, 2, -2.5], mat: M, bevel: 0.5, detail: { type: 'vent', face: '-z', pitch: 1.5, inset: 1 } });
        const Lb = Math.round(12 + 3 * tT);
        const boom = back.child('sawBoom', [sd * tor.W * 0.28, 4, -3], [0.55, 0, -sd * 0.42]);
        boom.box(3, Lb, 3.2, { at: [0, Lb / 2, 0], mat: A, bevel: 0.4, detail: { type: 'stripe', face: 'side', width: 1.4, mat2: 'accent' } });
        boom.cyl('y', 0.8, Lb * 0.7, { at: [0, Lb * 0.45, -2.4], mat: M, sides: 6 });
        const hub = boom.child('sawHub', [0, Lb, 0], [-0.55, 0, sd * 0.42]);
        hub.cyl('x', 2.6, 4, { at: [-sd * 0.5, 0, 0], mat: T, sides: 6 });
        const bl = hub.child('sawBlade', [sd * 2.6, 0, 0]);
        const a = Math.round(4.5 * D.wB + 1.5);
        bl.box(0.9, a * 2, a * 2, { mat: M });
        bl.box(0.9, a * 2, a * 2, { mat: M, rot: [PI / 4, 0, 0] });
        bl.cyl('x', a * 0.8, 1.3, { mat: T, sides: 8, detail: { type: 'panel', face: 'side', at: 0, dir: 'h' } });
        ctx.anims.push((st, n) => { n.sawBlade.rot[0] = -lifeT(st) * (5 + 7 * (st.move || 0)); });
        break;
      }
      case 'sensor': { // tall mast with a spinning radar bar
        pack(tor.W * 0.4, 7, 4);
        const mh = Math.round(16 * tT + 2);
        back.cyl('y', 0.8, mh, { at: [0, 4 + mh / 2, -2.4], mat: M, sides: 6 });
        back.box(3, 1.3, 3, { at: [0, 4 + mh * 0.55, -2.4], mat: T, bevel: 0.3 });
        const bar = back.child('sensorBar', [0, 4 + mh, -2.4]);
        bar.cyl('y', 1.6, 1.6, { at: [0, 0.4, 0], mat: T, sides: 6 });
        const bw = Math.round(10 + 4 * D.wB);
        bar.box(bw, 1.8, 2, { at: [0, 1.9, 0], mat: A, bevel: 0.3, cuts: MF.chamfer('xends', 0.8), detail: { type: 'light', face: '+z', pts: [[-bw * 0.3, 0], [0, 0], [bw * 0.3, 0]], size: 0.5 } });
        ctx.anims.push((st, n) => { n.sensorBar.rot[1] = lifeT(st) * 2.2; });
        break;
      }
    }
  }

  // ------------------------------------------------------------- reactions: hit, extras, stance, deaths
  // Full animation state for build-time pose sampling.
  const ST0 = { phase: 0, move: 0, t: 0, fire: 0, fireN: 1, run: 0, hit: null, hitN: 1, hitDir: 0, death: null, deathType: null, deathSeed: 1, act: null };
  function samplePose(ctx, st) {
    const nodes = ctx.mod.nodes || (ctx.mod.nodes = MF.findNodes(ctx.root));
    ctx.root.reset();
    const full = Object.assign({}, ST0, st);
    for (const a of ctx.anims) a(full, nodes);
    MF.updateRig(ctx.root, IDENT, []);
    return nodes;
  }

  // Rest the unit on the floor: its lowest contact point lands exactly on y = 0.
  function snapToFloor(ctx) {
    const D = ctx.mod;
    if (!D.soles.length) return;
    MF.updateRig(ctx.root, IDENT, []);
    let lo = Infinity;
    for (const p of D.soles) lo = Math.min(lo, primMinY(p));
    if (!isFinite(lo)) return;
    for (const c of ctx.root.children) if (!c.name.startsWith('fx_')) { c.pos[1] -= lo; c.base.pos[1] -= lo; }
  }

  // Every prim of the standing body (not effects, flashes or copies) is checked by the floor clamp.
  function markBody(ctx) {
    (function walk(nd) {
      if (nd.startHidden || nd.name.startsWith('fx_')) return;
      for (const p of nd.prims) p._body = true;
      nd.children.forEach(walk);
    })(ctx.root);
  }
  // Lift the whole body so nothing pokes through the floor (wrecks rest on their lowest point).
  function floorClamp(ctx, n) {
    const D = ctx.mod;
    const prims = MF.updateRig(ctx.root, IDENT, []);
    let lo = Infinity;
    for (const p of prims) {
      if (!p._body || p.world[10] - p.brad > lo) continue;
      const y = primMinY(p);
      if (y < lo) lo = y;
    }
    const lift = D.floorY - lo;
    if (lift > 0 && isFinite(lift)) for (const nm of D.tops) if (n[nm]) n[nm].pos[1] += lift;
  }

  // Fireball like MF.FX.explosion, but everything stays above the floor: debris lands flat instead of frozen
  // mid-spin (the tumbling is done by the blown-off chunks) and low blasts only throw fire upward.
  function blast(parent, o) {
    const FX = MF.FX, s = o.scale || 1, n = o.name, t0 = o.start || 0, low = o.origin[1] < 14 * s;
    return FX.group([
      FX.burst(parent, n + 'L', { kind: 'flash', count: 1, origin: o.origin, dir: [0, 1, 0], spread: 0, seed: o.seed, start: t0, stagger: 0, scale: s }),
      FX.burst(parent, n + 'F', { kind: 'fire', count: Math.round(16 * s), origin: o.origin, dir: [0, low ? 1 : 0.6, 0], spread: low ? 0.9 : 1.4, seed: o.seed, start: t0, stagger: 0.12, scale: s }),
      FX.burst(parent, n + 'S', { kind: 'smoke', count: Math.round(10 * s), origin: o.origin, dir: [0, 1, 0], spread: 0.9, seed: o.seed + 5, start: t0 + 0.15, stagger: 0.5, scale: s }),
      FX.burst(parent, n + 'K', { kind: 'spark', count: Math.round(18 * s), origin: o.origin, dir: [0, 0.8, 0], spread: 1.3, seed: o.seed + 7, start: t0 }),
      FX.burst(parent, n + 'E', { kind: 'ember', count: Math.round(10 * s), origin: o.origin, dir: [0, 1, 0], spread: 0.9, seed: o.seed + 9, start: t0 + 0.1, stagger: 0.4 }),
      FX.burst(parent, n + 'D', { kind: 'debris', spin: 0, count: Math.max(1, Math.round((o.debris || 10) * s)), origin: o.origin, dir: [0, 1, 0], spread: 1.3, seed: o.seed + 13, mats: ['metal', 'primary', 'secondary'], start: t0, scale: s }),
      FX.pool(parent, n + 'X', { origin: [o.origin[0], 0, o.origin[2]], radius: 12 * s, mat: 'scorch', seed: o.seed, start: t0 + 0.05, grow: 0.5, blobs: 5 }),
    ]);
  }

  // A part copied (as currently posed) into a hidden node under the root. On cue the original hides and the
  // copy flies a ballistic arc, tumbling into its resting orientation exactly as it lands on the floor.
  function makeChunk(ctx, src, o) {
    const D = ctx.mod, k = ctx.k;
    const piv = o.pivot || [src.world[9], src.world[10], src.world[11]];
    const node = new MF.Node('fx_chunk_' + o.name);
    node.startHidden = true;
    ctx.root.add(node);
    const pts = [];
    (function walk(nd) {
      if (nd.startHidden || nd.name.startsWith('fx_') || (o.skip && o.skip.includes(nd.name))) return;
      for (const p of nd.prims) {
        const q = new MF.Prim(p.planes, [p.hx, p.hy, p.hz], { mat: p.mat, detail: p.detail, shadow: p.shadow, noOutline: p.noOutline, kind: p.kind, axis: p.axis });
        q.local.set(p.world); q.local[9] -= piv[0]; q.local[10] -= piv[1]; q.local[11] -= piv[2];
        q.node = node; node.prims.push(q);
        const v = primVerts(p), m = q.local;
        for (let i = 0; i < v.length; i += 3) pts.push(m[0] * v[i] + m[1] * v[i + 1] + m[2] * v[i + 2] + m[9], m[3] * v[i] + m[4] * v[i + 1] + m[5] * v[i + 2] + m[10], m[6] * v[i] + m[7] * v[i + 1] + m[8] * v[i + 2] + m[11]);
      }
      nd.children.forEach(walk);
    })(src);
    const R = MF.mat();
    const lowest = (rx, ry, rz) => {
      MF.matFromEuler(R, 0, 0, 0, rx, ry, rz);
      let lo = Infinity;
      for (let i = 0; i < pts.length; i += 3) { const y = R[3] * pts[i] + R[4] * pts[i + 1] + R[5] * pts[i + 2]; if (y < lo) lo = y; }
      return lo === Infinity ? 0 : lo;
    };
    const g = (o.grav || 170) * k, vel = o.vel.map((v) => v * k), fin = o.rot;
    const restY = D.floorY - lowest(fin[0], fin[1], fin[2]);
    const vy = vel[1];
    const tLand = Math.max(0.05, (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * (piv[1] - restY)))) / g);
    const slideT = 0.18;
    return {
      node, src, tLand,
      land: [(piv[0] + vel[0] * (tLand + slideT * 0.3)) / k, (piv[2] + vel[2] * (tLand + slideT * 0.3)) / k],
      update(tt) {
        if (tt == null || tt < 0) return;
        if (!o.keepSrc) src.hidden = true;
        node.hidden = false;
        const tl = Math.min(tt, tLand), u = tl / tLand;
        const sl = tt > tLand ? Math.min(tt - tLand, slideT) * 0.3 : 0;
        const rx = fin[0] * u, ry = fin[1] * u, rz = fin[2] * u;
        let y = tt >= tLand ? restY : piv[1] + vy * tt - 0.5 * g * tt * tt;
        y = Math.max(y, D.floorY - lowest(rx, ry, rz));
        node.pos[0] = piv[0] + vel[0] * (tl + sl); node.pos[1] = y; node.pos[2] = piv[2] + vel[2] * (tl + sl);
        node.rot[0] = rx; node.rot[1] = ry; node.rot[2] = rz;
      },
    };
  }

  // Hit: a stagger away from the shot (torso snaps back, pelvis knocked aside, arms jolt) plus sparks and a
  // puff of smoke on the side the hit came from. The spark rig yaws to st.hitDir; two seeds alternate.
  function addHit(ctx) {
    const D = ctx.mod, k = ctx.k, tor = D.tor;
    ctx.info.customHit = true;
    ctx.info.dur.hit = 0.5;
    const piv = new MF.Node('fx_hitPivot');
    ctx.root.add(piv);
    MF.updateRig(ctx.root, IDENT, []);
    const tw = D.nodesRest.torso.world;
    const cy = (tw[10] + tor.chestY * k) / k, fz = tor.frontZ + 2;
    const sets = [0, 1].map((i) => MF.FX.hitSparks(piv, { name: 'mhit' + i, origin: [i ? -2 : 2, cy + (i ? 1.5 : -1), fz], dir: [i ? -0.3 : 0.3, 0.45, 1], seed: 11 + i * 7 }));
    const legged = D.legged, amp = D.hard ? 0.5 : 1;
    ctx.anims.push((st, n) => {
      if (st.hit == null || st.death != null || st.hit < 0) return;
      const t = st.hit, a = st.hitDir || 0, sx = Math.sin(a), sz = Math.cos(a);
      const kick = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 7);
      const wob = Math.sin(t * 36) * Math.exp(-t * 8);
      n.torso.rot[0] -= 0.2 * sz * kick * amp; n.torso.rot[2] += 0.2 * sx * kick * amp; n.torso.rot[1] += 0.06 * wob;
      n.pelvis.pos[0] -= sx * 1.8 * kick * k * amp; n.pelvis.pos[2] -= sz * 1.8 * kick * k * amp;
      if (legged) n.pelvis.pos[1] -= 0.9 * kick * k; // knees give a little
      if (n.neck) n.neck.rot[0] += 0.12 * sz * kick * amp; // the head stays level
      for (const s of [-1, 1]) if (n['shoulder' + s] && !D.hard) { n['shoulder' + s].rot[0] -= 0.22 * sz * kick; n['shoulder' + s].rot[2] += s * 0.12 * kick; }
      piv.rot[1] = a;
      sets[(st.hitN | 0) & 1].update(t);
    });
  }

  // Extras: 'reload' (guns, rocket pods, launchers, back pods, shoulder cannon) and 'block' (shields).
  function addExtras(ctx) {
    const D = ctx.mod, k = ctx.k, info = ctx.info, hard = D.hard;
    info.dur.reload = 1.4; info.dur.block = 1.1;
    const late = []; // effects placed from a sampled pose once every animator is in
    if (D.reload.length) {
      info.extras.push('reload');
      const dur = info.dur.reload;
      const armR = D.reload.filter((q) => q.s && (RANGED[q.type])).map((q) => q.s);
      const drops = [];
      ctx.anims.push((st, n) => {
        if (!st.act || st.act.name !== 'reload' || st.death != null) return;
        const t = st.act.t, u = t / dur;
        const up = ramp(u, 0, 0.2) * (1 - ramp(u, 0.8, 1));
        const clunk = u > 0.72 ? Math.exp(-(t - 0.72 * dur) * 14) : 0;
        for (const q of D.reload) {
          const s = q.s;
          if (RANGED[q.type] && n['elbow' + s]) {
            if (hard) n['elbow' + s].rot[0] += 0.5 * up - 0.1 * clunk; // the mount tips up to swap the magazine
            else {
              n['shoulder' + s].rot[0] -= 0.5 * up; n['shoulder' + s].rot[1] -= s * 0.35 * up; n['elbow' + s].rot[0] -= 0.75 * up - 0.12 * clunk;
              n.torso.rot[1] += s * 0.1 * up;
            }
            const mg = n['mag' + s];
            if (mg) {
              const out = ramp(u, 0.22, 0.34), back = ramp(u, 0.52, 0.72);
              if (q.type === 'missiles') { mg.pos[1] += (out - back) * 3 * k; mg.rot[0] += (out - back) * 0.4; }
              else { // slide the magazine out, swap it, slide the new one home
                const b = mg.base.pos, l = Math.hypot(b[0], b[2]) || 1, d = (out - back) * 4 * k;
                mg.pos[0] += (b[0] / l) * d; mg.pos[2] += (b[2] / l) * d; mg.hidden = u > 0.34 && u < 0.52;
              }
            }
          } else if (q.type === 'launcher' && n['launch' + s]) {
            n['launch' + s].rot[0] += 0.9 * up;
          } else if (q.type === 'backPods') {
            for (const id of ['bkR', 'bkL']) if (n[id + 'pod']) n[id + 'pod'].rot[0] += 0.8 * up - 0.1 * clunk;
          } else if (q.type === 'artillery') {
            for (const id of ['bkR', 'bkL']) if (n[id + 'gun']) { n[id + 'gun'].rot[0] -= 0.6 * up; n[id + 'slide'] && (n[id + 'slide'].pos[2] -= 2 * up * k); }
          }
        }
        for (const dr of drops) dr.c.update(st.act.t - dr.t0);
      });
      // spent magazines tumble to the floor
      late.push(() => {
        for (const s of armR) {
          const t0 = 0.34 * dur;
          const N = samplePose(ctx, { act: { name: 'reload', t: t0 } });
          const mg = N['mag' + s];
          if (!mg || ctx.bp[s < 0 ? 'armL' : 'armR'] === 'missiles') continue;
          drops.push({ t0, c: makeChunk(ctx, mg, { name: 'mag' + s, vel: [s * 10, 6, -6], rot: [PI / 2, 0.6 * s, PI * s], grav: 190, keepSrc: true }) });
        }
      });
    }
    if (D.shields.length) {
      info.extras.push('block');
      const dur = info.dur.block, tHit = 0.42 * dur;
      const fxHolder = [];
      ctx.anims.push((st, n) => {
        if (!st.act || st.act.name !== 'block' || st.death != null) return;
        const t = st.act.t, u = t / dur;
        const up = ramp(u, 0, 0.2) * (1 - ramp(u, 0.8, 1));
        const kick = t > tHit ? Math.exp(-(t - tHit) * 10) : 0;
        for (const s of D.shields) {
          if (hard) { n['elbow' + s].rot[1] -= s * 0.7 * up; continue; }
          n['shoulder' + s].rot[0] -= 0.7 * up - 0.15 * kick; n['shoulder' + s].rot[1] -= s * 0.5 * up; n['elbow' + s].rot[0] -= 0.3 * up;
          n.torso.rot[1] += s * 0.28 * up;
        }
        n.torso.rot[0] += 0.05 * up - 0.1 * kick;
        n.pelvis.pos[1] -= (1.6 * up + 0.8 * kick) * k * (D.legged ? 1 : 0.3);
        n.pelvis.pos[2] -= 1.4 * kick * k;
        for (const f of fxHolder) f.update(t - tHit);
      });
      late.push(() => {
        const s = D.shields[0];
        const N = samplePose(ctx, { act: { name: 'block', t: tHit } });
        const pl = N['shd' + s + 'plate'] || N['wrist' + s];
        if (!pl) return;
        const w = pl.world, p = [(w[9]) / k, (w[10] - D.floorY) / k, (w[11]) / k + 3];
        const gnd = D.fxGround;
        fxHolder.push(MF.FX.hitSparks(gnd, { name: 'mblk', origin: p, dir: [s * 0.4, 0.5, 1], seed: 23 }));
        fxHolder.push(MF.FX.burst(gnd, 'mblkF', { kind: 'flash', count: 1, origin: p, spread: 0, seed: 5, scale: 0.35, stagger: 0 }));
      });
    }
    return late;
  }

  // Contrapposto idle (legged chassis): one foot a little forward, the other back, hips yawed toward the
  // front foot and rolled onto the straighter back leg, torso counter-twisted, arms asymmetric, a slow weight
  // shift and breath. Both feet stay planted: a 2-bone IK re-solves each leg against the final pelvis. Blends
  // out as the walk starts. Pushed after everything that moves the pelvis (attacks, hits, extras).
  function addStance(ctx) {
    const D = ctx.mod, k = ctx.k, T = D.leg.T * k, S = D.leg.S * k;
    const sF = D.shields.length ? D.shields[0] : ctx.r.chance(0.5) ? 1 : -1;
    MF.updateRig(ctx.root, IDENT, []);
    const N = MF.findNodes(ctx.root);
    const rest = {};
    for (const s of [-1, 1]) { const a = N['ankle' + s].world; rest[s] = { hip: N['hipS' + s].pos.slice(), ank: [a[9], a[10], a[11]] }; }
    const M = MF.mat();
    const fwd = 6 * k, bk = 4.6 * k;
    ctx.anims.push((st, n) => {
      const m = Math.min(1, st.move || 0), t = st.t || 0;
      const w = (1 - m) * (1 - m);
      if (!(w > 0)) return;
      const shift = Math.sin(t * 0.45), breath = 0.5 + 0.5 * Math.sin(t * 1.3);
      const psi = -sF * 0.13 * w, rho = -sF * (0.045 + 0.012 * shift) * w;
      const pel = n.pelvis;
      pel.pos[0] += -sF * (0.8 + 0.3 * shift) * w * k;
      pel.pos[1] -= (1.1 + 0.4 * breath) * w * k;
      pel.pos[2] -= 0.4 * w * k;
      pel.rot[1] += psi; pel.rot[2] += rho;
      MF.matFromEuler(M, pel.pos[0], pel.pos[1], pel.pos[2], pel.rot[0], pel.rot[1], pel.rot[2]);
      for (const s of [-1, 1]) {
        const h = rest[s].hip, A = rest[s].ank;
        const hx = M[0] * h[0] + M[1] * h[1] + M[2] * h[2] + M[9], hy = M[3] * h[0] + M[4] * h[1] + M[5] * h[2] + M[10], hz = M[6] * h[0] + M[7] * h[1] + M[8] * h[2] + M[11];
        const wx = A[0] - hx, wy = A[1] - hy, wz = A[2] + (s === sF ? fwd : -bk) * w - hz;
        const vx = M[0] * wx + M[3] * wy + M[6] * wz, vy = M[1] * wx + M[4] * wy + M[7] * wz, vz = M[2] * wx + M[5] * wy + M[8] * wz;
        const th = Math.atan2(vx, -vy), r = Math.hypot(vx, vy);
        const cb = Math.max(-1, Math.min(1, (vz * vz + r * r - T * T - S * S) / (2 * T * S)));
        const be = Math.acos(cb);
        const al = Math.atan2(-vz, r) - Math.atan2(S * Math.sin(be), T + S * Math.cos(be));
        const bl = (node, i, v) => { node.rot[i] += (v - node.rot[i]) * w; };
        bl(n['hipS' + s], 2, th); bl(n['hip' + s], 0, al); bl(n['knee' + s], 0, be);
        bl(n['ankle' + s], 0, -(al + be)); bl(n['foot' + s], 2, -(pel.rot[2] + th));
        if (D.leg.kind === 'strider') n['foot' + s].rot[0] += (0 - n['foot' + s].rot[0]) * w;
      }
      n.torso.rot[1] -= psi * 1.4; n.torso.rot[2] -= rho * 1.6; n.torso.rot[0] += 0.02 * shift * w;
      if (n.head) { n.head.rot[1] += psi * 0.4 * w; n.head.rot[2] += rho * 0.6; }
      if (n['shoulder' + sF]) { n['shoulder' + sF].rot[0] += 0.09 * w; n['shoulder' + sF].rot[2] += sF * 0.03 * w; }
      if (n['shoulder' + -sF]) n['shoulder' + -sF].rot[0] -= 0.06 * w;
      if (n['elbow' + -sF]) n['elbow' + -sF].rot[0] -= 0.1 * w;
    });
  }

  // Deaths. 'explode': a shudder, then a fireball blows the head, arms, pack (turret, legs) off and they tumble
  // onto the floor and burn while the hull is flung down, burning, with a secondary blast, smoke and a scorch
  // mark. 'collapse': the legs give out (walkers splay flat, tanks brew up through the hatch, hovers drop out
  // of the air), sparks, a crash of dust and a smoke column. Pushed last so it overrides every other pose.
  function addDeaths(ctx) {
    const D = ctx.mod, k = ctx.k, F = D.frame, tor = D.tor, info = ctx.info;
    info.deaths.push('explode', 'collapse');
    info.dur.death = 3.2;
    const r = new RNG(((ctx.bp.seed || 1) * 7919) ^ 0x5bd1e995);
    const seed = ((ctx.bp.seed || 1) % 997) + 3;
    const g = D.fxGround;
    const N = D.nodesRest;
    const up = (nd, dy = 0) => [nd.world[9] / k, (nd.world[10] - D.floorY) / k + dy, nd.world[11] / k];
    const chest = up(N.torso, tor.chestY);
    const S = Math.max(0.75, Math.min(1.5, chest[1] / 42)) * (D.hard ? 1.1 : 1);
    const FX = MF.FX, fx = (list) => FX.group(list);
    // ----- explode
    const T0 = 0.32;
    const chunks = [];
    const chunk = (name, o = {}) => {
      const nd = N[name];
      if (!nd || !nd.prims && !nd.children.length) return;
      const p = up(nd);
      let dx = p[0] - chest[0], dz = p[2] - chest[2];
      const l = Math.hypot(dx, dz);
      if (l < 1.5) { const a = r.range(0, TAU); dx = Math.sin(a); dz = Math.cos(a); } else { dx /= l; dz /= l; }
      const sp = (o.speed || 34) * r.range(0.8, 1.2);
      const vel = [dx * sp + r.range(-5, 5), (o.up || 62) * r.range(0.85, 1.15), dz * sp + r.range(-5, 5)];
      const turns = o.turns == null ? r.int(1, 2) : o.turns;
      const rot = o.rot || [(r.chance(0.5) ? 1 : -1) * (PI / 2 + TAU * turns), r.range(-2.5, 2.5), (r.chance(0.5) ? 1 : -1) * r.range(0, 0.6) + (r.chance(0.3) ? PI : 0)];
      const c = makeChunk(ctx, nd, { name, vel, rot, skip: o.skip });
      const land = [c.land[0], 3, c.land[1]];
      const burn = FX.burst(g, 'dxCF' + name, { kind: 'fire', count: o.fire || 4, origin: land, dir: [0, 1, 0], spread: 0.5, seed: seed + chunks.length, start: T0 + (o.delay || 0) + c.tLand, stagger: 1.6, scale: 0.45, life: [0.3, 0.7] });
      chunks.push({ c, delay: o.delay || 0, burn });
    };
    if (F === 'tank') chunk('torso', { speed: 12, up: 105, turns: 1, rot: [TAU + (r.chance(0.5) ? PI : 0.3), r.range(-3, 3), 0.2], fire: 7 }); // turret toss
    else {
      for (const s of [-1, 1]) { chunk('shoulder' + s, { speed: 40, up: 55 }); chunk('pad' + s, { speed: 46, up: 70 }); }
      chunk('neck', { speed: 30, up: 80 }); chunk('back', { speed: 26, up: 72 });
    }
    const legOff = F === 'spider' ? [0, 3] : F === 'crawler' ? [1, 2, 4] : [];
    for (const i of legOff) chunk('leg' + i, { speed: 36, up: 48, turns: 1 });
    if (F === 'quadruped') chunk('qhip' + (r.chance(0.5) ? 0 : 1), { speed: 34, up: 50, turns: 1 });
    // wreck fires and smoke are placed on the hull where it actually comes to rest (sampled once the
    // death animator exists, see the returned function)
    let fxE = null, fxC = null;
    const crashT = F === 'hover' ? 0.62 : D.legged ? 1.12 : F === 'tank' ? 0.25 : 0.72;
    const makeFxE = (hull) => fx([
      FX.hitSparks(g, { name: 'dxPre', origin: [chest[0] + 3, chest[1] + 2, chest[2] + tor.frontZ], dir: [0.3, 0.6, 0.6], seed: seed + 1 }),
      FX.burst(g, 'dxPop', { kind: 'fire', count: 4, origin: [chest[0] - tor.shX * 0.8, chest[1] + 3, chest[2]], dir: [-0.5, 1, 0], spread: 0.6, seed: seed + 2, start: 0.1, stagger: 0.08, scale: 0.45 }),
      blast(g, { name: 'dxBoom', origin: chest, seed, scale: 1.35 * S, start: T0, debris: 12 }),
      blast(g, { name: 'dxB2', origin: [hull[0] + 4, hull[1] + 3, hull[2] - 2], seed: seed + 17, scale: 0.6 * S, start: 1.3, debris: 4 }),
      FX.burst(g, 'dxBurn', { kind: 'fire', count: 22, origin: hull, dir: [0, 1, 0], spread: 0.8, seed: seed + 3, start: T0 + 0.45, stagger: 2.4, scale: 0.85 * S, life: [0.4, 0.9] }),
      FX.burst(g, 'dxEmb', { kind: 'ember', count: 10, origin: hull, dir: [0, 1, 0], spread: 0.9, seed: seed + 4, start: T0 + 0.6, stagger: 2 }),
      FX.smokeTrail(g, { name: 'dxSmk', origin: [hull[0], Math.max(hull[1] + 4, 7 * S), hull[2]], seed: seed + 5, start: T0 + 0.7, stagger: 2.2, count: 10, scale: 0.95 * S }),
    ].concat(chunks.map((c) => c.burn)));
    // ----- collapse
    const hatch = tor.hatch ? up(N.torso, 0) : null;
    if (hatch) { hatch[0] += tor.hatch[0]; hatch[1] += tor.hatch[1]; hatch[2] += tor.hatch[2]; }
    const knees = D.legged ? [-1, 1].map((s) => up(N['knee' + s])) : [];
    const makeFxC = (landAt) => {
    if (F === 'tank') landAt = hatch || chest;
    const cList = [];
    if (F === 'tank') {
      cList.push(blast(g, { name: 'dcPop', origin: landAt, seed: seed + 9, scale: 0.4, start: 0.22, debris: 3 }));
      cList.push(FX.burst(g, 'dcJet', { kind: 'fire', count: 20, origin: landAt, dir: [0, 1, 0], spread: 0.3, speed: [12, 30], seed: seed + 10, start: 0.3, stagger: 2.6, scale: 0.75, life: [0.35, 0.75] }));
      cList.push(FX.smokeTrail(g, { name: 'dcSmk', origin: [landAt[0], landAt[1] + 5, landAt[2]], seed: seed + 11, start: 0.45, stagger: 2.5, count: 12, scale: 1.1 }));
      cList.push(FX.burst(g, 'dcEmb', { kind: 'ember', count: 10, origin: landAt, dir: [0, 1, 0], spread: 0.6, seed: seed + 12, start: 0.35, stagger: 2.3 }));
    } else {
      const sparkAt = knees.length ? knees : [[chest[0], Math.max(3, chest[1] * 0.35), chest[2]]];
      sparkAt.forEach((p, i) => cList.push(FX.burst(g, 'dcK' + i, { kind: 'spark', count: 10, origin: p, dir: [i ? 1 : -1, 0.6, 0.4], spread: 0.9, seed: seed + 20 + i, start: 0.12 + i * 0.1, stagger: 0.12 })));
      cList.push(FX.burst(g, 'dcDust', { kind: 'smoke', count: 8, origin: [landAt[0], 4.5 * S, landAt[2]], dir: [0, 1, 0], spread: 0.9, speed: [8, 20], seed: seed + 13, start: crashT, stagger: 0.12, scale: 0.55 * S, life: [0.7, 1.3] }));
      cList.push(FX.burst(g, 'dcSpk', { kind: 'spark', count: 14, origin: landAt, dir: [0, 0.8, 0], spread: 1.3, seed: seed + 14, start: crashT, stagger: 0.1 }));
      cList.push(FX.smokeTrail(g, { name: 'dcSmk', origin: [landAt[0], Math.max(landAt[1] + 3, 6 * S), landAt[2]], seed: seed + 15, start: crashT + 0.2, stagger: 2, count: 9, scale: 0.85 * S }));
      cList.push(FX.burst(g, 'dcFire', { kind: 'fire', count: 12, origin: [landAt[0], landAt[1] + 2, landAt[2]], dir: [0, 1, 0], spread: 0.6, seed: seed + 16, start: crashT + 0.25, stagger: 1.8, scale: 0.65 * S, life: [0.35, 0.8] }));
      cList.push(FX.pool(g, 'dcOil', { origin: [landAt[0], 0, landAt[2]], radius: 9 * S, mat: 'scorch', seed: seed + 17, start: crashT, grow: 0.8, blobs: 3 }));
    }
    return fx(cList);
    };

    // body poses ------------------------------------------------------------
    const legs = D.legs || [];
    const set = (node, i, v, w) => { node.rot[i] += (v - node.rot[i]) * w; };
    const legBuckle = (n, w, hipT, kneeT, ankT) => {
      for (const s of [-1, 1]) { set(n['hip' + s], 0, hipT, w); set(n['knee' + s], 0, kneeT, w); set(n['ankle' + s], 0, ankT, w); set(n['hipS' + s], 2, s * 0.12, w); }
    };
    const splay = (n, i, w) => { set(n['femur' + i], 2, -0.05, w); set(n['knee' + i], 2, 1.64, w); set(n['coxa' + i], 1, 0, w); };
    const hipH = D.legged ? D.leg.hipY : F === 'hover' ? D.lift + 12 : F === 'quadruped' ? D.quad.H : D.hub ? D.hub.H : 4;
    const strider = D.legged && D.leg.kind === 'strider';
    ctx.anims.push((st, n) => {
      if (st.death == null || st.death < 0) return;
      const t = st.death, sg = ((st.deathSeed | 0) & 1) ? 1 : -1;
      const boom = st.deathType !== 'collapse';
      // machinery stops: mounted radars freeze, thrusters and jets die
      for (const id of ['bkR', 'bkL']) if (n[id + 'dish']) n[id + 'dish'].rot[1] = 0.6;
      if (n.jets) n.jets.hidden = boom ? t > T0 : t > 0.08;
      if (boom) {
        const sh = t < T0 ? t / T0 : 0; // shudder building to the blast
        n.torso.rot[2] += Math.sin(t * 63) * 0.05 * sh; n.pelvis.pos[0] += Math.sin(t * 81) * 0.6 * k * sh;
        const kb = ramp(t, T0, T0 + 0.28), fall = clamp01((t - T0 - 0.12) / 0.7), fe = fall * fall;
        if (D.legged) { // flung back off its feet, legs kicking up, crashing onto its back
          n.pelvis.pos[2] -= 7 * k * kb;
          n.pelvis.rot[0] -= 1.3 * fe; n.pelvis.rot[2] += sg * 0.3 * fe;
          n.pelvis.pos[1] -= hipH * k * fe;
          for (const s of [-1, 1]) { n['knee' + s].rot[0] += (0.8 + 0.3 * s * sg) * fe; n['hip' + s].rot[0] -= 0.4 * fe; }
          n.torso.rot[0] -= 0.25 * fe;
        } else if (F === 'spider' || F === 'crawler') {
          legs.forEach((L, j) => splay(n, L.i, ramp(t, T0 + 0.05 * j, T0 + 0.35 + 0.05 * j)));
          n.pelvis.pos[1] -= hipH * k * fe * 1.2; n.pelvis.rot[2] += sg * 0.12 * fe;
        } else if (F === 'quadruped') {
          for (const L of legs) { set(n['qhip' + L.i], 2, L.s * 1.2, ramp(t, T0, T0 + 0.5)); n['qknee' + L.i].rot[0] += 0.5 * kb; }
          n.pelvis.pos[1] -= hipH * k * fe * 1.2; n.pelvis.rot[2] += sg * 0.15 * fe; n.pelvis.rot[0] += 0.1 * fe;
        } else if (F === 'tank') {
          n.pelvis.pos[1] += Math.sin(PI * clamp01((t - T0) / 0.3)) * 2 * k; n.pelvis.rot[0] -= 0.05 * kb; n.pelvis.rot[2] += sg * 0.03 * kb;
        } else { // hover: the hull drops out of the air, tilting
          const u = clamp01((t - T0) / 0.5);
          n.pelvis.pos[1] -= hipH * k * u * u; n.pelvis.rot[2] += sg * 0.35 * ramp(t, T0, T0 + 0.5); n.pelvis.rot[0] += 0.15 * ramp(t, T0, T0 + 0.5);
        }
        for (const c of chunks) c.c.update(t - T0 - c.delay);
        if (fxE) fxE.update(t);
      } else {
        if (D.legged) { // knees buckle, it drops to its knees, then topples onto its face
          const b = ramp(t, 0.12, 0.7), tp = clamp01((t - 0.62) / 0.5), te = tp * tp;
          if (strider) legBuckle(n, b, -1.1, 2.3, -0.5); else legBuckle(n, b, -0.25, 2.1, -0.7);
          legBuckle(n, te, strider ? -0.2 : -0.1, strider ? 0.25 : 0.35, 0.25); // legs slide out flat behind
          n.pelvis.pos[1] -= hipH * k * (0.55 * b + 0.5 * te);
          n.pelvis.rot[0] += 1.35 * te; n.pelvis.rot[2] += sg * 0.22 * te;
          n.torso.rot[0] += 0.12 * b - 0.05 * te;
          for (const s of [-1, 1]) if (n['shoulder' + s]) { n['shoulder' + s].rot[0] -= 0.7 * te; n['shoulder' + s].rot[2] += s * 0.25 * te; }
          n.pelvis.pos[1] += Math.sin(PI * clamp01((t - 1.12) / 0.22)) * 1.2 * k; // bounce on impact
        } else if (F === 'spider' || F === 'crawler') { // legs give out one by one and splay flat
          legs.forEach((L, j) => splay(n, L.i, ramp(t, 0.12 + 0.06 * j, 0.5 + 0.06 * j)));
          const u = clamp01((t - 0.2) / 0.52);
          n.pelvis.pos[1] -= hipH * k * 1.2 * u * u; n.pelvis.rot[2] += sg * 0.08 * u;
          n.torso.rot[0] += 0.06 * ramp(t, 0.6, 0.9);
        } else if (F === 'quadruped') { // front legs buckle, then the hind legs; the hull slams down
          const wf = ramp(t, 0.1, 0.45), wh = ramp(t, 0.35, 0.75);
          for (const L of legs) { const w = L.front ? wf : wh; set(n['qhip' + L.i], 2, L.s * 1.15, w); n['qknee' + L.i].rot[0] += (L.front ? -0.5 : 0.5) * w; }
          n.pelvis.pos[1] -= hipH * k * (0.6 * wf + 0.6 * wh); n.pelvis.rot[0] += 0.22 * wf - 0.22 * wh; n.pelvis.rot[2] += sg * 0.1 * wh;
        } else if (F === 'tank') { // brews up: the hatch blows open, fire and smoke pour out, the turret sags
          if (n.hatch) n.hatch.rot[0] -= 1.9 * ramp(t, 0.2, 0.32);
          n.torso.pos[1] += Math.sin(PI * clamp01((t - 0.2) / 0.16)) * 1.4 * k;
          const sag = ramp(t, 0.3, 1.4);
          n.torso.rot[0] += 0.04 * sag; n.torso.rot[2] += sg * 0.035 * sag;
          for (const s of [-1, 1]) if (n['elbow' + s]) n['elbow' + s].rot[0] += 0.3 * sag;
          if (n.bkRgun) n.bkRgun.rot[0] += 0.3 * sag; if (n.bkLgun) n.bkLgun.rot[0] += 0.3 * sag;
          n.pelvis.pos[1] -= 0.8 * k * sag;
        } else { // hover: the thrusters cut and it drops like a stone
          const u = clamp01(t / crashT);
          n.pelvis.pos[1] -= hipH * k * u * u; n.pelvis.rot[2] += sg * 0.3 * ramp(t, 0.05, crashT); n.pelvis.rot[0] += 0.18 * ramp(t, 0.05, crashT);
          for (const s of [-1, 1]) if (n['shoulder' + s]) { n['shoulder' + s].rot[0] -= 1.2 * ramp(t, 0, crashT * 0.8); n['shoulder' + s].rot[2] += s * 0.5 * ramp(t, 0, crashT); }
          n.pelvis.pos[1] += Math.sin(PI * clamp01((t - crashT) / 0.2)) * 1.5 * k;
        }
        if (fxC) fxC.update(t);
      }
      floorClamp(ctx, n);
    });
    return () => { // sample where the hull lies at the end of each death and hang the effects there
      const at = (type) => {
        const Np = samplePose(ctx, { death: 2.8, deathType: type, deathSeed: 2 });
        const w = Np.torso.world, cy = tor.chestY * k;
        return [(w[1] * cy + w[9]) / k, Math.max(2, (w[4] * cy + w[10] - D.floorY) / k), (w[7] * cy + w[11]) / k];
      };
      const hullE = F === 'tank' ? [0, D.tank.th + 2, 0] : at('explode');
      fxE = makeFxE([hullE[0], hullE[1] + 2, hullE[2]]);
      fxC = makeFxC(at('collapse'));
    };
  }

  // Everything after the parts: floor contact, reactions, stance, deaths.
  function finishMod(ctx) {
    const D = ctx.mod, root = ctx.root;
    D.floorY = D.frame === 'hover' ? -D.lift * ctx.k : 0;
    if (D.frame !== 'hover') snapToFloor(ctx);
    markBody(ctx);
    MF.updateRig(root, IDENT, []);
    D.nodesRest = MF.findNodes(root);
    D.fxGround = new MF.Node('fx_gnd', [0, D.floorY, 0]);
    root.add(D.fxGround);
    addHit(ctx);
    const late = addExtras(ctx);
    if (D.legged) addStance(ctx);
    MF.updateRig(root, IDENT, []);
    late.push(addDeaths(ctx));
    ctx.fireDecay = MELEE[ctx.bp.armL] || MELEE[ctx.bp.armR] ? 2.2 : 5;
    for (const f of late) f();
    D.nodes = null;
    root.reset(); // effect nodes start hidden, so the build's bounds only see the unit
  }

  function buildModular(ctx) {
    const { bp } = ctx;
    setupMod(ctx);
    const hub = buildFrame(ctx);           // returns the node the torso sits on
    const tor = buildTorso(ctx, hub);      // returns anchors
    buildHead(ctx, tor);
    buildArm(ctx, tor, -1, bp.armL);
    buildArm(ctx, tor, 1, bp.armR);
    buildBack(ctx, tor);
    finishMod(ctx);
  }


  const slot = (key, label, opt) => ({ key, label, options: OPTIONS[opt || key], labels: LABELS[opt || key] });
  registerLine('modular', {
    label: 'Modular frame', group: 'Mechs', weight: 2,
    slots: [slot('frame', 'Chassis'), slot('torso', 'Torso'), slot('head', 'Head'), slot('armL', 'Left arm', 'arm'), slot('armR', 'Right arm', 'arm'), slot('shoulders', 'Shoulders'), slot('back', 'Backpack'), slot('scheme', 'Paint split')],
    random: randomModular,
    build: buildModular,
    // Military frame palettes lead (see docs/STYLE.md); the rest stay available in the paint menu
    palettes: ['Sand Frame', 'Field Olive', 'Navy Anchor', 'Bone White', 'Titans Navy', 'Ghost Camo', 'Black Knight', 'Zaku Green', 'Hazard', 'Desert Ops', 'Olive Drab'],
  });

  MF.Gen = {
    OPTIONS, LABELS, randomBlueprint, build, NAMES, PREFIX, LINES, registerLine, lineOf,
    // building blocks other lines can reuse
    parts: { buildFrame, frameBiped, buildTorso, greebleTorso, buildHead, buildArm, buildShoulderArmor, buildBack, muzzleFlash },
  };
})();
