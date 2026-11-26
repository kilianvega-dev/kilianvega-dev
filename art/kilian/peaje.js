import { fit, clamp, seg, lerp, ease, TAU, WHITE, mix, hex } from "../../core/index.js";
import { Layer } from "../pickups/_lib.js";

export const meta = {
  name: "ESP32 toll booth",
  desc: "Night toll booth: a car rolls in, breaks the red sensor beam of an ESP32 post, stops, the LED turns green, the striped arm lifts, the car drives off and the arm drops back.",
  tags: ["kilian", "esp32", "toll", "car", "night", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 5,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#070b18", "#101a33", "#1d2c52", "#304a7c", "#4f72a8", "#86a7d0", "#c4daf0", "#ffffff"],
    car: ["#04281f", "#0a5a3e", "#10a060", "#30d884", "#7af0b0", "#b8ffd4", "#e8fff2", "#ffffff"],
    red: ["#2a0508", "#600a14", "#a01426", "#e02a3a", "#ff5a5a", "#ff9a90", "#ffd0c8", "#ffffff"],
    lamp: ["#2a1400", "#6a3400", "#b06400", "#f0a020", "#ffd060", "#ffeaa0", "#fff6d0", "#ffffff"],
    seed: 3,
  },
};

const D = 5, PX = 21.5, PY = -17, LEN = 33, OPEN = 1.48; // arm pivot, length, open angle
const BOX = [0, -28], BEND = [-34, 0]; // sensor emitter and where its beam meets the road
const car = new Layer(44, 24), INK = hex("#06070d");

// the car's center at time t: rolls in, brakes at the beam, waits, then pulls away
const carX = (t) => (t < 0.8 ? -70 + 36.25 * t : t < 1.6 ? -41 + 13 * (1 - (1 - (t - 0.8) / 0.8) ** 2) : t < 2.25 ? -28 : -28 + 100 * seg(t, 2.25, 3.75) ** 1.8);
// the arm: up with ease, down with a gravity drop and a small rebound
const armAng = (t) => (t < 2.5 ? OPEN * ease.inOutCubic(seg(t, 1.7, 2.5)) : OPEN * (1 - ease.outBounce(seg(t, 3.5, 4.4))));

function drawCar(p, S, K, cx, t) {
  const X = Math.round(cx), q = car.begin(X - 22, -22), moving = Math.abs(carX(t + 0.02) - carX(t - 0.02)) > 0.01;
  // body: lit roofline, shaded sill, cabin with a window and a glint
  q.rect(X - 14, -9, 28, 6, K[3]);
  q.rect(X - 14, -9, 28, 1, K[5]);
  q.rect(X - 14, -4, 28, 1, K[2]);
  q.poly([[X - 9, -9], [X - 5, -14], [X + 4, -14], [X + 8, -9]], K[4]);
  q.poly([[X - 7.5, -9.5], [X - 4.5, -13], [X - 0.5, -13], [X - 0.5, -9.5]], S[3]);
  q.poly([[X + 0.5, -9.5], [X + 0.5, -13], [X + 3.5, -13], [X + 6.5, -9.5]], S[4]);
  q.px(X - 5, -12, S[6]);
  for (const [x, y] of [[X - 14, -9], [X + 13, -9], [X - 14, -4], [X + 13, -4]]) car.set(x, y, 0);
  car.fill(X - 14, -9, X + 14, -3, (x, y) => (y > -9 && y < -4 && Math.abs(x - X - 4) < 0.6 ? K[2] : 0));
  for (const wx of [X - 8, X + 8]) q.circle(wx, -3.6, 3.7, K[0]);
  car.outline(INK);
  // lamps, then wheels over the outline so they stay round
  for (const wx of [X - 8, X + 8]) {
    q.circle(wx, -3.6, 3.4, S[1]);
    q.circle(wx, -3.6, 1.7, S[5]);
    const a = cx / 3.6;
    q.px(wx + Math.cos(a) * 2.2, -3.6 + Math.sin(a) * 2.2, S[6]);
    q.px(wx - Math.cos(a) * 2.2, -3.6 - Math.sin(a) * 2.2, S[3]);
    q.px(wx, -3.6, K[0]);
  }
  q.px(X + 13, -7, WHITE);
  q.px(X + 13, -6, K[6]);
  q.px(X - 14, -7, hex("#ff4a4a"));
  car.draw(p, 0, 0, 1, [-54, 54]);
  void moving;
}

