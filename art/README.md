# Profile art

The animated icons and the banner in this profile are pixel art drawn in code with
[pixelfx](https://github.com/patch-gg/pixelfx) (MIT). These are the sources.

- `kilian/*.js`: one effect per project icon (catalog, voltio, festivos, delegar, plinko, peaje, contact).
- `banner.mjs`: the header banner (aurora, fireflies, campfire and the name).

## Render them again

From the root of this repo:

```bash
git clone --depth 1 https://github.com/patch-gg/pixelfx.git   # ignored by .gitignore
cp -r art/kilian pixelfx/src/fx/

# look at one: contact sheet in pixelfx/records/kilian/<name>/contact.png
cd pixelfx && node tools/render.mjs kilian/plinko --zoom 3 && node tools/check.mjs kilian/plinko && cd ..

# export an icon as the GIF the README uses (seconds = the effect's duration)
cd pixelfx && node tools/montage.mjs ../assets/plinko.gif --ids kilian/plinko --cols 1 --rows 1 --cell 112x104 --gap 0 --scale 1 --seconds 4 --fps 20 && cd ..

# the banner (needs ffmpeg)
node art/banner.mjs assets/banner.gif
```

Durations: catalog 4, voltio 4, festivos 4.5 (exported as `colombia.gif`), delegar 4, plinko 4, peaje 5, contact 3.6.
After editing an effect, copy it back from `pixelfx/src/fx/kilian/` to `art/kilian/`.
