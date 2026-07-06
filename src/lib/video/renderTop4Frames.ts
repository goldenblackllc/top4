import satori from 'satori';
import sharp from 'sharp';
import { readFileSync, accessSync } from 'fs';
import { join } from 'path';

// ── Types ────────────────────────────────────────────────────

export interface Top4Item {
  rank: number;
  title: string;
  subtitle?: string;
  image_url?: string;
  preview_url?: string;
}

export interface CategoryData {
  category: string;
  label: string;
  emoji: string;
  color: string;
  items: Top4Item[];
  imagePaths: (string | null)[];  // local paths to downloaded item images
  audioPaths: (string | null)[];  // local paths to downloaded audio clips
}

export interface VideoConfig {
  displayName: string;
  avatarPath?: string;
  categories: CategoryData[];
}

// Design + render size (Satori renders at full resolution)
const WIDTH = 1080;
const HEIGHT = 1920;

// Output resolution (resize AFTER render to fit Vercel memory limits)
const OUT_WIDTH = 720;
const OUT_HEIGHT = 1280;

// ── Font Loading ─────────────────────────────────────────────
// Satori reads font buffers directly — no system fonts/fontconfig needed.
// This is why it works on Vercel Lambda where librsvg can't find fonts.

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontEntry = { name: string; data: Buffer; weight: FontWeight; style: 'normal' };
let fontsCache: FontEntry[] | null = null;

function getFonts(): FontEntry[] {
  if (fontsCache) return fontsCache;

  let dir: string;
  try {
    dir = join(process.cwd(), 'public', 'fonts');
    accessSync(join(dir, 'Inter-Regular.ttf'));
  } catch {
    // Fallback for Vercel bundled layout where process.cwd() differs
    dir = join(__dirname, '..', '..', '..', '..', 'public', 'fonts');
  }

  const load = (file: string, weight: FontWeight): FontEntry => ({
    name: 'Inter',
    data: readFileSync(join(dir, file)),
    weight,
    style: 'normal' as const,
  });

  fontsCache = [
    load('Inter-Regular.ttf', 400),
    load('Inter-Medium.ttf', 500),
    load('Inter-SemiBold.ttf', 600),
    load('Inter-Bold.ttf', 700),
    load('Inter-ExtraBold.ttf', 800),
    load('Inter-Black.ttf', 900),
  ];

  console.log('[Video] Loaded Inter font buffers from:', dir);
  return fontsCache;
}

// ── Helpers ──────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Render a raw SVG string to a PNG buffer (used only for image masks, no text) */
async function renderSvgToPng(svg: string, w: number, h: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72 })
    .resize(w, h)
    .png()
    .toBuffer();
}

/** Render a Satori element tree → SVG (with text as paths) → PNG via sharp */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderFrame(element: any, extraComposites?: sharp.OverlayOptions[]): Promise<Buffer> {
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: getFonts(),
  });

  let basePng = await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .png()
    .toBuffer();

  // Composite images (e.g. item artwork) at full design resolution
  if (extraComposites?.length) {
    basePng = await sharp(basePng)
      .composite(extraComposites)
      .png()
      .toBuffer();
  }

  // Then resize to output resolution
  return sharp(basePng)
    .resize(OUT_WIDTH, OUT_HEIGHT)
    .png()
    .toBuffer();
}

// ── Reusable Element Builders ────────────────────────────────

/** Accent gradient bar at top of frame */
function accentBar(colors: string | string[]) {
  const gradient = Array.isArray(colors)
    ? `linear-gradient(to right, ${colors.join(', ')})`
    : `linear-gradient(to right, ${colors}, ${hexToRgba(colors, 0.5)} 70%, transparent 100%)`;
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute' as const, top: 0, left: 0,
        width: '100%', height: 6,
        backgroundImage: gradient,
      },
    },
  };
}

/** "top4" logo — "top" in white + "4" with gradient fill */
function logoElement(size: number = 72) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'baseline' },
      children: [
        {
          type: 'span',
          props: {
            style: { fontSize: size, fontWeight: 800, color: 'white', letterSpacing: -2, fontFamily: 'Inter' },
            children: 'top',
          },
        },
        {
          type: 'span',
          props: {
            style: {
              fontSize: size, fontWeight: 800, letterSpacing: -2, fontFamily: 'Inter',
              backgroundImage: 'linear-gradient(135deg, #f59e0b, #a78bfa, #2dd4bf)',
              backgroundClip: 'text',
              color: 'transparent',
            },
            children: '4',
          },
        },
      ],
    },
  };
}

