import { fit, clamp, seg, ease, bump, rng, cycle, bolt, TAU, WHITE, hex, mix } from "../../core/index.js";
import { shadow, twinkle } from "../pickups/_lib.js";

export const meta = {
  name: "Voltio cart",
  desc: "Gadgets drop into a cart while a free-shipping bar fills; when it is full, lightning strikes the cart, FREE SHIPPING lights up and the cart empties.",
  tags: ["ui", "shop", "cart", "lightning", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#0c0a1c", "#1d1840", "#3a2f7a", "#6a4fd0", "#9c7cff", "#cbb8ff", "#f1ebff"], volt: ["#3a2a00", "#8a6200", "#e0a800", "#ffd84a", "#fff3b0"], seed: 7 },
};

const D = meta.duration, INK = hex("#08070f"), METAL = [hex("#3b4258"), hex("#7d88a8"), hex("#c3cbe4")];
const DROPS = [0.25, 0.85, 1.45], LAND = 0.42, FULL = 2.0, EMPTY = 3.35;
const BAR = { x: -36, y: -64, w: 72, h: 5 };
// three gadgets: a box, a phone, a pair of earbuds
const BOX = ["kkkkkkkkkk", "kbaaabaaak", "kbaaabaaak", "kaaaabaaak", "kccccbccck", "kccccbccck", "kkkkkkkkkk"];
const PHONE = ["kkkkkkk", "kdd.ddk", "keeeeek", "kegeeek", "keeeeek", "keeegek", "keeeeek", "kdddddk", "kkkkkkk"];
const BUDS = ["..kkkkkkk..", ".kfffffffk.", "kfk.....kfk", "kfk.....kfk", "kkkk...kkkk", "kaak...kaak", "kkkk...kkkk"];
const ITEMS = [
  { s: BOX, x: -10, rest: -29 },
  { s: PHONE, x: 1, rest: -31 },
  { s: BUDS, x: 11, rest: -29 },
];

const landed = (t, i) => t >= DROPS[i] + LAND && t < EMPTY + 0.3;

function cart(p, t, C, V) {
  const zap = bump(t, FULL, FULL + 0.5);
  const rim = zap > 0.1 ? mix(METAL[2], V[4], zap) : METAL[2];
  // basket: a trapezoid of wire, crossed by a grid
  const top = -32, bot = -12, L0 = -24, R0 = 22, L1 = -19, R1 = 18;
  for (let k = 1; k < 5; k++) {
    const u = k / 5;
    p.line(L0 + (R0 - L0) * u, top, L1 + (R1 - L1) * u, bot, METAL[0]);
  }
  p.line((L0 + L1) / 2, (top + bot) / 2, (R0 + R1) / 2, (top + bot) / 2, METAL[0]);
  p.line(L0, top, R0, top, rim);
  p.line(L1, bot, R1, bot, METAL[1]);
  p.line(L0, top, L1, bot, METAL[1]);
  p.line(R0, top, R1, bot, METAL[1]);
  // handle, chassis, wheels that roll a little as the cart bounces
  p.line(L0, top, L0 - 6, top - 6, METAL[1]);
  p.line(L0 - 6, top - 6, L0 - 9, top - 6, C[4]);
  p.line(L1, bot, L1 - 2, -6, METAL[1]);
  p.line(L1 - 2, -6, R1, -6, METAL[1]);
  for (const wx of [-16, 14]) {
    p.circle(wx, -2.5, 2.5, INK);
    p.px(wx, -3, METAL[2]);
  }
  if (zap > 0) p.glow(0, -22, 30, V[3], 0.5 * zap);
}

function bar(p, t, C, V) {
  // the bar fills a third per landed gadget, springing to each new level; drains after the order ships
  let fill = 0;
  for (let i = 0; i < 3; i++) fill += ease.outBack(seg(t, DROPS[i] + LAND, DROPS[i] + LAND + 0.3)) / 3;
  fill *= 1 - ease.inOutCubic(seg(t, EMPTY, EMPTY + 0.5));
  const full = t >= FULL && t < EMPTY, flash = bump(t, FULL, FULL + 0.18);
  const { x, y, w, h } = BAR, n = Math.round(clamp(fill, 0, 1.05) * (w - 2));
  p.rect(x - 1, y - 1, w + 2, h + 2, INK);
  p.rect(x, y, w, h, C[1]);
  for (let s = 1; s < 3; s++) p.px(x + Math.round((w * s) / 3), y - 2, C[3]); // the thirds
  if (n > 0) {
    p.rect(x + 1, y + 1, n, h - 2, full ? V[3] : C[4]);
    p.line(x + 1, y + 1, x + n, y + 1, full ? V[4] : C[5]);
    p.glow(x + n, y + 2, 6, full ? V[3] : C[4], 0.35);
  }
  if (flash > 0) p.rect(x, y, w, h, WHITE, flash);
  // the label: dim until the order qualifies, then lit and pulsing
  const lit = full ? 0.75 + 0.25 * Math.sin(t * 14) : 0;
  p.text("FREE SHIPPING", 0, y - 10, full ? V[4] : C[2], { align: "center", outline: INK });
  if (lit > 0) p.glow(0, y - 8, 30, V[3], 0.22 * lit);
  // a bolt icon on the end of the bar
  const bx = x + w + 5, by = y + 2;
  p.poly([[bx + 1, by - 5], [bx - 2, by + 1], [bx, by + 1], [bx - 1, by + 5], [bx + 3, by - 1], [bx + 1, by - 1]], full ? V[3] : C[2]);
  if (full) p.glow(bx, by, 7, V[3], 0.4);
}

export function drawBack(p, t, o) {
  shadow(p, 0, 22, 0.8);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), V = fit(o.volt, 5);
  bar(p, t, C, V);
  // gadgets fall in, bounce on what's already there, and vanish in a puff when the order ships
  for (const [i, it] of ITEMS.entries()) {
    const k = seg(t, DROPS[i], DROPS[i] + LAND);
    if (t < DROPS[i] || t > EMPTY + 0.3) continue;
    const y = -52 + (it.rest + 52) * ease.outBounce(k), a = 1 - seg(t, EMPTY, EMPTY + 0.3);
    const pal = { k: INK, a: V[2], b: V[4], c: V[1], d: C[2], e: hex("#2a8fd6"), g: hex("#9ff0ff"), f: C[5] };
    const w = it.s[0].length, h = it.s.length;
    p.sprite(it.s, pal, Math.round(it.x - w / 2), Math.round(y - h), { a });
    if (k > 0.98 && t < DROPS[i] + LAND + 0.15) twinkle(p, it.x + 4, Math.round(y - h - 1), 3, C[5], C[6]);
    if (landed(t, i) && t > EMPTY) p.glow(it.x, y - 3, 6, C[5], 0.4 * a);
  }
  cart(p, t, C, V);
  // the strike: a jagged bolt from the bar down into the cart, forked, for a few frames
  const z = seg(t, FULL, FULL + 0.32);
  if (z > 0 && z < 1) {
    const r = rng(o.seed, Math.floor(t * 30));
    const path = bolt(r, 0, BAR.y + BAR.h + 1, 0, -30, { jag: 0.35, depth: 4 });
    const c = z < 0.3 ? WHITE : V[4];
    p.polyline(path, c);
    for (const [x, y] of path) p.glow(x, y, 4, V[3], 0.25 * (1 - z));
    p.glow(0, -30, 18, V[4], 0.8 * (1 - z));
  }
  // sparks thrown off the cart after the strike
  cycle(t, D, 10, o.seed, 0.6, (age, life, r) => {
    const t0 = FULL + r.range(0, 0.1), a0 = t - t0;
    if (a0 < 0 || a0 > life) return;
    const ang = r.range(-Math.PI * 0.95, -Math.PI * 0.05), sp = r.range(40, 90);
    const x = Math.cos(ang) * sp * a0, y = -30 + Math.sin(ang) * sp * a0 + 160 * a0 * a0;
    p.px(Math.round(x), Math.round(y), a0 < 0.2 ? WHITE : V[3]);
    p.glow(x, y, 3, V[3], 0.3 * (1 - a0 / life));
  });
  // a puff where the gadgets were when the order ships
  const pf = seg(t, EMPTY, EMPTY + 0.45);
  if (pf > 0 && pf < 1)
    for (let i = 0; i < 3; i++) {
      const cx = ITEMS[i].x, cy = ITEMS[i].rest - 4 - 8 * pf;
      p.ring(cx, cy, 2 + 5 * ease.outCubic(pf), 1, C[5], 0.9 * (1 - pf));
      twinkle(p, cx, Math.round(cy), Math.round(4 * (1 - pf)), C[5], C[6]);
      p.glow(cx, cy, 8, C[4], 0.4 * (1 - pf));
    }
  // a twinkle or two on the label while it's lit
  if (t > FULL + 0.2 && t < EMPTY) {
    const g = ((t - FULL) * 2.2) % 1;
    if (g < 0.25) twinkle(p, -26 + Math.floor((t - FULL) * 2.2) % 3 * 26, BAR.y - 12, Math.round(3 * Math.sin((g / 0.25) * Math.PI)), V[3], V[4]);
  }
}
