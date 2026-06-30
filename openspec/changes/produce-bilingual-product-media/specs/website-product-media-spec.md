# Website Product Media Spec

`website-first`

## Goal

Define the capture and regeneration standard for the website-facing product media used in `website/assets/product-media/{en,zh}`.

## Static Screenshots

- Target output: PNG
- Recommended capture width: `1600px`
- Recommended capture height: `1000px`
- Avoid overly wide empty margins; the primary content should occupy most of the frame
- Use the application window itself as the source, not post-upscaled small captures
- Optimize for direct readability inside the website hero and feature showcase areas
- Prefer tighter framing over a much larger canvas; bigger is not better if the content becomes smaller in-frame

## Workflow Video

- Target output: `webm`
- Recommended capture width: `1600px`
- Recommended capture height: `1000px`
- Recommended playback pace: `10fps - 12fps`
- Recommended step delays: roughly `1200ms - 2200ms`
- The workflow should read clearly at website size without needing manual pause or tab switching
- For GIF assemblies, use a short ordered screenshot sequence rather than a long screen recording

## Required Scenes

- Tree overview
- Open note in editor
- Node operations
- Full-text search
- Workflow media for open/edit/search

## Quality Checks

- No real user notes are captured
- English and Chinese assets stay language-consistent
- PNG text remains readable at website display size
- `webm` is slow enough that UI transitions can be understood
- Existing website references remain valid

## Agent Hand-off

Any other model or agent can reuse the capture scripts directly if it is given:

- The repository root
- The target language: `en` or `zh`
- A demo storage path, such as `/tmp/pn-media-en` or `/tmp/金字塔笔记-中文演示数据`
- The running Electron CDP websocket URL from `http://127.0.0.1:9223/json/list`
- The output directory for captures
- The desired capture size overrides, if different from the defaults

The scripts assume:

- The demo workspace has already been installed into the target storage path
- The app is running with `PYRAMID_CAPTURE_MODE=1`
- The dev build exposes a remote debugging port
- `window.api.capturePage(...)` is available in the renderer

The script entry points are:

- `scripts/capture-product-media.mjs`
- `scripts/capture-product-workflow.mjs`
- `scripts/build-product-story-gif.py`

The reusable contract is command-line only, so an agent does not need to understand the UI internals if it can provide the parameters above.
