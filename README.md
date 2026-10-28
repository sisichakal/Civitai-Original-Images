# Civitai Original Images

Userscript serving full-resolution Civitai images, fixing cropping and adding a megapixel filter.

[![Userscript](https://img.shields.io/badge/userscript-v2.13-blue)](civitai-original-images.user.js) [![No dependencies](https://img.shields.io/badge/dependencies-none-lightgrey)](#how-it-works)

Civitai serves compressed previews and crops them to fit its grid. This script gives you the originals, uncropped.

## What it does

- Loads images at original quality instead of the gallery preview.
- Fixes aspect-ratio cropping and tightens the layout gaps.
- Filters the gallery by megapixels, so low-resolution uploads stay out of the way.
- Keeps your preferences in a settings panel between visits.

## Where it runs

- `civitai.com/*`
- `civitai.red/*`

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open [`civitai-original-images.user.js`](civitai-original-images.user.js) and click **Raw**.

Tampermonkey picks up the install prompt automatically. Updates are served through `@updateURL`, so later versions are offered without reinstalling.

## Configuration

Defaults live in `DEFAULT_SETTINGS` and are persisted under `SETTINGS_KEY`. `IMAGE_WIDTH`, `MIN_IMAGE_SIZE` and `BADGE_MAX_DIMENSION` control the grid.

## How it works

A single `.user.js` file of plain DOM code: no build step, no bundler, no external library.

## Known limitations

- Selectors track the site's current markup and will need updating when it changes.
