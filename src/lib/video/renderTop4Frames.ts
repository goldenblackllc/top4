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

// ── Layout Constants ─────────────────────────────────────────
// These are tuned for 1080×1920 design space viewed on small mobile screens.
// The logo is pushed below the status bar area.

const LOGO_TOP = 120;        // Below mobile status bar
const LOGO_SIZE = 60;        // Logo font size
const FOOTER_BOTTOM = 80;    // Bottom padding for footer
const FOOTER_NAME_SIZE = 48; // User name in footer
const FOOTER_URL_SIZE = 48;  // URL in footer

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
        width: '100%', height: 8,
        backgroundImage: gradient,
      },
    },
  };
}

/** "top4" logo — "top" in white + "4" with gradient fill */
function logoElement(size: number = LOGO_SIZE) {
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
      style: { fontSize: FOOTER_URL_SIZE, fontWeight: 500, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter' },
      children: 'www.top4.info',
    },
  };
}

/** Standard footer block: user name + URL */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function footerBlock(displayName: string): any[] {
  return [
    { type: 'span', props: { style: { fontSize: FOOTER_NAME_SIZE, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }, children: displayName } },
    { type: 'div', props: { style: { display: 'flex', height: 16 } } },
    urlFooter(),
    { type: 'div', props: { style: { display: 'flex', height: FOOTER_BOTTOM } } },
  ];
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
 * Content is vertically centered with logo above.
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
          backgroundImage: `radial-gradient(circle at ${cx}% 42%, ${hexToRgba(c.color, 0.18)} 0%, transparent 55%)`,
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
        style: { display: 'flex', alignItems: 'center', gap: 14, width: 300, fontFamily: 'Inter' },
        children: [
          categoryIconElement(c.category, 48, c.color),
          { type: 'span', props: { style: { fontSize: 48, fontWeight: 600, color: c.color }, children: c.label } },
        ],
      },
    }));
    categoryRows.push({
      type: 'div',
      props: {
        style: { display: 'flex', justifyContent: 'center', gap: 60 },
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

        // Push content to vertical center
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Logo
        logoElement(96),
        { type: 'div', props: { style: { display: 'flex', height: 80 } } },

        // User name
        { type: 'span', props: { style: { fontSize: 60, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }, children: `${config.displayName}'s` } },
        { type: 'div', props: { style: { display: 'flex', height: 30 } } },

        // "Top 4"
        { type: 'span', props: { style: { fontSize: 150, fontWeight: 900, color: 'white', letterSpacing: -4 }, children: 'Top 4' } },
        { type: 'div', props: { style: { display: 'flex', height: 50 } } },

        // Category grid
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 24 },
            children: categoryRows,
          },
        },

        // Push footer down
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Footer
        ...footerBlock(config.displayName),
      ],
    },
  };

  return renderFrame(element);
}

