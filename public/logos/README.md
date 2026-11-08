# Jingwuguan Seibukan logo assets

All production-facing logo assets in this directory use a normalized 1024 × 1024
PNG canvas. Each source image is aspect-fit on white without cropping or stretching,
so video watermarks, certificates and responsive UI previews can share one square
rendering contract.

## Organization

- `organization/logo-js.png` — Jingwuguan Seibukan organization logo

## Classes

- `classes/taijiquan.png` — database class `Taiji`
- `classes/karate.png` — database class `Karate`
- `classes/xingyiquan.png` — database class `Xingyi`
- `classes/aikido.png` — database class `Aikido`
- `classes/kungfu-kids.png` — database class `Kungfu Kids`

The five class files are also uploaded to the staging `class-logos` bucket as
`{class-id}/logo.png`; `classes.logo_url` points to those exact staging objects.

## Dojos and affiliates

- `dojos/chushin-zhongxin.png` — Chushin & Zhongxin
- `dojos/kagami.png` — Kagami
- `dojos/uac.png` — UAC
- `dojos/hayashitane.png` — Hayashitane

The current database has no dojo-logo column or storage workflow. These four files
are therefore versioned static assets and must not be written into an unrelated
database field.
