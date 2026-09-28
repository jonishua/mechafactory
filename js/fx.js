// Mecha Factory — effects library: blood, gibs, fire, smoke, sparks, debris, pools and scorch marks.
// Every effect is a deterministic function of time (seconds since it was triggered), so deaths and hits bake
// into sprite sheets frame by frame. Particles are real prims parented to a rig node (usually the root), built
// once at rig build time and hidden until their moment.
//
//   const fx = MF.FX.bloodBurst(ctx.root, { origin: [0, 30, 0], dir: [0, 0.4, -1], seed: 7 });
//   ctx.anims.push((st) => fx.update(st.death));   // time in seconds; null/undefined/negative hides everything
(function () {
  const MF = window.MF;
  const TAU = Math.PI * 2;

  // kind defaults: size in px, speed px/s, gravity px/s^2 (negative rises), life s, what happens on the ground
  const KINDS = {
    blood: { mat: 'blood', size: [0.8, 1.5], speed: [14, 34], grav: 150, life: [4, 7], land: 'splat', noOutline: true, shadow: false },
    mist: { mat: 'blood', size: [0.6, 1.0], speed: [22, 48], grav: 90, life: [0.2, 0.5], land: 'vanish', noOutline: true, shadow: false },
    gib: { mat: 'skin', size: [1.6, 3.2], speed: [18, 42], grav: 150, life: [5, 9], land: 'rest', spin: 9, shadow: true },
    debris: { mat: 'metal', size: [1.4, 3.6], speed: [22, 60], grav: 160, life: [5, 9], land: 'rest', spin: 12, shadow: true },
    spark: { mat: 'spark', size: [0.5, 0.9], speed: [28, 70], grav: 110, life: [0.15, 0.5], land: 'vanish', noOutline: true, shadow: false },
    fire: { mat: 'fire', size: [5, 10], speed: [6, 22], grav: -14, life: [0.4, 1.0], land: 'none', grow: [0.5, 1, 0.75], shadow: false },
    flash: { mat: 'spark', size: [14, 16], speed: [0, 1], grav: -1, life: [0.14, 0.18], land: 'none', grow: [0.6, 1], shadow: false },
    smoke: { mat: 'smoke', size: [5, 9], speed: [4, 12], grav: -18, life: [1.6, 3.4], land: 'none', grow: [0.55, 1, 1.35], shadow: false },
    ember: { mat: 'fire', size: [0.6, 1.1], speed: [8, 26], grav: -20, life: [0.6, 1.6], land: 'none', noOutline: true, shadow: false },
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  // A burst of particles. opts: kind, count, origin [x,y,z] (unit px), dir (bias), spread (0..1+ cone width),
  // speed/size/life overrides [min,max], mats (array of materials to pick from), start (s), stagger (s), seed.
  function burst(parent, name, opts) {
    const K = Object.assign({}, KINDS[opts.kind || 'blood'], opts);
    const r = new MF.RNG((opts.seed || 1) * 7919 + name.length * 131);
    const k = MF.getBuildScale();
    const o = opts.origin || [0, 10, 0];
    const dir = norm(opts.dir || [0, 1, 0]);
    const spread = opts.spread == null ? 0.8 : opts.spread;
    const parts = [];
    for (let i = 0; i < (opts.count || 12); i++) {
      // velocity: bias direction plus a random vector inside the spread cone
      let rv = [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)];
      const d = norm([dir[0] + rv[0] * spread, dir[1] + rv[1] * spread, dir[2] + rv[2] * spread]);
      const sp = r.range(K.speed[0], K.speed[1]);
      const sz = r.range(K.size[0], K.size[1]) * (opts.scale || 1);
      const mat = K.mats ? K.mats[Math.floor(r.next() * K.mats.length)] : K.mat;
      const node = parent.child(`fx_${name}_${i}`, [o[0], o[1], o[2]]);
      node.startHidden = true;
      const p = {
        node, v: [d[0] * sp, d[1] * sp, d[2] * sp], o: [o[0] + r.range(-1, 1), o[1] + r.range(-1, 1), o[2] + r.range(-1, 1)],
        delay: (opts.start || 0) + r.range(0, opts.stagger || 0.08), life: r.range(K.life[0], K.life[1]), sz,
        spin: K.spin ? [r.range(-K.spin, K.spin), r.range(-K.spin, K.spin), r.range(-K.spin, K.spin)] : null,
        yaw: r.range(0, TAU), stages: null, drop: null, splat: null,
      };
      const po = { mat, shadow: K.shadow, noOutline: K.noOutline };
      if (K.grow) { // growing puff: a few size stages, one shown at a time
        p.stages = K.grow.map((g, j) => { const s = node.child(`fx_${name}_${i}_s${j}`); s.startHidden = true; s.box(sz * g, sz * g * 0.9, sz * g, { ...po, bevel: sz * g * 0.25, bevelSet: 'round' }); return s; });
      } else {
        p.drop = node.child(`fx_${name}_${i}_d`);
        p.drop.box(sz, sz, sz, { ...po, bevel: sz > 1.5 ? sz * 0.2 : 0 });
        if (K.land === 'splat') {
          p.splat = node.child(`fx_${name}_${i}_p`, [0, 0, 0], [0, p.yaw, 0]);
          p.splat.startHidden = true;
          p.splat.box(sz * 2.4, 0.3, sz * 1.6, { ...po, at: [0, 0.15, 0] });
        }
      }
      parts.push(p);
    }
    const g = K.grav;
    return {
      update(time) {
        if (time == null || time < 0) return; // nodes reset to hidden every frame
        for (const p of parts) {
          const t = time - p.delay;
          if (t < 0 || t > p.life) continue;
          const n = p.node;
          n.hidden = false;
          let x, y, z, landed = false, tl = t;
          if (g > 0) { // ballistic: find the landing time on the floor (y = size/2)
            const r0 = p.sz * 0.5, vy = p.v[1], y0 = p.o[1] - r0;
            const tLand = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * y0))) / g;
            if (t >= tLand) { landed = true; tl = tLand; }
            x = p.o[0] + p.v[0] * tl; z = p.o[2] + p.v[2] * tl;
            y = landed ? r0 : p.o[1] + vy * tl - 0.5 * g * tl * tl;
            if (landed && K.land === 'rest') { // a short slide after touching down
              const slide = Math.min(t - tLand, 0.25) * 0.35;
              x += p.v[0] * slide; z += p.v[2] * slide;
            }
          } else { // rising puffs: drag slows them
            const drag = 1 - Math.exp(-2.2 * t);
            x = p.o[0] + p.v[0] * drag / 2.2; z = p.o[2] + p.v[2] * drag / 2.2;
            y = p.o[1] + p.v[1] * drag / 2.2 - 0.5 * g * t * t * 0.4;
          }
          n.pos[0] = x * k; n.pos[1] = y * k; n.pos[2] = z * k;
          if (p.spin) {
            if (landed && K.land === 'rest') { n.rot[0] = 0; n.rot[1] = p.spin[1] * tl; n.rot[2] = 0; } // settle flat, no corners through the floor
            else { n.rot[0] = p.spin[0] * t; n.rot[1] = p.spin[1] * t; n.rot[2] = p.spin[2] * t; }
          }
          if (p.stages) {
            const u = clamp01(t / p.life), si = Math.min(p.stages.length - 1, Math.floor(u * p.stages.length));
            p.stages[si].hidden = false;
          } else if (landed && K.land === 'vanish') {
            n.hidden = true;
          } else if (landed && p.splat) {
            p.drop.hidden = true; p.splat.hidden = false; n.pos[1] = 0; n.rot[0] = n.rot[2] = 0;
          }
        }
      },
    };
  }

  // A flat pool on the floor that spreads over time (blood pool, oil, scorch mark). Irregular: a few overlapping blobs.
  function pool(parent, name, opts) {
    const r = new MF.RNG((opts.seed || 1) * 104729 + 17);
    const k = MF.getBuildScale();
    const o = opts.origin || [0, 0, 0];
    const R = opts.radius || 7, steps = 4;
    const node = parent.child(`fx_${name}`, [o[0], 0, o[2]]);
    const blobs = [];
    for (let b = 0; b < (opts.blobs || 4); b++) {
      const bx = r.range(-R, R) * 0.45, bz = r.range(-R, R) * 0.35, br = R * r.range(0.45, 0.8);
      for (let s = 0; s < steps; s++) {
        const st = node.child(`fx_${name}_${b}_${s}`, [bx, 0, bz], [0, r.range(0, TAU), 0]);
        st.startHidden = true;
        const rr = br * (s + 1) / steps;
        st.cyl('y', rr, 0.25, { mat: opts.mat || 'bloodDark', at: [0, 0.12, 0], sides: 8, noOutline: true, shadow: false });
        blobs.push({ node: st, s, delay: (opts.start || 0) + b * 0.08 });
      }
    }
    const grow = opts.grow || 1.6;
    return {
      update(time) {
        if (time == null || time < 0) return;
        for (const b of blobs) {
          const u = clamp01((time - b.delay) / grow);
          if (u <= 0) continue;
          const si = Math.min(steps - 1, Math.floor(u * steps - 1e-6));
          if (b.s === si) b.node.hidden = false;
        }
      },
    };
  }

  const group = (list) => ({ update(time) { for (const c of list) c.update(time); } });

  // ------------------------------------------------------------------ presets
  // Blood spray from a wound: fast mist, heavy drops that splat, and a pool that spreads under the body.
  function bloodBurst(parent, o) {
    const s = o.scale || 1, n = o.name || 'blood';
    return group([
      burst(parent, n + 'M', { kind: 'mist', count: Math.round(10 * s), origin: o.origin, dir: o.dir, spread: 0.6, seed: o.seed, start: o.start || 0 }),
      burst(parent, n + 'D', { kind: 'blood', count: Math.round(18 * s), origin: o.origin, dir: o.dir || [0, 1, 0], spread: 0.9, seed: (o.seed || 1) + 3, start: o.start || 0, stagger: 0.15 }),
      o.pool === false ? { update() {} } : pool(parent, n + 'P', { origin: o.poolAt || [o.origin[0], 0, o.origin[2]], radius: (o.poolRadius || 7) * s, seed: o.seed, start: (o.start || 0) + (o.poolDelay || 0.45), grow: o.poolGrow || 2.2 }),
    ]);
  }
  // Chunks of body/armour flying apart, plus blood.
  function gibs(parent, o) {
    const s = o.scale || 1, n = o.name || 'gib';
    return group([
      burst(parent, n + 'C', { kind: 'gib', count: Math.round((o.count || 10) * s), origin: o.origin, dir: [0, 1, 0], spread: 1.2, seed: o.seed, mats: o.mats || ['skin', 'primary', 'metal'], start: o.start || 0, scale: s }),
      bloodBurst(parent, { name: n + 'B', origin: o.origin, dir: [0, 1, 0], seed: (o.seed || 1) + 11, scale: 1.6 * s, start: o.start || 0, poolRadius: 11, poolDelay: 0.3 }),
    ]);
  }
  // Mech/vehicle explosion: fireball, smoke column, sparks, embers, flying debris and a scorch mark.
  function explosion(parent, o) {
    const s = o.scale || 1, n = o.name || 'boom', t0 = o.start || 0;
    return group([
      burst(parent, n + 'L', { kind: 'flash', count: 1, origin: o.origin, dir: [0, 1, 0], spread: 0, seed: o.seed, start: t0, stagger: 0, scale: s }),
      burst(parent, n + 'F', { kind: 'fire', count: Math.round(16 * s), origin: o.origin, dir: [0, 0.6, 0], spread: 1.4, seed: o.seed, start: t0, stagger: 0.12, scale: s }),
      burst(parent, n + 'S', { kind: 'smoke', count: Math.round(10 * s), origin: o.origin, dir: [0, 1, 0], spread: 0.9, seed: (o.seed || 1) + 5, start: t0 + 0.15, stagger: 0.5, scale: s }),
      burst(parent, n + 'K', { kind: 'spark', count: Math.round(18 * s), origin: o.origin, dir: [0, 0.8, 0], spread: 1.3, seed: (o.seed || 1) + 7, start: t0 }),
      burst(parent, n + 'E', { kind: 'ember', count: Math.round(10 * s), origin: o.origin, dir: [0, 1, 0], spread: 1.2, seed: (o.seed || 1) + 9, start: t0 + 0.1, stagger: 0.4 }),
      burst(parent, n + 'D', { kind: 'debris', count: Math.round((o.debris || 10) * s), origin: o.origin, dir: [0, 1, 0], spread: 1.3, seed: (o.seed || 1) + 13, mats: o.mats || ['metal', 'primary', 'secondary'], start: t0, scale: s }),
      pool(parent, n + 'X', { origin: [o.origin[0], 0, o.origin[2]], radius: 12 * s, mat: 'scorch', seed: o.seed, start: t0 + 0.05, grow: 0.5, blobs: 5 }),
    ]);
  }
  // Small hit effects.
  const hitBlood = (parent, o) => group([
    burst(parent, (o.name || 'hit') + 'M', { kind: 'mist', count: 8, origin: o.origin, dir: o.dir, spread: 0.5, seed: o.seed }),
    burst(parent, (o.name || 'hit') + 'D', { kind: 'blood', count: 6, origin: o.origin, dir: o.dir, spread: 0.7, seed: (o.seed || 1) + 2, life: [0.8, 1.6] }),
  ]);
  const hitSparks = (parent, o) => group([
    burst(parent, (o.name || 'hit') + 'K', { kind: 'spark', count: 12, origin: o.origin, dir: o.dir, spread: 0.7, seed: o.seed }),
    burst(parent, (o.name || 'hit') + 'S', { kind: 'smoke', count: 3, origin: o.origin, dir: [0, 1, 0], spread: 0.5, seed: (o.seed || 1) + 4, life: [0.5, 0.9], scale: 0.5 }),
  ]);
  const smokeTrail = (parent, o) => burst(parent, o.name || 'wreckSmoke', { kind: 'smoke', count: o.count || 10, origin: o.origin, dir: [0, 1, 0], spread: 0.35, seed: o.seed, start: o.start || 0, stagger: o.stagger || 4, life: [1.6, 2.8], scale: o.scale || 0.8 });

  MF.FX = { KINDS, burst, pool, group, bloodBurst, gibs, explosion, hitBlood, hitSparks, smokeTrail };
})();
