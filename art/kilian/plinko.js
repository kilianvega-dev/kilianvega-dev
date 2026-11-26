import { fit, clamp, seg, rng, TAU, WHITE, mix } from "../../core/index.js";

export const meta = {
  name: "Plinko tree",
  desc: "Arcade Plinko board of binary-tree pegs: a gold ball picks left or right at each node, lighting its path like a tree traversal, then lands in one of six flashing slots.",
  tags: ["kilian", "plinko", "binary tree", "game", "neon", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0c0518", "#1c0b3a", "#3a1470", "#5e22a8", "#8a3fe0", "#b57cff", "#e2c8ff", "#ffffff"],
    lit: ["#022a2a", "#065a5e", "#0a9aa0", "#18d0d8", "#5af0ee", "#a8fff6", "#e0fffc", "#ffffff"],
    gold: ["#3a1a00", "#7a3a00", "#c06a00", "#f5a000", "#ffc933", "#ffe27a", "#fff4c0", "#ffffff"],
    seed: 7,
  },
};

const DROP = 2, T0 = 0.22, H = 0.17, FALL = 0.28, STEP = 14, ROWS = 5, VH = 12;
const TL = T0 + (ROWS - 1) * H + FALL; // landing time inside a drop
const nx = (r, j) => (j - r / 2) * STEP, ny = (r) => -70 + 11 * r;
const FLOOR = -3.2;

// the choices at each peg: bit r is 0 for left, 1 for right; the second drop always differs from the first
const paths = (seed) => {
  const mk = (d) => { const R = rng(seed, 41, d); return Array.from({ length: ROWS }, () => (R.next() < 0.5 ? 0 : 1)); };
  const a = mk(0), b = mk(1);
  if (a.join() === b.join()) b[ROWS - 1] ^= 1, b[1] ^= 1;
  return [a, b];
};

// the ball's center at drop-time lt: a free fall, then a short arc from peg to peg, then the slot
function ball(lt, bits) {
  if (lt < 0) return null;
  const arc = (x0, y0, x1, y1, u) => ({ x: x0 + (x1 - x0) * u, y: y0 - VH * u + (y1 - y0 + VH) * u * u });
  if (lt < T0) return arc(0, -85, 0, ny(0) - 5, lt / T0);
  let j = 0;
  for (let r = 0; r < ROWS; r++) {
    const t0 = T0 + r * H, dx = bits[r] ? STEP / 2 : -STEP / 2;
    if (lt < t0 + (r < ROWS - 1 ? H : FALL)) {
      const u = (lt - t0) / (r < ROWS - 1 ? H : FALL);
      return r < ROWS - 1 ? arc(nx(r, j), ny(r) - 5, nx(r, j) + dx, ny(r + 1) - 5, u) : arc(nx(r, j), ny(r) - 5, nx(r, j) + dx, FLOOR, u);
    }
    j += bits[r];
  }
  const a = lt - TL;
  return { x: nx(ROWS - 1, j - bits[ROWS - 1]) + (bits[ROWS - 1] ? STEP / 2 : -STEP / 2), y: FLOOR - 4.5 * Math.exp(-a * 5) * Math.abs(Math.sin(a * 13)), landed: a };
}

// how lit a node is, age after the ball touched it: a hot flash then a hold that fades out before the next drop
const glowOf = (lt, th) => (lt < th ? 0 : Math.max(Math.exp(-(lt - th) * 9), 0.85 * (1 - seg(lt, 1.45, 1.92))));