/** URL footer text */
function urlFooter() {
  return {
    type: 'span',
    props: {
      style: { fontSize: 28, fontWeight: 400, color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter' },
      children: 'www.top4.info',
    },
  };
}

/** Absolutely-positioned, horizontally centered wrapper */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function centered(top: number, child: any) {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute' as const, top, left: 0, width: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      },
      children: child,
    },
  };
}

/** Category SVG icon as a Satori inline SVG element */
function categoryIconElement(category: string, size: number, color: string) {
  const s = size;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = (() => {
    switch (category) {
      case 'artists':
        return [
          { type: 'circle', props: { cx: s * 0.28, cy: s * 0.78, r: s * 0.15, fill: color } },
          { type: 'circle', props: { cx: s * 0.72, cy: s * 0.65, r: s * 0.15, fill: color } },
          { type: 'rect', props: { x: s * 0.40, y: s * 0.12, width: s * 0.04, height: s * 0.66, fill: color } },
          { type: 'rect', props: { x: s * 0.84, y: s * 0.05, width: s * 0.04, height: s * 0.60, fill: color } },
          { type: 'rect', props: { x: s * 0.40, y: s * 0.08, width: s * 0.48, height: s * 0.08, rx: s * 0.03, fill: color } },
        ];
      case 'movies':
        return [
          { type: 'rect', props: { x: s * 0.1, y: s * 0.35, width: s * 0.8, height: s * 0.55, rx: s * 0.06, fill: color, fillOpacity: 0.9 } },
          { type: 'rect', props: { x: s * 0.1, y: s * 0.18, width: s * 0.8, height: s * 0.22, rx: s * 0.04, fill: color } },
          { type: 'line', props: { x1: s * 0.28, y1: s * 0.18, x2: s * 0.38, y2: s * 0.40, stroke: '#08080d', strokeWidth: s * 0.035 } },
          { type: 'line', props: { x1: s * 0.48, y1: s * 0.18, x2: s * 0.58, y2: s * 0.40, stroke: '#08080d', strokeWidth: s * 0.035 } },
          { type: 'line', props: { x1: s * 0.68, y1: s * 0.18, x2: s * 0.78, y2: s * 0.40, stroke: '#08080d', strokeWidth: s * 0.035 } },
        ];
      case 'tv':
        return [
          { type: 'rect', props: { x: s * 0.1, y: s * 0.15, width: s * 0.8, height: s * 0.58, rx: s * 0.08, fill: color } },
          { type: 'rect', props: { x: s * 0.18, y: s * 0.23, width: s * 0.64, height: s * 0.42, rx: s * 0.03, fill: '#08080d', fillOpacity: 0.5 } },
          { type: 'rect', props: { x: s * 0.35, y: s * 0.78, width: s * 0.3, height: s * 0.06, rx: s * 0.02, fill: color } },
          { type: 'rect', props: { x: s * 0.25, y: s * 0.84, width: s * 0.5, height: s * 0.05, rx: s * 0.02, fill: color, fillOpacity: 0.6 } },
        ];
      case 'books':
        return [
          { type: 'path', props: { d: `M${s * 0.5} ${s * 0.22} Q${s * 0.3} ${s * 0.18} ${s * 0.1} ${s * 0.25} L${s * 0.1} ${s * 0.78} Q${s * 0.3} ${s * 0.72} ${s * 0.5} ${s * 0.75} Z`, fill: color, fillOpacity: 0.85 } },
          { type: 'path', props: { d: `M${s * 0.5} ${s * 0.22} Q${s * 0.7} ${s * 0.18} ${s * 0.9} ${s * 0.25} L${s * 0.9} ${s * 0.78} Q${s * 0.7} ${s * 0.72} ${s * 0.5} ${s * 0.75} Z`, fill: color } },
          { type: 'line', props: { x1: s * 0.5, y1: s * 0.22, x2: s * 0.5, y2: s * 0.75, stroke: '#08080d', strokeWidth: s * 0.02, strokeOpacity: 0.3 } },
        ];
      default:
        return [
          { type: 'circle', props: { cx: s / 2, cy: s / 2, r: s * 0.4, fill: color, fillOpacity: 0.3 } },
        ];
    }
  })();

  return {
    type: 'svg',
    props: { viewBox: `0 0 ${s} ${s}`, width: s, height: s, children },
  };
}