export function drawBack(p, t, o) {
  const S = fit(o.palette, 8), K = fit(o.car, 8), R = fit(o.red, 8), A = fit(o.lamp, 8), cx = carX(t);
  // road, lane dashes
  p.shade(-54, 0, 54, 7, (x, y, out) => { out.c = y < 1 ? S[3] : y < 2 ? S[2] : y < 5 ? S[1] : S[0]; });
  for (let x = -52; x < 54; x += 12) p.line(x, 4, x + 6, 4, S[2]);
  // the lamp: a cone from under the roof edge and a warm pool on the road
  p.shade(0, -34, 40, 0, (x, y, out) => {
    const u = (y + 34) / 34, hw = 2 + u * 20, d = Math.abs(x - 19) / hw;
    if (d >= 1) return;
    out.l = A[3];
    out.k = 0.1 * (1 - d) * (0.4 + u);
  });
  p.shade(-14, -3, 44, 6, (x, y, out) => {
    const dx = (x - 15) / 29, dy = (y - 1.5) / 4.5, d = dx * dx + dy * dy;
    if (d >= 1) return;
    out.l = A[3];
    out.k = (1 - Math.sqrt(d)) ** 1.5 * 0.55;
  });
  // the booth: lit left wall, a window with the attendant's silhouette, counter, roof and sign
  p.shade(23, -33, 48, 0, (x, y, out) => {
    const e = x < 24 ? S[4] : x < 26 ? S[3] : x > 46 ? S[0] : S[2];
    out.c = y > -3 ? mix(e, S[0], 0.6) : e;
  });
  p.shade(27, -28, 44, -16, (x, y, out) => { out.c = y < -26 ? A[5] : y < -22 ? A[4] : A[3]; });
  p.glow(35, -22, 20, A[3], 0.3);
  p.circle(33, -23, 2.1, A[1]);
  p.rect(30, -21, 7, 5, A[1]);
  p.rect(35, -28, 1, 12, S[1]);
  p.rect(26, -16, 19, 2, S[5]);
  p.line(26, -14, 44, -14, S[1]);
  p.rect(20, -37, 31, 4, S[3]);
  p.line(20, -37, 50, -37, S[6]);
  p.line(21, -33, 49, -33, S[0]);
  p.rect(28, -45, 15, 8, S[1]);
  p.rect(28, -45, 15, 1, S[4]);
  p.text("TOLL", 35.5, -43, A[5], { font: "mini", align: "center" });
  p.glow(35, -41, 12, A[3], 0.25);
  // lamp bulb under the roof
  p.px(22, -32, WHITE);
  p.glow(22, -32, 9, A[4], 0.55);

  // the ESP32 sensor on its post
  p.rect(3, -27, 2, 27, S[2]);
  p.px(3, -27, S[4]);
  p.rect(-1, -35, 10, 8, S[4]);
  p.rect(0, -34, 8, 6, S[1]);
  p.rect(1, -33, 3, 2, S[6]);
  p.px(2, -33, WHITE);
  for (let i = 0; i < 3; i++) p.px(5 + (i % 2), -33 + i, S[5]);
  p.px(0, -28, R[5]);
  // status LED: red idling, green from the break until the arm is down
  const green = t > 0.9 && t < 4.3, blink = 0.55 + 0.45 * Math.sin((t / D) * TAU * 6);
  const led = green ? K[5] : R[4];
  p.px(7, -28, green ? WHITE : led);
  p.glow(7, -28, green ? 9 : 5, green ? K[3] : R[3], green ? 0.8 : 0.5 * blink);

  // the beam: dotted, marching, cut where the car blocks it
  let hit = 1;
  for (let s = 0; s <= 1; s += 0.01) {
    const x = lerp(BOX[0], BEND[0], s), y = lerp(BOX[1], BEND[1], s);
    if (y > -13.5 && y < -1 && x >= cx - 14 && x <= cx + 14) { hit = s; break; }
  }
  const flash = t > 0.8 ? Math.exp(-(t - 0.8) * 5) : 0, held = hit < 1 ? 1 : 0, L = Math.hypot(BEND[0] - BOX[0], BEND[1] - BOX[1]) * hit;
  const sx = (BEND[0] - BOX[0]) / Math.hypot(BEND[0] - BOX[0], BEND[1] - BOX[1]), sy = (BEND[1] - BOX[1]) / Math.hypot(BEND[0] - BOX[0], BEND[1] - BOX[1]);
  p.glowLine(BOX[0], BOX[1], BOX[0] + sx * L, BOX[1] + sy * L, 3, R[3], 0.12 + 0.3 * held * 0.6 + 0.5 * flash);
  for (let d = (t * 18) % 3; d < L; d += 3) {
    const x = BOX[0] + sx * d, y = BOX[1] + sy * d;
    p.px(x, y, held || flash > 0.3 ? R[6] : R[4]);
  }
  p.px(BEND[0], BEND[1] - 1, R[3]);
  if (hit < 1) {
    const x = BOX[0] + sx * L, y = BOX[1] + sy * L;
    p.glow(x, y, 7 + 4 * flash, R[4], 0.6 + 0.4 * flash);
    p.px(x, y, WHITE);
  }
  void clamp;
}

