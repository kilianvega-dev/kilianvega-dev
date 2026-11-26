import { fit, clamp, lerp, seg, bump, ease, rand, fly, TAU, WHITE, hex } from "../../core/index.js";
import { Layer, glint, blobShadow } from "../pickups/_lib.js";

export const meta = {
  name: "Catalog tap",
  desc: "A hand taps a product on a PDF catalog page, it rings and sparkles, and a green chat bubble springs out, types, shows the product line and settles away.",
  tags: ["kilian", "catalog", "pdf", "chat", "tap", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#06200f", "#0f4a24", "#17803a", "#25d366", "#58e88a", "#9ff5b8", "#d4fde0", "#ffffff"], seed: 7 },
};

const INK = hex("#1a1822"), PAPER = hex("#f5f0e3"), PAPER2 = hex("#e2dac6"), PAPER3 = hex("#bdb3a0"), RED = hex("#e0432f"), RED2 = hex("#9c2418");
const SKIN = hex("#ffd9b8"), SKIN2 = hex("#e8a982");
const PX = -34, PY = -58, PW = 40, PH = 50; // the page
const TW = 15, TH = 14, COLS = [-30, -12], ROWS = [-48, -28];
const TAP = 1.0, POP = 1.06, DOTS = 1.5, SHOW = 2.3, EXIT = 3.4;
const TIP = [-3, -40], FAR = [38, -8]; // fingertip when tapping, and off-screen
const A = [8, -39]; // the bubble's tail tip: it grows from here
const HAND = [
  "....aaa.....",
  "...abbba....",
  "...abbba....",
  "...abbba....",
  "...abbbaaa..",
  "...abbbabbaa",
  ".aaabbbabbba",
  "abbabbbbbbba",
  "abbbbbbbbbca",
  ".abbbbbbbbca",
  ".abbbbbbbbca",
  "..abbbbbbcca",
  "..abbbbbbca.",
  "...aaaaaaa..",
];
const THUMBS = [
  { kind: "chair", bg: hex("#cfe3ea") },
  { kind: "sofa", bg: hex("#f1d9c0") },
  { kind: "lamp", bg: hex("#d9d2ee") },
  { kind: "table", bg: hex("#d8e8c4") },
];

const L = new Layer(64, 48);

// tiny furniture, 15x14, drawn over a pastel card
function furniture(p, kind, x, y, bg, a = 1) {
  const R = (rx, ry, w, h, c) => p.rect(x + rx, y + ry, w, h, c, a);
  R(0, 0, TW, TH, bg);
  R(0, 0, TW, 1, PAPER);
  R(0, TH - 3, TW, 3, PAPER2);
  if (kind === "sofa") {
    const c = hex("#c4552f"), d = hex("#7e2c18"), l = hex("#f08a5a");
    R(3, 3, 9, 5, c), R(3, 3, 9, 1, l), R(1, 6, 3, 6, c), R(11, 6, 3, 6, c), R(1, 6, 3, 1, l), R(11, 6, 3, 1, l);
    R(4, 7, 7, 4, hex("#d9693f")), R(4, 7, 7, 1, l), R(1, 11, 13, 1, d), R(2, 12, 1, 1, INK), R(12, 12, 1, 1, INK);
  } else if (kind === "chair") {
    const c = hex("#2f78a8"), d = hex("#1b4768"), l = hex("#7cc2ea");
    R(4, 1, 2, 8, c), R(4, 1, 1, 8, l), R(6, 2, 4, 1, c), R(6, 4, 4, 1, c), R(4, 8, 8, 2, c), R(4, 8, 8, 1, l), R(4, 10, 8, 1, d);
    R(4, 11, 1, 2, INK), R(11, 11, 1, 2, INK);
  } else if (kind === "lamp") {
    const c = hex("#f2c230"), l = hex("#fff1a0"), d = hex("#a8760e");
    R(4, 2, 7, 1, l), R(3, 3, 9, 3, c), R(3, 5, 9, 1, d), R(7, 6, 1, 5, hex("#5a4e70")), R(5, 11, 5, 1, INK), R(5, 10, 5, 1, hex("#5a4e70"));
    p.glow(x + 7.5, y + 5, 9, c, 0.22 * a);
  } else {
    const c = hex("#a8743a"), d = hex("#5e3a18"), l = hex("#e0aa66");
    R(1, 6, 13, 2, c), R(1, 6, 13, 1, l), R(1, 8, 13, 1, d), R(2, 9, 1, 3, d), R(12, 9, 1, 3, d);
    R(10, 3, 2, 3, hex("#3aa070")), R(11, 2, 1, 1, hex("#7ce0a8")), R(10, 5, 2, 1, hex("#1f6e4a"));
  }
}

function frame(p, x, y, w, h, c, a = 1) {
  p.rect(x, y, w, 1, c, a), p.rect(x, y + h - 1, w, 1, c, a), p.rect(x, y, 1, h, c, a), p.rect(x + w - 1, y, 1, h, c, a);
}

function inTri(x, y, a, b, c) {
  const s = (p0, p1) => (x - p1[0]) * (p0[1] - p1[1]) - (p0[0] - p1[0]) * (y - p1[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// the bubble's squash and stretch: springs out of the tail tip, shrinks back into it
function bubbleScale(t) {
  const u = t - POP;
  if (u < 0) return [0, 0];
  const k = 1 - Math.exp(-u * 9) * Math.cos(u * 22), d = Math.exp(-u * 8) * Math.cos(u * 24);
  let s = k, w = d;
  if (t > EXIT) {
    const x = seg(t, EXIT, EXIT + 0.38);
    s *= 1 - ease.inCubic(x);
    w = -0.25 * x;
  }
  return [clamp(s * (1 - 0.22 * w), 0, 1.17), clamp(s * (1 + 0.22 * w), 0, 1.3)];
}

export function drawBack(p, t, o) {
  const ph = (t / meta.duration) * TAU, bob = Math.sin(ph) * 1.2;
  blobShadow(p, -14, 21 - bob * 0.8, 0.85, 1);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), bob = Math.round(Math.sin((t / meta.duration) * TAU) * 1.2);
  p.glow(-14, -34 + bob, 34, C[3], 0.1);
  // the page: a soft drop shadow, a dark outline, paper with a worn edge
  p.rect(PX + 2, PY + bob + 2, PW, PH, INK, 0.45);
  p.rect(PX - 1, PY + bob - 1, PW + 2, PH + 2, INK);
  p.rect(PX, PY + bob, PW, PH, PAPER);
  p.rect(PX, PY + bob, 1, PH, WHITE);
  p.rect(PX + PW - 1, PY + bob, 1, PH, PAPER2);
  p.rect(PX, PY + bob + PH - 1, PW, 1, PAPER2);
  // header: a title bar and rule
  p.rect(PX + 4, PY + bob + 4, 17, 2, C[2]);
  p.rect(PX + 4, PY + bob + 4, 17, 1, C[3]);
  p.rect(PX + 4, PY + bob + 7, 12, 1, PAPER3);
  p.rect(PX + 4, PY + bob + 9, PW - 8, 1, PAPER2);
  // product thumbnails with a caption line and a price tick
  THUMBS.forEach((th, i) => {
    const x = COLS[i % 2], y = ROWS[(i / 2) | 0] + bob;
    p.rect(x - 1, y - 1, TW + 2, TH + 2, INK);
    furniture(p, th.kind, x, y, th.bg);
    p.rect(x, y + TH + 2, 9, 1, PAPER3);
    p.rect(x + 11, y + TH + 2, 4, 1, C[2]);
  });
  // the PDF tag, overhanging the page corner
  const tgx = PX + PW - 14, tgy = PY + bob - 5;
  p.rect(tgx - 1, tgy - 1, 17, 11, INK);
  p.rect(tgx, tgy, 15, 9, RED);
  p.rect(tgx, tgy, 15, 1, hex("#ff7a62"));
  p.rect(tgx, tgy + 8, 15, 1, RED2);
  p.text("PDF", tgx + 2, tgy + 2, WHITE, { font: "mini" });

  // the tap: the chosen thumbnail lights up with a ring
  const cx = COLS[1] + TW / 2, cy = ROWS[0] + TH / 2 + bob;
  const on = seg(t, TAP, TAP + 0.06) * (1 - seg(t, EXIT - 0.1, EXIT + 0.2));
  if (on > 0) {
    p.glow(cx, cy, 16, C[5], 0.4 * on);
    frame(p, COLS[1] - 2, ROWS[0] + bob - 2, TW + 4, TH + 4, t - TAP < 0.1 ? WHITE : C[5], on);
    frame(p, COLS[1] - 3, ROWS[0] + bob - 3, TW + 6, TH + 6, C[3], on * 0.7);
  }
  const u = t - TAP;
  if (u > 0 && u < 0.5) {
    const k = u / 0.5, r = 6 + 12 * ease.outCubic(k);
    p.ring(cx, cy, r, 1, u < 0.08 ? WHITE : C[6], 0.9 * (1 - k));
    p.glowRing(cx, cy, r, 4, C[4], 0.35 * (1 - k));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(i, o.seed) * 0.6, sp = 38 + rand(i, o.seed, 3) * 30, [x, y] = fly(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, u, 40, 3), l = 1 - k;
      p.px(Math.round(x), Math.round(y), i % 2 ? WHITE : C[6]), p.glow(x, y, 4, C[5], 0.4 * l);
    }
    if (u < 0.3) glint(p, COLS[1] + TW - 1, ROWS[0] + bob + 1, 4 * Math.sin((u / 0.3) * Math.PI), WHITE, 0.5);
  }

  // the hand glides in on an arc, taps, waits and leaves
  const inn = ease.outCubic(seg(t, 0.3, 0.95)), out = ease.inCubic(seg(t, 3.0, 3.6));
  const hk = inn * (1 - out);
  if (hk > 0) {
    const arc = -8 * Math.sin(Math.PI * (seg(t, 0.3, 0.95) * (1 - out))) * (1 - inn * 0.5);
    const press = 2 * bump(t, TAP - 0.08, TAP + 0.12);
    const hx = lerp(FAR[0], TIP[0], hk), hy = lerp(FAR[1], TIP[1], hk) + arc + press + bob * hk;
    p.sprite(HAND, { a: INK, b: SKIN, c: SKIN2 }, Math.round(hx - 5), Math.round(hy), { a: Math.min(1, hk * 3) });
  }

  // the bubble
  const [sx, sy] = bubbleScale(t);
  if (sx > 0.02) {
    const q = (x, y) => [A[0] + (x - A[0]) / sx, A[1] + (y - A[1]) / sy];
    L.begin(0, -84);
    L.fill(0, -84, 63, -37, (x, y) => {
      const [qx, qy] = q(x, y);
      const dx = Math.max(Math.abs(qx - 29) - 11, 0), dy = Math.max(Math.abs(qy + 59) - 4, 0), d = Math.hypot(dx, dy) - 6;
      const body = d <= 0;
      if (!body && !inTri(qx, qy, [14, -50], [23, -50], [8, -39])) return 0;
      const v = (qy + 69) / 20;
      if (body && -d < 1.1 && qx < 29 && v < 0.4) return C[6];
      return v < 0.2 ? C[5] : v < 0.52 ? C[4] : v < 0.86 ? C[3] : C[2];
    });
    L.outline(C[0]).draw(p);
    p.glow(lerp(A[0], 29, sx), lerp(A[1], -59, sy), 30 * Math.max(sx, sy), C[3], 0.4 * Math.min(sx, sy));
    // one-pixel sheen along the top
    const s = Math.min(sx, sy);
    if (s > 0.7 && t < EXIT) {
      if (t < SHOW) {
        // typing dots, bouncing in turn
        const ap = seg(t, DOTS - 0.1, DOTS + 0.1);
        for (let i = 0; i < 3; i++) {
          const b = Math.max(0, Math.sin((t - DOTS) * 9 - i * 0.9)), dx = 21 + i * 7, dy = -59 - Math.round(b * 2.4);
          p.rect(dx, dy, 3, 3, i === 1 ? WHITE : C[7], ap);
          p.rect(dx + 1, dy + 3, 1, 1, C[1], ap * 0.6);
        }
      } else {
        // the product, already written: a thumbnail card and three lines
        const a = 1 - seg(t, EXIT - 0.15, EXIT + 0.02), pop = seg(t, SHOW, SHOW + 0.12);
        if (a > 0) {
          const k = ease.outCubic(pop);
          p.rect(14, -67, 17, 16, INK, a);
          furniture(p, "sofa", 15, -66, THUMBS[1].bg, a);
          p.rect(34, -65, Math.round(11 * k), 2, WHITE, a);
          p.rect(34, -61, Math.round(8 * k), 2, C[6], a);
          p.rect(34, -57, Math.round(10 * k), 2, C[5], a);
        }
      }
    }
  }
}