// ── Frame Renderers ──────────────────────────────────────────

/**
 * Frame 1: Hook — "David's Top 4"
 */
export async function renderHookFrame(config: VideoConfig): Promise<Buffer> {
  const cats = config.categories;
  const numCats = cats.length;

  // Radial gradient glows for each category colour
  const glowElements = cats.map((c, i) => {
    const cx = 25 + (i * 50 / Math.max(numCats - 1, 1));
    return {
      type: 'div',
      props: {
        style: {
          position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: `radial-gradient(circle at ${cx}% 42%, ${hexToRgba(c.color, 0.1)} 0%, transparent 70%)`,
        },
      },
    };
  });

  // 2×2 category grid
  const categoryRows = [];
  for (let i = 0; i < cats.length; i += 2) {
    const row = cats.slice(i, i + 2).map(c => ({
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 8, width: 220, fontFamily: 'Inter' },
        children: [
          categoryIconElement(c.category, 32, c.color),
          { type: 'span', props: { style: { fontSize: 32, fontWeight: 600, color: c.color }, children: c.label } },
        ],
      },
    }));
    categoryRows.push({
      type: 'div',
      props: {
        style: { display: 'flex', justifyContent: 'center', gap: 40 },
        children: row,
      },
    });
  }

  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        backgroundColor: '#08080d', fontFamily: 'Inter', position: 'relative' as const,
      },
      children: [
        // Background glows + accent bar
        ...glowElements,
        accentBar(cats.map(c => c.color)),

        // Top spacer
        { type: 'div', props: { style: { height: 210 } } },

        // Logo
        logoElement(72),

        // Push content toward center
        { type: 'div', props: { style: { flex: 1 } } },

        // User name
        { type: 'span', props: { style: { fontSize: 44, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }, children: `${config.displayName}'s` } },
        { type: 'div', props: { style: { height: 60 } } },

        // "Top 4"
        { type: 'span', props: { style: { fontSize: 100, fontWeight: 800, color: 'white', letterSpacing: -2 }, children: 'Top 4' } },
        { type: 'div', props: { style: { height: 50 } } },

        // Category grid
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 },
            children: categoryRows,
          },
        },

        // Push URL to bottom
        { type: 'div', props: { style: { flex: 1 } } },

        // URL
        urlFooter(),
        { type: 'div', props: { style: { height: 100 } } },
      ],
    },
  };

  return renderFrame(element);
}

/**
 * Category title frame — "🎵 Artists"
 */
