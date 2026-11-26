import { fit, clamp, seg, ease, bump, cycle, TAU, WHITE, hex, mix, scale } from "../../core/index.js";
import { shadow, twinkle } from "../pickups/_lib.js";

export const meta = {
  name: "Delegate",
  desc: "A big orb hands a task to each of two smaller orbs; they spin up, work through a progress ring and send a green check back, and the big orb glows.",
  tags: ["arcane", "orb", "ai", "delegation", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0e0820", "#2a1450", "#4f2596", "#8048e0", "#b48cff", "#e2d2ff", "#ffffff"],
    haiku: ["#032224", "#0a5552", "#139a8e", "#3fe0c8", "#b6fff0"],
    sonnet: ["#2a1200", "#6e3a06", "#c8761a", "#ffb444", "#ffe7b0"],
    ok: ["#0b3a1c", "#1f9a4a", "#5cf08a", "#d6ffe2"],
    seed: 5,
  },
};

const D = meta.duration, INK = hex("#07060e");
const BOSS = { x: 0, y: -64, r: 11 };
const WORK = [
  { x: -33, y: -30, r: 6, ramp: "haiku", name: "HAIKU", send: 0.35, back: 2.15 },
  { x: 33, y: -30, r: 8, ramp: "sonnet", name: "SONNET", send: 0.6, back: 2.45 },
];
const FLY = 0.42; // seconds a packet is in the air
const PAPER = ["kkkkkk", "kwwwwk", "kwddwk", "kwwwwk", "kwddwk", "kkkkkk"];

// a glossy orb: dark rim, body, a lit cap up-left, a white glint
function orb(p, x, y, r, R, k = 0) {
  p.glow(x, y, r * 2.6, R[3], 0.22 + 0.4 * k);
  p.circle(x, y, r + 1, INK);
  // a flash brightens each band of the orb instead of laying white over it
  const b = (i) => mix(R[i], R[Math.min(4, i + 2)], clamp(k * 1.4));
  p.circle(x, y, r, b(1));
  p.circle(x - r * 0.18, y - r * 0.2, r * 0.78, b(2));
  p.circle(x - r * 0.32, y - r * 0.36, r * 0.42, b(3));
  p.circle(x - r * 0.4, y - r * 0.45, Math.max(1, r * 0.18), k > 0.5 ? WHITE : R[4]);
  if (k > 0) p.glow(x, y, r * 1.4, R[4], 0.5 * k);
}

// where a packet is, u 0..1 along an arc from a to b
const arc = (a, b, u, lift) => [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * lift];

export function drawBack(p, t, o) {
  const C = fit(o.palette, 7);
  // faint dotted links from the big orb down to each worker
  for (const w of WORK)
    for (let i = 2; i < 20; i += 2) {
      const [x, y] = arc(BOSS, w, i / 21, 10);
      p.dot(Math.round(x), Math.round(y), C[2], 0.8);
    }
  // a few slow motes drifting up through the scene
  cycle(t, D, 6, o.seed, 2.2, (age, life, r) => {
    const x = r.range(-48, 48) + Math.sin(age * 2 + r.range(0, TAU)) * 2, y = -4 - age * r.range(10, 18);
    p.dot(Math.round(x), Math.round(y), C[3], 0.8 * Math.sin((age / life) * Math.PI));
  });
  shadow(p, -33, 7, 0.7);
  shadow(p, 33, 9, 0.7);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), OK = fit(o.ok, 4);
  const bob = (ph) => Math.round(Math.sin((t / D) * TAU * 2 + ph) * 1.5);
  // the big orb: gathers itself before each send, glows when a check comes home
  let home = 0;
  for (const w of WORK) home = Math.max(home, bump(t, w.back + FLY, w.back + FLY + 0.35));
  const gather = Math.max(bump(t, WORK[0].send - 0.3, WORK[0].send + 0.05), bump(t, WORK[1].send - 0.3, WORK[1].send + 0.05));
  const by = BOSS.y + bob(0);
  if (gather > 0)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 3, d = BOSS.r + 3 + 10 * (1 - gather);
      p.px(Math.round(BOSS.x + Math.cos(a) * d), Math.round(by + Math.sin(a) * d), C[5]);
    }
  orb(p, BOSS.x, by, BOSS.r, [C[1], C[2], C[3], C[4], C[5]], 0.25 * gather + 0.55 * home);
  p.text("OPUS", BOSS.x, by - BOSS.r - 9, C[4], { align: "center", outline: INK });
  if (home > 0.3) twinkle(p, BOSS.x + 9, by - 9, Math.round(4 * home), OK[1], OK[2]);

  for (const [i, w] of WORK.entries()) {
    const R = fit(o[w.ramp], 5), wy = w.y + bob(i + 1);
    const arrive = w.send + FLY, done = w.back;
    const working = t > arrive && t < done, k = seg(t, arrive, done);
    const hit = bump(t, arrive, arrive + 0.25);
    // spinning up: a ring of motes orbits faster while it works, and a progress ring fills round it
    if (working) {
      const spin = t * (6 + 6 * Math.sin(k * Math.PI));
      for (let m = 0; m < 3; m++) {
        const a = spin + (m / 3) * TAU;
        p.px(Math.round(w.x + Math.cos(a) * (w.r + 4)), Math.round(wy + Math.sin(a) * (w.r + 4) * 0.55), R[4]);
      }
      p.arc(w.x, wy, w.r + 7, 1, -Math.PI / 2, -Math.PI / 2 + k * TAU, R[3]);
      p.glowRing(w.x, wy, w.r + 7, 3, R[3], 0.12);
    }
    orb(p, w.x, wy, w.r, R, 0.6 * hit + (working ? 0.15 : 0));
    p.text(w.name, w.x, wy + w.r + 10, R[3], { align: "center", outline: INK });
    // the task flies down as a little page...
    const u = seg(t, w.send, arrive);
    if (u > 0 && u < 1) {
      const [x, y] = arc(BOSS, w, ease.inOutSine(u), 10);
      p.sprite(PAPER, { k: INK, w: C[6], d: C[3] }, Math.round(x - 3), Math.round(y - 3));
      p.glow(x, y, 6, C[4], 0.35);
      for (let s = 1; s < 4; s++) {
        const [tx, ty] = arc(BOSS, w, ease.inOutSine(clamp(u - s * 0.05)), 10);
        p.dot(Math.round(tx), Math.round(ty), C[4], 0.7 - s * 0.18);
      }
    }
    // ...and comes back up as a green check
    const v = seg(t, done, done + FLY);
    if (v > 0 && v < 1) {
      const [x, y] = arc(w, BOSS, ease.inOutSine(v), 12);
      const X = Math.round(x), Y = Math.round(y);
      p.glow(x, y, 7, OK[2], 0.5);
      for (const [dx, dy] of [[-3, 0], [-2, 1], [-1, 2], [0, 1], [1, 0], [2, -1], [3, -2]]) {
        p.px(X + dx, Y + dy + 1, INK);
        p.px(X + dx, Y + dy, dx < 0 ? OK[2] : OK[3]);
      }
    }
    if (bump(t, done - 0.05, done + 0.2) > 0) p.ring(w.x, wy, w.r + 7 + 6 * seg(t, done - 0.05, done + 0.2), 1, OK[2], 1 - seg(t, done - 0.05, done + 0.2));
  }
}
