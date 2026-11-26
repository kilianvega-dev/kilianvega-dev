import { fit, seg, ease, bump, cycle, TAU, WHITE, hex } from "../../core/index.js";
import { shadow, twinkle } from "../pickups/_lib.js";

export const meta = {
  name: "Say hi",
  desc: "A hovering envelope flips its flap open, a letter with a beating heart springs up, little hearts float off, then it tucks back in and seals.",
  tags: ["ui", "mail", "contact", "heart", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1c1530", "#4a3f6e", "#8f86b8", "#cfc8ea", "#f2efff", "#ffffff"],
    heart: ["#3a0610", "#8a1222", "#e0283e", "#ff6a74", "#ffd0cc"],
    seed: 9,
  },
};

const D = meta.duration, INK = hex("#0a0812"), W = 20;
const OPEN = [0.35, 0.65], UP = [0.6, 1.15], DOWN = [2.55, 2.95], SHUT = [2.9, 3.2];
const HEART = [".kk.kk.", "kaakbak", "kabaaak", "kaaaaak", ".kaaak.", "..kak..", "...k..."];
const MINI = [".a.a.", "abbba", ".aba.", "..a.."];

const hover = (t) => Math.round(-2 * Math.sin((t / D) * TAU));

export function drawBack(p, t, o) {
  const H = fit(o.heart, 5);
  shadow(p, 0, 16 - hover(t) * 0.5, 0.8);
  // little hearts drift up from behind while the letter is out
  cycle(t, D, 6, o.seed, 1.1, (age, life, r, i) => {
    const born = UP[1] + r.range(0, 1.2), a0 = t - born;
    if (a0 < 0 || a0 > life || t > DOWN[1]) return;
    const side = i % 2 ? 1 : -1, k = a0 / life;
    const x = side * (12 + a0 * r.range(10, 18)) + Math.sin(a0 * 6 + i) * 1.5, y = -54 - a0 * r.range(14, 22);
    p.sprite(MINI, { a: H[3], b: k < 0.4 ? WHITE : H[4] }, Math.round(x - 2), Math.round(y - 2), { a: 1.2 * (1 - k * k) });
    p.glow(x, y, 4, H[2], 0.3 * (1 - k));
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 6), H = fit(o.heart, 5);
  const by = hover(t), yT = -40 + by, yB = -16 + by;
  // flap: 1 = closed and folded down in front, -1 = open and standing up behind
  const f = 1 - 2 * ease.inOutCubic(seg(t, OPEN[0], OPEN[1])) + 2 * ease.inOutCubic(seg(t, SHUT[0], SHUT[1]));
  const lift = ease.outBack(seg(t, UP[0], UP[1])) - ease.inCubic(seg(t, DOWN[0], DOWN[1]));
  const flap = (c) => {
    const tip = yT + 14 * f;
    p.poly([[-W, yT], [W, yT], [0, tip]], c);
    p.line(-W, yT, 0, tip, INK);
    p.line(W, yT, 0, tip, INK);
  };
  p.glow(0, yT + 10, 34, C[3], 0.12 + 0.18 * lift);
  // the back of the envelope, and the flap when it stands open behind the letter
  p.rect(-W - 1, yT - 1, 2 * W + 2, yB - yT + 2, INK);
  p.rect(-W, yT, 2 * W, yB - yT, C[1]);
  if (f < 0) flap(C[2]);
  // the letter: springs up, a heart beating on it
  if (lift > 0.01) {
    const ly = yT + 6 - 22 * lift, lx = -14;
    p.rect(lx - 1, ly - 1, 30, 24, INK);
    p.rect(lx, ly, 28, 22, C[4]);
    p.line(lx, ly, lx + 27, ly, WHITE);
    const beat = Math.max(0, Math.sin(t * 9)) ** 4;
    p.glow(0, ly + 8, 9 + 3 * beat, H[2], 0.35 + 0.35 * beat);
    p.sprite(HEART, { k: INK, a: H[2], b: H[4] }, -3, Math.round(ly + 4 - beat), { scale: 1 });
    for (const [i, w] of [16, 12].entries()) p.line(-w / 2, ly + 14 + i * 3, w / 2 - 1, ly + 14 + i * 3, C[2]);
  }
  // the front pocket, cut in a V at the top so the letter shows
  p.poly([[-W, yT + 1], [0, yT + 13], [W, yT + 1], [W, yB], [-W, yB]], C[3]);
  p.line(-W, yT + 1, 0, yT + 13, C[2]);
  p.line(W, yT + 1, 0, yT + 13, C[2]);
  p.line(-W, yB - 1, W - 1, yB - 1, C[2]);
  p.line(-W, yT + 2, -W, yB - 1, C[4]);
  if (f >= 0) flap(C[4]);
  // a glint as it opens and a seal flash as it closes
  const g = bump(t, OPEN[1], OPEN[1] + 0.25);
  if (g > 0) twinkle(p, W - 3, yT - 2, Math.round(4 * g), C[3], C[5]);
  const s = bump(t, SHUT[1], SHUT[1] + 0.25);
  if (s > 0) {
    p.circle(0, yT + 13, 2.5, H[2]);
    p.px(-1, yT + 12, H[4]);
    p.glow(0, yT + 13, 8, H[3], 0.5 * s);
  }
}