export async function renderCategoryTitleFrame(
  config: VideoConfig,
  cat: CategoryData
): Promise<Buffer> {
  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        backgroundColor: '#08080d', fontFamily: 'Inter', position: 'relative' as const,
      },
      children: [
        // Radial glow
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
              backgroundImage: `radial-gradient(circle at 50% 45%, ${hexToRgba(cat.color, 0.18)} 0%, transparent 70%)`,
            },
          },
        },

        // Accent bar
        accentBar(cat.color),

        // Logo (top-left, absolutely positioned)
        {
          type: 'div',
          props: {
            style: { position: 'absolute' as const, top: 60, left: 60 },
            children: logoElement(42),
          },
        },

        // Push icon toward center
        { type: 'div', props: { style: { flex: 1, minHeight: 400 } } },

        // Category icon in circle
        {
          type: 'div',
          props: {
            style: {
              width: 240, height: 240,
              borderRadius: 120,
              backgroundColor: hexToRgba(cat.color, 0.15),
              border: `3px solid ${hexToRgba(cat.color, 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
            children: categoryIconElement(cat.category, 160, cat.color),
          },
        },

        { type: 'div', props: { style: { height: 80 } } },

        // Category label
        { type: 'span', props: { style: { fontSize: 80, fontWeight: 800, color: cat.color, letterSpacing: -1 }, children: cat.label } },

        { type: 'div', props: { style: { height: 40 } } },

        // User name
        { type: 'span', props: { style: { fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }, children: config.displayName } },

        // Push URL to bottom
        { type: 'div', props: { style: { flex: 1 } } },

        // URL
        urlFooter(),
        { type: 'div', props: { style: { height: 100 } } },
      ],
    },
  };

  return renderFrame(element);
}

/**
 * Item reveal frame — "#4: Genesis"
 */
export async function renderItemFrame(
  config: VideoConfig,
  cat: CategoryData,
  itemIndex: number
): Promise<Buffer> {
  const item = cat.items[itemIndex];
  if (!item) throw new Error(`No item at index ${itemIndex}`);

  const rank = item.rank ?? (itemIndex + 1);
  const isNumber1 = rank === 1;
  const imagePath = cat.imagePaths[itemIndex];
  const isArtist = cat.category === 'artists';

  // Dynamic title font sizing (same logic as before)
  const title = item.title.length > 52 ? item.title.slice(0, 50) + '\u2026' : item.title;
  const baseFontSize = isNumber1 ? 72 : 64;
  const titleFontSize = item.title.length > 40 ? Math.floor(baseFontSize * 0.6) :
                        item.title.length > 30 ? Math.floor(baseFontSize * 0.7) :
                        item.title.length > 22 ? Math.floor(baseFontSize * 0.85) : baseFontSize;

  const subtitle = item.subtitle
    ? (item.subtitle.length > 40 ? item.subtitle.slice(0, 38) + '\u2026' : item.subtitle)
    : null;

  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        backgroundColor: '#08080d', fontFamily: 'Inter', position: 'relative' as const,
      },
      children: [
        // Radial glow for #1
        ...(isNumber1 ? [{
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
              backgroundImage: `radial-gradient(circle at 50% 50%, ${hexToRgba(cat.color, 0.2)} 0%, transparent 70%)`,
            },
          },
        }] : []),

        // Accent bar
        accentBar(cat.color),

        // Logo (top-left)
        { type: 'div', props: { style: { position: 'absolute' as const, top: 60, left: 60 }, children: logoElement(42) } },

        // Category label (top-right)
        {
          type: 'div',
          props: {
            style: { position: 'absolute' as const, top: 70, right: 60 },
            children: { type: 'span', props: { style: { fontSize: 30, fontWeight: 600, color: cat.color }, children: cat.label } },
          },
        },

        // Big rank number (absolutely positioned background watermark)
        centered(isNumber1 ? 620 : 560, {
          type: 'span',
          props: {
            style: {
              fontSize: isNumber1 ? 200 : 180,
              fontWeight: 900,
              color: isNumber1 ? cat.color : 'rgba(255,255,255,0.08)',
              letterSpacing: -5,
            },
            children: `#${rank}`,
          },
        }),

        // Spacer for image area (image composited by sharp later)
        { type: 'div', props: { style: { height: isNumber1 ? 340 : 380 } } },
        { type: 'div', props: { style: { height: (isNumber1 ? 320 : 260) + 60 } } }, // image height + gap

        // Title
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'center', width: '100%', padding: '0 60px' },
            children: {
              type: 'span',
              props: {
                style: {
                  fontSize: titleFontSize, fontWeight: 800, color: 'white',
                  letterSpacing: -1, textAlign: 'center' as const,
                },
                children: title,
              },
            },
          },
        },

        // Subtitle
        ...(subtitle ? [{
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'center', width: '100%', marginTop: 16, padding: '0 60px' },
            children: {
              type: 'span',
              props: {
                style: { fontSize: 36, fontWeight: 400, color: 'rgba(255,255,255,0.5)', textAlign: 'center' as const },
                children: subtitle,
              },
            },
          },
        }] : []),

        // Push footer to bottom
        { type: 'div', props: { style: { flex: 1 } } },

        // User name
        { type: 'span', props: { style: { fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }, children: config.displayName } },
        { type: 'div', props: { style: { height: 40 } } },

        // URL
        urlFooter(),
        { type: 'div', props: { style: { height: 100 } } },
      ],
    },
  };

  // ── Image composite (same approach as before) ──
  const composites: sharp.OverlayOptions[] = [];

  if (imagePath) {
    try {
      const imgSize = isNumber1 ? 320 : 260;
      const imgTop = isNumber1 ? 340 : 380;
      const imgLeft = Math.floor((WIDTH - imgSize) / 2);
      const borderRadius = isArtist ? imgSize / 2 : 24;

      // Pre-render mask SVG (simple shape, no text — works everywhere)
      const roundedMaskPng = await renderSvgToPng(
        `<svg width="${imgSize}" height="${imgSize}"><rect width="${imgSize}" height="${imgSize}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/></svg>`,
        imgSize, imgSize
      );

      const roundedImg = await sharp(imagePath)
        .resize(imgSize, imgSize, { fit: 'cover' })
        .composite([{ input: roundedMaskPng, blend: 'dest-in' }])
        .png()
        .toBuffer();

      const borderSize = imgSize + 8;
      const borderPng = await renderSvgToPng(
        `<svg width="${borderSize}" height="${borderSize}">
          <rect x="0" y="0" width="${borderSize}" height="${borderSize}" rx="${borderRadius + 4}" ry="${borderRadius + 4}" fill="none" stroke="${isNumber1 ? cat.color : 'rgba(255,255,255,0.15)'}" stroke-width="3"/>
        </svg>`,
        borderSize, borderSize
      );

      composites.push(
        { input: borderPng, top: imgTop - 4, left: imgLeft - 4 },
        { input: roundedImg, top: imgTop, left: imgLeft }
      );
    } catch {
      // Image failed — rank number is already visible in background
    }
  }

  return renderFrame(element, composites);
}