export function draw(p, t, o) {
  const S = fit(o.palette, 8), K = fit(o.car, 8), R = fit(o.red, 8), A = fit(o.lamp, 8), cx = carX(t);
  // shadow, headlight cone and the car
  if (cx > -66 && cx < 66) p.line(Math.max(cx - 12, -54), 1, Math.min(cx + 12, 54), 1, S[0]);
  const nx = cx + 14;
  if (nx < 52) p.shade(Math.max(nx, -53), -14, Math.min(nx + 26, 53), 3, (x, y, out) => {
    const u = (x - nx) / 26, hw = 1.5 + u * 8, d = Math.abs(y + 6 - u * 3) / hw;
    if (u < 0 || d >= 1) return;
    out.l = A[5];
    out.k = 0.4 * (1 - u) ** 1.3 * (1 - d);
  });
  if (nx > -48 && nx < 48) p.glow(nx, -6, 6, A[5], 0.5);
  // a puff of exhaust as it pulls away
  for (let i = 0; i < 4; i++) {
    const t0 = 2.3 + i * 0.16, age = t - t0;
    if (age < 0 || age > 0.7) continue;
    const bx = carX(t0) - 15 - age * 6;
    p.disc(bx, -3 - age * 9, 1.4 + age * 3.5, S[5], 0.35 * (1 - age / 0.7));
  }
  drawCar(p, S, K, cx, t);
  // the barrier: its housing, then the striped arm pivoting at its base
  p.rect(19, -21, 6, 21, S[3]);
  p.rect(19, -21, 1, 21, S[5]);
  p.rect(24, -21, 1, 21, S[1]);
  p.rect(19, -21, 6, 1, S[6]);
  p.rect(19, -9, 6, 2, R[3]);
  const a = armAng(t), ux = -Math.cos(a), uy = -Math.sin(a), nxv = -uy, nyv = ux, n = 8;
  p.beam(PX, PY, PX + ux * LEN, PY + uy * LEN, 4.2, INK);
  for (let i = 0; i < n; i++) {
    const d0 = (i * LEN) / n, d1 = ((i + 1) * LEN) / n, red = i % 2 === 0;
    p.beam(PX + ux * d0, PY + uy * d0, PX + ux * d1, PY + uy * d1, 2.8, red ? R[3] : S[6]);
    p.line(PX + ux * d0 + nxv * -0.9, PY + uy * d0 + nyv * -0.9, PX + ux * d1 - nxv * 0.9, PY + uy * d1 - nyv * 0.9, red ? R[5] : WHITE);
  }
  const tx = PX + ux * LEN, ty = PY + uy * LEN, moving = a > 0.02 && a < OPEN - 0.02;
  p.circle(PX, PY, 2, S[4]);
  p.px(PX, PY, WHITE);
  p.px(tx, ty, moving ? WHITE : R[5]);
  p.glow(tx, ty, moving ? 9 : 5, R[4], moving ? 0.7 : 0.3);
  p.glow(tx * 0.6 + PX * 0.4, ty * 0.6 + PY * 0.4, 12, A[3], 0.1);
  void seg;
}