export function draw(p, t, o) {
  const C = fit(o.palette, 8), L = fit(o.lit, 8), G = fit(o.gold, 8), ph = t / meta.duration;
  const neon = 0.8 + 0.2 * Math.sin(ph * TAU * 2);
  const B = paths(o.seed), drops = [0, 1].map((d) => ({ d, bits: B[d], lt: t - d * DROP })).filter((x) => x.lt >= 0 && x.lt < DROP);
  const cur = drops[0];

  // the board: a deep purple panel with a vertical gradient, a neon rim, a few faint stars
  p.shade(-47, -92, 48, 2, (x, y, out) => {
    const e = Math.min(x + 47, 48 - x, y + 92) , k = (y + 92) / 94;
    const body = k < 0.35 ? C[1] : k < 0.75 ? mix(C[1], C[0], 0.5) : C[0];
    out.c = e < 1 ? C[4] : e < 2 ? C[2] : body;
    if (e >= 2 && ((Math.floor(x) * 7 + Math.floor(y) * 13) % 29 === 0)) out.c = C[2];
  });
  p.glowLine(-47, -91, 47, -91, 4, C[4], 0.22 * neon);
  p.line(-46, -91, 46, -91, C[5], 0.9);
  p.glowLine(-47, -90, -47, 0, 4, C[3], 0.2 * neon);
  p.glowLine(47, -90, 47, 0, 4, C[3], 0.2 * neon);
  p.px(-47, -92, 0), p.px(47, -92, 0);
  // the drop slot at the top
  p.tri(-3, -90, 3, -90, 0, -86, C[3]);
  p.px(0, -89, C[6]);
  if (cur) p.glow(0, -88, 10, G[4], 0.4 * (1 - seg(cur.lt, 0, 0.3)));
  // slots: dividers rising from the floor
  for (let k = 0; k <= 6; k++) {
    const x = (k - 3) * STEP;
    p.line(x, -17, x, -1, C[3]);
    p.px(x, -18, C[5]);
    p.line(x + 1, -16, x + 1, -1, C[1], 0.8);
  }
  p.line(-43, 0, 43, 0, C[4]);
  p.line(-43, 1, 43, 1, C[2]);

  // edges of the tree: each node to its two children (the last row to the slots), then the lit traversal on top
  const lit = (r, j) => drops.reduce((m, q) => Math.max(m, glowOf(q.lt, T0 + r * H)), 0);
  const litNode = new Map();
  for (const q of drops) { let j = 0; q.bits.forEach((b, r) => { litNode.set(r * 10 + j, Math.max(litNode.get(r * 10 + j) || 0, glowOf(q.lt, T0 + r * H))); j += b; }); }
  const litEdge = new Map();
  for (const q of drops) { let j = 0; q.bits.forEach((b, r) => { const key = r * 100 + j * 10 + b; litEdge.set(key, Math.max(litEdge.get(key) || 0, glowOf(q.lt, T0 + r * H + 0.03))); j += b; }); }
  for (let r = 0; r < ROWS; r++)
    for (let j = 0; j <= r; j++)
      for (const b of [0, 1]) {
        const x0 = nx(r, j), y0 = ny(r), x1 = x0 + (b ? STEP / 2 : -STEP / 2), y1 = r < ROWS - 1 ? ny(r + 1) : -19;
        const k = litEdge.get(r * 100 + j * 10 + b) || 0;
        p.line(x0, y0, x1, y1, C[2]);
        if (k > 0.05) { p.line(x0, y0, x1, y1, k > 0.5 ? L[5] : L[3], Math.min(1, k * 1.4)); p.glowLine(x0, y0, x1, y1, 3, L[3], 0.3 * k); }
      }
  // the slots light when the ball lands
  for (const q of drops) {
    const a = q.lt - TL;
    if (a < 0) continue;
    const bx = ball(q.lt, q.bits).x, f = Math.max(Math.exp(-a * 5), 0.55 * (1 - seg(q.lt, 1.45, 1.92)));
    p.glow(bx, -7, 15, G[3], 0.6 * f);
    p.glow(bx, -2, 10, G[5], 0.5 * Math.exp(-a * 6));
    for (const s of [-1, 1]) p.line(bx + s * 6.5, -17, bx + s * 6.5, -1, mix(C[1], f > 0.5 ? G[5] : G[3], clamp(f * 1.3)));
    p.line(bx - 6, 0, bx + 6, 0, f > 0.5 ? WHITE : G[5]);
  }
  // pegs
  for (let r = 0; r < ROWS; r++)
    for (let j = 0; j <= r; j++) {
      const x = nx(r, j), y = ny(r), k = litNode.get(r * 10 + j) || 0;
      if (k > 0.04) p.glow(x, y, 9 + 5 * k, L[4], 0.5 * k);
      p.circle(x, y, 2.6, k > 0.5 ? L[3] : C[1]);
      p.circle(x, y, 1.9, k > 0.7 ? L[6] : k > 0.3 ? L[5] : k > 0.04 ? L[4] : C[4]);
      p.px(x - 1, y - 1, k > 0.6 ? WHITE : C[6]);
      p.px(x + 1, y + 1, k > 0.04 ? L[2] : C[2]);
    }
  // balls, their trails and sparks
  for (const q of drops) {
    const R = rng(o.seed, 99, q.d);
    for (let r = 0; r < ROWS; r++) {
      const hx = nx(r, q.bits.slice(0, r).reduce((a, b) => a + b, 0)), hy = ny(r) - 3, age = q.lt - (T0 + r * H);
      for (let i = 0; i < 4; i++) {
        const a = R.range(-2.9, -0.25), sp = R.range(28, 60);
        if (age < 0 || age > 0.35) continue;
        const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, sx = hx + vx * age, sy = hy + vy * age + 130 * age * age, fade = 1 - age / 0.35;
        p.line(sx, sy, sx - vx * 0.025, sy - vy * 0.025 - 130 * age * 0.025, fade > 0.4 ? L[6] : L[4]);
        p.glow(sx, sy, 4, L[4], 0.35 * fade);
      }
    }
    const land = q.lt - TL;
    for (let i = 0; i < 16; i++) {
      const a = R.range(-3.0, -0.15), sp = R.range(35, 95), life = R.range(0.35, 0.6), g = i % 3 === 0 ? WHITE : i % 3 === 1 ? G[5] : L[5];
      if (land < 0 || land > life) continue;
      const bx = ball(TL, q.bits).x, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, sx = bx + vx * land, sy = -4 + vy * land + 200 * land * land;
      if (sy > -0.5) continue;
      p.line(sx, sy, sx - vx * 0.03, sy - (vy + 200 * land * 2) * 0.03, g, 1 - land / life);
      p.glow(sx, sy, 4, G[4], 0.3 * (1 - land / life));
    }
    const b = ball(q.lt, q.bits);
    if (!b) continue;
    const vis = q.lt < 0.06 ? q.lt / 0.06 : 1 - seg(q.lt, 1.55, 1.9), r0 = 3.2 * (vis > 0 ? 1 : 0), rr = r0 * (0.4 + 0.6 * vis);
    if (rr < 0.4) continue;
    for (let i = 4; i >= 1; i--) {
      const gb = ball(q.lt - i * 0.022, q.bits);
      if (gb && q.lt - i * 0.022 >= 0 && !b.landed) p.circle(gb.x, gb.y, rr * (1 - i * 0.17), G[2], 0.5 - i * 0.09);
    }
    p.glow(b.x, b.y, 17, G[3], 0.55 * vis);
    p.circle(b.x, b.y, rr + 1, G[1]);
    p.circle(b.x, b.y, rr, G[4]);
    p.circle(b.x + 0.5, b.y + 0.6, rr * 0.6, G[3]);
    p.circle(b.x - 0.7, b.y - 0.8, rr * 0.5, G[6]);
    p.px(b.x - 1, b.y - 1, WHITE);
  }
}
