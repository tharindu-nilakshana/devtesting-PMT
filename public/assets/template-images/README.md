# Template Images Directory

This directory contains custom images for templates. 

## Usage

Place images in this folder with the same name as your template:
- Template name: `AUDCAD` → Image file: `AUDCAD.png` or `AUDCAD.svg` or `AUDCAD.webp`
- Template name: `EUR:USD` → Image file: `EUR_USD.png` (colon replaced with underscore)
- Template name: `BTC/USDT` → Image file: `BTC_USDT.png` (slash replaced with underscore)

**Important**: Some characters in template names are replaced for compatibility:
- Colons (`:`) → Underscores (`_`)
- Slashes (`/`, `\`) → Underscores (`_`)
- Other invalid filename characters → Underscores (`_`)

## Supported Formats

The following image formats are supported:
- `.png` (recommended)
- `.webp` (recommended for smaller file size)
- `.jpg` / `.jpeg`
- `.svg` (scalable vector graphics)
- `.gif`

## Image Requirements

- **Size**: Images should be square (e.g., 64x64, 128x128, 256x256 pixels)
- **Format**: PNG or WebP recommended for transparency support
- **File naming**: Must match the template name exactly (case-sensitive)

## Example

For a template named "AUDCAD", create one of these files:
- `AUDCAD.png`
- `AUDCAD.webp`
- `AUDCAD.svg`
- `AUDCAD.jpg`

For a template named "EUR:USD", the image should be:
- `EUR_USD.png` (colon replaced with underscore)
- `EUR_USD.webp`
- `EUR_USD.svg`

The system will automatically try to load the image. If no image is found, it will fall back to displaying the icon/emoji assigned to the template.

## Sample Files

This folder includes:
- `AUDCAD.svg` - Example currency pair icon (can be replaced with your own image)