/**
 * Category title frame — "🎵 Artists"
 * Content block (icon + label + name) is vertically centered.
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
              backgroundImage: `radial-gradient(circle at 50% 42%, ${hexToRgba(cat.color, 0.25)} 0%, transparent 55%)`,
            },
          },
        },

        // Accent bar
        accentBar(cat.color),

        // Logo (top-left, below status bar)
        {
          type: 'div',
          props: {
            style: { display: 'flex', position: 'absolute' as const, top: LOGO_TOP, left: 60 },
            children: logoElement(LOGO_SIZE),
          },
        },

        // Push content to vertical center
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Category icon in circle
        {
          type: 'div',
          props: {
            style: {
              width: 320, height: 320,
              borderRadius: 160,
              backgroundColor: hexToRgba(cat.color, 0.15),
              border: `4px solid ${hexToRgba(cat.color, 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
            children: categoryIconElement(cat.category, 210, cat.color),
          },
        },

        { type: 'div', props: { style: { display: 'flex', height: 50 } } },

        // Category label
        { type: 'span', props: { style: { fontSize: 110, fontWeight: 800, color: cat.color, letterSpacing: -1 }, children: cat.label } },

        { type: 'div', props: { style: { display: 'flex', height: 24 } } },

        // User name
        { type: 'span', props: { style: { fontSize: FOOTER_NAME_SIZE, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }, children: config.displayName } },

        // Push footer down (equal weight to top flex)
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Footer
        urlFooter(),
        { type: 'div', props: { style: { display: 'flex', height: FOOTER_BOTTOM } } },
      ],
    },
  };

  return renderFrame(element);
}

/**
 * Item reveal frame — "#4: Genesis"
 *
 * Layout (top to bottom, all in flex column):
 *   [absolute: Logo top-left | Category top-right]
 *   Spacer (clears the logo/status bar area)        = HEADER_AREA px
 *   Rank number "#2"                                ≈ RANK_HEIGHT px
 *   Gap                                             = RANK_GAP px
 *   Image placeholder spacer                        = imgSize px   ← sharp composites here
 *   Gap                                             = TITLE_GAP px
 *   Title (wraps naturally, no truncation)
 *   Subtitle
 *   Flex spacer
 *   Footer (name + URL)
 *
 * IMPORTANT: imgTop for the sharp composite MUST equal HEADER_AREA + RANK_HEIGHT + RANK_GAP
 * so the composited image aligns with the spacer div and doesn't overlap the title.
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

  // ── Layout measurements ──
  // These must stay in sync between the Satori spacers and the sharp composite position.
  const HEADER_AREA = 260;   // Space for logo + status bar (matches LOGO_TOP + logo height + gap)
  const RANK_FONT = isNumber1 ? 150 : 130;
  const RANK_HEIGHT = Math.ceil(RANK_FONT * 1.3); // Approximate rendered height
  const RANK_GAP = 20;
  const imgSize = isNumber1 ? 420 : 380;
  const TITLE_GAP = 40;

  // imgTop = where the image spacer starts in the flex flow
  const imgTop = HEADER_AREA + RANK_HEIGHT + RANK_GAP;
  const imgLeft = Math.floor((WIDTH - imgSize) / 2);
  const borderRadius = isArtist ? imgSize / 2 : 28;

  // ── Title handling ──
  // No truncation! Let Satori wrap naturally. Scale font for very long titles.
  const title = item.title;
  const baseFontSize = isNumber1 ? 80 : 72;
  const titleFontSize = title.length > 50 ? Math.floor(baseFontSize * 0.6) :
                        title.length > 40 ? Math.floor(baseFontSize * 0.65) :
                        title.length > 30 ? Math.floor(baseFontSize * 0.75) :
                        title.length > 22 ? Math.floor(baseFontSize * 0.85) : baseFontSize;

  const subtitle = item.subtitle || null;

  // Rank number color — high contrast, always visible
  const rankColor = isNumber1 ? cat.color : hexToRgba(cat.color, 0.6);

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
              backgroundImage: `radial-gradient(circle at 50% 42%, ${hexToRgba(cat.color, isNumber1 ? 0.25 : 0.15)} 0%, transparent 55%)`,
            },
          },
        },

        // Accent bar
        accentBar(cat.color),

        // Logo (top-left, below status bar)
        {
          type: 'div',
          props: {
            style: { display: 'flex', position: 'absolute' as const, top: LOGO_TOP, left: 60 },
            children: logoElement(LOGO_SIZE),
          },
        },

        // Category label (top-right, bigger)
        {
          type: 'div',
          props: {
            style: { display: 'flex', position: 'absolute' as const, top: LOGO_TOP + 6, right: 60 },
            children: { type: 'span', props: { style: { fontSize: 52, fontWeight: 700, color: cat.color }, children: cat.label } },
          },
        },

        // ── Flex flow starts here ──

        // Header area spacer (clears logo + status bar)
        { type: 'div', props: { style: { display: 'flex', height: HEADER_AREA } } },

        // Rank number — large, visible, ABOVE the image
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              width: '100%', height: RANK_HEIGHT,
            },
            children: {
              type: 'span',
              props: {
                style: {
                  fontSize: RANK_FONT,
                  fontWeight: 900,
                  color: rankColor,
                  letterSpacing: -4,
                },
                children: `#${rank}`,
              },
            },
          },
        },

        // Gap before image
        { type: 'div', props: { style: { display: 'flex', height: RANK_GAP } } },

        // Image placeholder spacer (sharp composites the actual image here)
        { type: 'div', props: { style: { display: 'flex', height: imgSize } } },

        // Gap before title
        { type: 'div', props: { style: { display: 'flex', height: TITLE_GAP } } },

        // Title — full text, wraps naturally
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'center', width: '100%', padding: '0 80px' },
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
            style: { display: 'flex', justifyContent: 'center', width: '100%', marginTop: 16, padding: '0 80px' },
            children: {
              type: 'span',
              props: {
                style: { fontSize: 46, fontWeight: 400, color: 'rgba(255,255,255,0.55)', textAlign: 'center' as const },
                children: subtitle,
              },
            },
          },
        }] : []),

        // Push footer to bottom
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Footer
        ...footerBlock(config.displayName),
      ],
    },
  };

  // ── Image composite ──
  const composites: sharp.OverlayOptions[] = [];

  if (imagePath) {
    try {
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
          <rect x="0" y="0" width="${borderSize}" height="${borderSize}" rx="${borderRadius + 4}" ry="${borderRadius + 4}" fill="none" stroke="${isNumber1 ? cat.color : 'rgba(255,255,255,0.25)'}" stroke-width="4"/>
        </svg>`,
        borderSize, borderSize
      );

      composites.push(
        { input: borderPng, top: imgTop - 4, left: imgLeft - 4 },
        { input: roundedImg, top: imgTop, left: imgLeft }
      );
    } catch {
      // Image failed — rank number is visible above
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
      ? (topPick.title.length > 28 ? topPick.title.slice(0, 26) + '\u2026' : topPick.title)
      : '\u2014';

    return {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 24, fontFamily: 'Inter' },
        children: [
          categoryIconElement(cat.category, 60, cat.color),
          { type: 'span', props: { style: { fontSize: 52, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }, children: pickTitle } },
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
              backgroundImage: `radial-gradient(circle at 50% 40%, ${hexToRgba(accentColor, 0.18)} 0%, transparent 55%)`,
            },
          },
        },

        // Push content to center
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // Logo
        logoElement(96),

        { type: 'div', props: { style: { display: 'flex', height: 60 } } },

        // "David's #1 picks"
        { type: 'span', props: { style: { fontSize: 52, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }, children: `${config.displayName}'s #1 picks` } },

        { type: 'div', props: { style: { display: 'flex', height: 40 } } },

        // Divider
        {
          type: 'div',
          props: {
            style: { display: 'flex', width: 500, height: 3, backgroundColor: hexToRgba(accentColor, 0.35) },
          },
        },

        { type: 'div', props: { style: { display: 'flex', height: 40 } } },

        // #1 picks list
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' as const, gap: 36, padding: '0 80px' },
            children: summaryRows,
          },
        },

        // Push CTA to bottom area
        { type: 'div', props: { style: { display: 'flex', flex: 1 } } },

        // CTA
        { type: 'span', props: { style: { fontSize: 48, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }, children: 'Do you agree?' } },
        { type: 'div', props: { style: { display: 'flex', height: 30 } } },
        { type: 'span', props: { style: { fontSize: 52, fontWeight: 700, color: 'white' }, children: 'Share yours at' } },
        { type: 'div', props: { style: { display: 'flex', height: 10 } } },
        { type: 'span', props: { style: { fontSize: 58, fontWeight: 700, color: accentColor }, children: 'www.top4.info' } },
        { type: 'div', props: { style: { display: 'flex', height: 30 } } },

        // Tagline
        { type: 'span', props: { style: { fontSize: 34, fontWeight: 400, color: 'rgba(255,255,255,0.2)' }, children: 'Pick your top 4. See what everyone else loves.' } },
        { type: 'div', props: { style: { display: 'flex', height: 10 } } },

        // Attribution
        { type: 'span', props: { style: { fontSize: 24, fontWeight: 400, color: 'rgba(255,255,255,0.12)' }, children: 'Audio previews courtesy of Apple Music' } },
        { type: 'div', props: { style: { display: 'flex', height: 40 } } },
      ],
    },
  };

  return renderFrame(element);
}
