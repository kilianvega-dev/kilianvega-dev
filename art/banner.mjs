// Banner animado para el README de perfil: aurora + luciérnagas + fogata + nombre en fuente pixel.
//   node art/banner.mjs assets/banner.gif [--png]   (--png saves one frame to check; see art/README.md)
import { createFrame, clearFrame, createFx, composite, backdrop, painterFor, hex } from "../pixelfx/src/core/index.js";
import { loadEffect, writeVideo, save } from "../pixelfx/tools/lib/fxlib.mjs";
import { encodePNG } from "../pixelfx/tools/lib/png.mjs";

const out = process.argv[2] ?? "banner.gif", png = process.argv.includes("--png");
const W = 320, H = 110, FLOOR = 104, fps = 12, seconds = 12; // 12 s = ciclo de la aurora y de las luciérnagas
const layers = [
  ["weather/aurora", 160, FLOOR + 4],
  ["weather/fireflies", 160, FLOOR],
  ["fire/campfire", 286, FLOOR],
];
const fxs = [];
for (const [id, x, y] of layers) fxs.push(createFx((await loadEffect(id)).mod, { x, y }));

const frame = createFrame(W, H), bg = backdrop("sky", W, H, FLOOR), frames = [];
const n = png ? 1 : seconds * fps;
const NAME = hex("#f6eeff"), INK = hex("#120b2a"), SUB = hex("#9af7bf");
for (let f = 0; f < n; f++) {
  const t = png ? 4 : f / fps;
  for (const fx of fxs) while (fx.t < t - 1e-6) fx.update(1 / fps);
  clearFrame(frame);
  for (const fx of fxs) fx.draw(frame, "back");
  for (const fx of fxs) fx.draw(frame, "front");
  const p = painterFor(frame);
  p.rect(0, FLOOR, W, H - FLOOR, hex("#0b0d17")); // suelo
  p.text("KILIAN VEGA", W / 2, 30, NAME, { font: "big", scale: 3, align: "center", outline: INK });
  p.text("SYSTEMS ENGINEERING / WEB / AUTOMATION / AI", W / 2, 60, SUB, { font: "mini", align: "center", outline: INK });
  const buf = new Uint8ClampedArray(W * H * 4);
  composite(frame, buf, bg);
  frames.push({ color: buf });
}
if (png) save(out, encodePNG(W * 1, H, frames[0].color));
else writeVideo(out, { w: W, h: H, fps, frames }, 2);
console.log("->", out);
