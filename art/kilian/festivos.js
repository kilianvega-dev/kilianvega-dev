import { fit, clamp, lerp, seg, bump, ease, rand, fly, flyV, TAU, WHITE, hex } from "../../core/index.js";
import { glint, blobShadow } from "../pickups/_lib.js";

export const meta = {
  name: "Holiday moves",
  desc: "A desk calendar: a highlighted holiday hops along an arc to the Monday column, lands squashing into the Colombian flag and bursts into yellow, blue and red confetti and sparks.",
  tags: ["kilian", "calendar", "holiday", "colombia", "confetti", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 4.5,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#050d26", "#0c2058", "#16408f", "#2a68d0", "#5a98ee", "#9cc4fa", "#d4e6ff", "#ffffff"], seed: 11 },
};

const INK = hex("#16141f"), PAPER = hex("#f6f1e4"), PAPER2 = hex("#e4dcc8"), PAPER3 = hex("#b9afa0"), MON = hex("#d6e2f6"), MON2 = hex("#b4c8ea");
const YEL = hex("#fcd116"), YEL2 = hex("#fff08a"), BLU = hex("#1a3fa8"), BLU2 = hex("#4a72dc"), RED = hex("#ce1126"), RED2 = hex("#8e0a1a");
const STEEL = hex("#9ea3b4"), STEEL2 = hex("#e2e6f2");
const PX = -29, PY = -70, PW = 58, PH = 64, GX = -25, GY = -55, CW = 9, CH = 8;
const SRC = [2, 1], DST = [0, 2];
const HOP = 0.9, LAND = 1.5, FADE = 3.85, BACK = 4.2;
const cx = (c) => GX + c * 10, cy = (r) => GY + r * 9;
const ctr = ([c, r]) => [cx(c) + CW / 2, cy(r) + CH / 2];
const A = ctr(SRC), B = ctr(DST);
const COL = [YEL, BLU2, RED, YEL2, WHITE];

// the token rides a parabola from the weekday cell to the Monday cell
function tokenPos(t) {
  const k = ease.inOutSine(seg(t, HOP, LAND)), s = Math.sin(Math.PI * k);
  return [lerp(A[0], B[0], k), lerp(A[1], B[1], k) - 17 * s, k];
}

// a rect scaled about its bottom center
function sbox(p, x, y, w, h, sx, sy, c, a = 1) {
  const W = w * sx, H = h * sy;
  p.rect(Math.round(x + (w - W) / 2), Math.round(y + h - H), Math.max(1, Math.round(W)), Math.max(1, Math.round(H)), c, a);
}

function flagCell(p, x, y, sx, sy, a, wipe) {
  sbox(p, x - 1, y - 1, CW + 2, CH + 2, sx, sy, INK, a);
  const rows = [[0, 4, YEL], [4, 2, BLU], [6, 2, RED]];
  for (const [r0, n, c] of rows) {
    const rr = Math.min(n, Math.max(0, wipe * CH - r0));
    if (rr > 0) sbox(p, x, y + r0 * sy, CW, rr, sx, sy, c, a);
  }
  // lit top edge on the yellow, a darker lower rim on the red
  sbox(p, x, y, CW, 1, sx, sy, YEL2, a);
  if (wipe > 0.95) {
    sbox(p, x, y + 4, CW, 1, sx, sy, BLU2, a);
    sbox(p, x, y + CH - 1, CW, 1, sx, sy, RED2, a);
  }
}

function ghost(p, x, y, a) {
  for (let i = 0; i < CW; i += 2) p.dot(x + i, y, PAPER3, a), p.dot(x + i, y + CH - 1, PAPER3, a);
  for (let j = 0; j < CH; j += 2) p.dot(x, y + j, PAPER3, a), p.dot(x + CW - 1, y + j, PAPER3, a);
}

function token(p, x, y, sx, sy, a = 1) {
  sbox(p, x - 1, y - 1, CW + 2, CH + 2, sx, sy, INK, a);
  sbox(p, x, y, CW, CH, sx, sy, YEL, a);
  sbox(p, x, y, CW, 2, sx, sy, YEL2, a);
  sbox(p, x, y + CH - 1, CW, 1, sx, sy, hex("#c89a0a"), a);
}

export function drawBack(p, t, o) {
  const bob = Math.round(Math.sin((t / meta.duration) * TAU));
  blobShadow(p, 0, 26 - bob, 0.85, 1);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), bob = Math.round(Math.sin((t / meta.duration) * TAU));
  const Y = bob; // everything on the page rides this
  const u = t - LAND, landed = t >= LAND;
  const flash = landed ? Math.exp(-u * 7) : 0;
  p.glow(0, PY + 30 + Y, 46, C[3], 0.12 + 0.1 * flash);

  // the page: drop shadow, outline, paper
  p.rect(PX + 2, PY + Y + 2, PW, PH, INK, 0.45);
  p.rect(PX - 1, PY + Y - 1, PW + 2, PH + 2, INK);
  p.rect(PX, PY + Y, PW, PH, PAPER);
  p.rect(PX, PY + Y, 1, PH, WHITE);
  p.rect(PX + PW - 1, PY + Y, 1, PH, PAPER2);
  p.rect(PX, PY + Y + PH - 1, PW, 1, PAPER2);
  // header band with a lit top edge
  p.rect(PX, PY + Y, PW, 12, C[2]);
  p.rect(PX, PY + Y, PW, 1, C[5]);
  p.rect(PX, PY + Y + 1, PW, 1, C[4]);
  p.rect(PX, PY + Y + 11, PW, 1, C[1]);
  const lun = t >= LAND && t < FADE + 0.2;
  const hw = lun && u < 0.1 ? WHITE : C[7];
  p.text(lun ? "LUN" : "MAR", 0, PY + Y + 4, hw, { font: "mini", align: "center", shadow: C[0] });

  // the grid of day cells: Monday's column tinted
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++) {
      const x = cx(c), y = cy(r) + Y;
      p.rect(x, y, CW, CH, c === 0 ? MON : PAPER2);
      p.rect(x, y, CW, 1, c === 0 ? WHITE : PAPER);
      p.rect(x, y + CH - 1, CW, 1, c === 0 ? MON2 : PAPER3);
    }

  // the holiday token waits on its weekday, hops to Monday, the flag fills the cell, then it resets
  const [sx0, sy0] = [cx(SRC[0]), cy(SRC[1]) + Y];
  const back = seg(t, FADE, BACK);
  if (t < HOP) {
    const wind = bump(t, 0.5, HOP) * 0.2, k = t < 0.5 ? 0 : 1;
    // anticipation: squash down before the hop
    token(p, sx0, sy0, 1 + wind * k, 1 - wind * 1.4 * k);
    p.text("18", sx0 + CW / 2, sy0 + 2, INK, { font: "mini", align: "center" });
  } else {
    ghost(p, sx0, sy0, 0.8 * (1 - back));
    if (back > 0) {
      token(p, sx0, sy0, 1, 1, back);
      if (back > 0.5) p.text("18", sx0 + CW / 2, sy0 + 2, INK, { font: "mini", align: "center", a: back });
    }
  }

  // in flight: a stretching token and an arc trail of fading squares and light
  if (t >= HOP && t < LAND) {
    const [x, yy, k] = tokenPos(t);
    for (let i = 8; i >= 1; i--) {
      const [tx, ty] = tokenPos(t - i * 0.028);
      if (t - i * 0.028 < HOP) continue;
      const f = 1 - i / 9;
      p.rect(Math.round(tx + CW / 2 - 1 + 0), Math.round(ty + Y - 1), 2, 2, i < 3 ? YEL2 : YEL, 0.9 * f);
      p.glow(tx, ty + Y, 6, YEL, 0.3 * f);
    }
    const v = Math.abs(Math.cos(Math.PI * k)), st = 1 + 0.22 * v;
    token(p, x - CW / 2, yy - CH / 2 + Y, 1 / st, st);
    p.glow(x, yy + Y, 14, YEL, 0.45);
  }
  if (landed && t < BACK) {
    const [x, y] = [cx(DST[0]), cy(DST[1]) + Y], f = 1 - seg(t, FADE, BACK);
    const sq = Math.exp(-u * 13) * Math.cos(u * 32), sy = 1 - 0.38 * sq, sx = 1 + 0.3 * sq;
    flagCell(p, x, y, sx, sy, f, seg(u, 0, 0.1));
    const gx = x + CW / 2, gy = y + CH / 2;
    p.glow(gx, gy, 14 + 6 * flash, YEL, (0.2 + 0.35 * flash) * f);
    p.glow(gx, gy, 14, RED, 0.18 * f * flash);
    if (u < 0.35) {
      const k = u / 0.35, r = 5 + 14 * ease.outCubic(k);
      p.ring(gx, gy, r, 1, k < 0.2 ? WHITE : YEL2, 0.9 * (1 - k));
      p.glowRing(gx, gy, r, 4, YEL, 0.4 * (1 - k));
    }
    // confetti: pieces flung up and out, tumbling as they fall, fading at the end
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (rand(i, o.seed, 1) - 0.5) * 2.5, sp = 45 + rand(i, o.seed, 2) * 60;
      const born = rand(i, o.seed, 3) * 0.08, ag = u - born;
      if (ag < 0) continue;
      const life = 1.5 + rand(i, o.seed, 4) * 0.6, k = ag / life;
      if (k >= 1) continue;
      const [qx, qy] = fly(gx, gy, Math.cos(a) * sp, Math.sin(a) * sp, ag, 150, 1.3);
      const c = COL[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2], al = (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) * f * clamp((3 - qy) / 6, 0, 1) * clamp((54 - Math.abs(qx)) / 6, 0, 1);
      const sw = Math.sin(ag * (9 + rand(i, o.seed, 5) * 8) + i), wide = Math.abs(sw) > 0.5;
      const w = i % 3 === 0 ? 4 : 3;
      p.rect(Math.round(qx), Math.round(qy), wide ? w : 2, wide ? 2 : w, sw > 0 ? c : c === YEL ? YEL2 : c === BLU2 ? BLU : RED2, al);
      if (k < 0.5) p.glow(qx, qy, 4, c, 0.18 * al);
    }
    // hot sparks and glints at the moment of impact
    for (let i = 0; i < 10; i++) {
      const a = rand(i, o.seed, 9) * TAU, sp = 70 + rand(i, o.seed, 10) * 90, ag = u - 0.01;
      if (ag < 0 || ag > 0.4) continue;
      const [qx, qy] = fly(gx, gy, Math.cos(a) * sp, Math.sin(a) * sp, ag, 60, 3), [vx, vy] = flyV(Math.cos(a) * sp, Math.sin(a) * sp, ag, 60, 3);
      const l = 1 - ag / 0.4;
      p.line(qx, qy, qx - vx * 0.03, qy - vy * 0.03, (n) => (n < 0.4 ? WHITE : YEL2), l);
      p.glow(qx, qy, 5, YEL, 0.45 * l);
    }
    for (const [dx, dy, d0] of [[-5, -4, 0.04], [6, -3, 0.18], [-2, 4, 0.3]]) {
      const g = (u - d0) / 0.3;
      if (g > 0 && g < 1) glint(p, gx + dx, gy + dy, 4 * Math.sin(g * Math.PI), WHITE, 0.5);
    }
  }
  // rings of the binding, on top of the header
  for (const x of [-18, -6, 6, 18]) {
    p.rect(x - 1, PY + Y - 6, 4, 10, INK);
    p.rect(x, PY + Y - 5, 2, 8, STEEL);
    p.rect(x, PY + Y - 5, 1, 8, STEEL2);
    p.rect(x, PY + Y + 2, 2, 1, hex("#6a6f82"));
  }
}