/**
 * Closing frame — summary of all categories + CTA
 */
export async function renderClosingFrame(config: VideoConfig): Promise<Buffer> {
  const accentColor = config.categories[0]?.color ?? '#a78bfa';

  // Build #1 pick summary rows
  const summaryRows = config.categories.map(cat => {
    const topPick = cat.items[0];
    const pickTitle = topPick
      ? (topPick.title.length > 20 ? topPick.title.slice(0, 18) + '\u2026' : topPick.title)
      : '\u2014';

    return {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Inter' },
        children: [
          categoryIconElement(cat.category, 48, cat.color),
          { type: 'span', props: { style: { fontSize: 42, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }, children: pickTitle } },
        ],
      },
    };
  });

  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        backgroundColor: '#08080d', fontFamily: 'Inter', position: 'relative' as const,
      },
      children: [
        // Radial glow
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
              backgroundImage: `radial-gradient(circle at 50% 40%, ${hexToRgba(accentColor, 0.1)} 0%, transparent 70%)`,
            },
          },
        },

        // Top spacer
        { type: 'div', props: { style: { height: 210 } } },

        // Logo
        logoElement(72),

        { type: 'div', props: { style: { height: 120 } } },

        // "David's #1 picks"
        { type: 'span', props: { style: { fontSize: 38, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }, children: `${config.displayName}'s #1 picks` } },

        { type: 'div', props: { style: { height: 60 } } },

        // Divider
        {
          type: 'div',
          props: {
            style: { width: 400, height: 2, backgroundColor: hexToRgba(accentColor, 0.3) },
          },
        },

        { type: 'div', props: { style: { height: 60 } } },

        // #1 picks list
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' as const, gap: 30, padding: '0 80px' },
            children: summaryRows,
          },
        },

        // Push CTA to bottom area
        { type: 'div', props: { style: { flex: 1 } } },

        // CTA
        { type: 'span', props: { style: { fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }, children: 'Do you agree?' } },
        { type: 'div', props: { style: { height: 60 } } },
        { type: 'span', props: { style: { fontSize: 40, fontWeight: 700, color: 'white' }, children: 'Share yours at' } },
        { type: 'div', props: { style: { height: 16 } } },
        { type: 'span', props: { style: { fontSize: 44, fontWeight: 700, color: accentColor }, children: 'www.top4.info' } },
        { type: 'div', props: { style: { height: 40 } } },

        // Tagline
        { type: 'span', props: { style: { fontSize: 26, fontWeight: 400, color: 'rgba(255,255,255,0.15)' }, children: 'Pick your top 4. See what everyone else loves.' } },
        { type: 'div', props: { style: { height: 16 } } },

        // Attribution
        { type: 'span', props: { style: { fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.1)' }, children: 'Audio previews courtesy of Apple Music' } },
        { type: 'div', props: { style: { height: 40 } } },
      ],
    },
  };

  return renderFrame(element);
}
