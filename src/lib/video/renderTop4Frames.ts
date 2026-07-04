import sharp from 'sharp';

// ── Types ────────────────────────────────────────────────────

export interface Top4Item {
  rank: number;
  title: string;
  subtitle?: string;
  image_url?: string;
}

export interface CategoryData {
  category: string;
  label: string;
  emoji: string;
  color: string;
  items: Top4Item[];
  imagePaths: (string | null)[];  // local paths to downloaded item images
}

export interface VideoConfig {
  displayName: string;
  avatarPath?: string;
  categories: CategoryData[];
}

// 720×1280 keeps 9:16 ratio, stays HD, and fits in Vercel's memory limits
const WIDTH = 720;
const HEIGHT = 1280;

// ── Helpers ──────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
// ── SVG Icons (sharp can't render color emoji, so we use vector icons) ──

/** Returns an SVG group with a category icon centered at (cx, cy) with given size and color */
function categoryIcon(category: string, cx: number, cy: number, size: number, color: string): string {
  const s = size;
  const hs = s / 2;
  // All icons drawn relative to center point (cx, cy)
  switch (category) {
    case 'artists':
      // Music note icon
      return `<g transform="translate(${cx - hs}, ${cy - hs})">
        <circle cx="${s * 0.28}" cy="${s * 0.78}" r="${s * 0.15}" fill="${color}"/>
        <circle cx="${s * 0.72}" cy="${s * 0.65}" r="${s * 0.15}" fill="${color}"/>
        <rect x="${s * 0.40}" y="${s * 0.12}" width="${s * 0.04}" height="${s * 0.66}" fill="${color}"/>
        <rect x="${s * 0.84}" y="${s * 0.05}" width="${s * 0.04}" height="${s * 0.60}" fill="${color}"/>
        <rect x="${s * 0.40}" y="${s * 0.08}" width="${s * 0.48}" height="${s * 0.08}" rx="${s * 0.03}" fill="${color}"/>
      </g>`;
    case 'movies':
      // Film clapperboard icon
      return `<g transform="translate(${cx - hs}, ${cy - hs})">
        <rect x="${s * 0.1}" y="${s * 0.35}" width="${s * 0.8}" height="${s * 0.55}" rx="${s * 0.06}" fill="${color}" fill-opacity="0.9"/>
        <rect x="${s * 0.1}" y="${s * 0.18}" width="${s * 0.8}" height="${s * 0.22}" rx="${s * 0.04}" fill="${color}"/>
        <line x1="${s * 0.28}" y1="${s * 0.18}" x2="${s * 0.38}" y2="${s * 0.40}" stroke="#08080d" stroke-width="${s * 0.035}"/>
        <line x1="${s * 0.48}" y1="${s * 0.18}" x2="${s * 0.58}" y2="${s * 0.40}" stroke="#08080d" stroke-width="${s * 0.035}"/>
        <line x1="${s * 0.68}" y1="${s * 0.18}" x2="${s * 0.78}" y2="${s * 0.40}" stroke="#08080d" stroke-width="${s * 0.035}"/>
      </g>`;
    case 'tv':
      // TV screen icon
      return `<g transform="translate(${cx - hs}, ${cy - hs})">
        <rect x="${s * 0.1}" y="${s * 0.15}" width="${s * 0.8}" height="${s * 0.58}" rx="${s * 0.08}" fill="${color}"/>
        <rect x="${s * 0.18}" y="${s * 0.23}" width="${s * 0.64}" height="${s * 0.42}" rx="${s * 0.03}" fill="#08080d" fill-opacity="0.5"/>
        <rect x="${s * 0.35}" y="${s * 0.78}" width="${s * 0.3}" height="${s * 0.06}" rx="${s * 0.02}" fill="${color}"/>
        <rect x="${s * 0.25}" y="${s * 0.84}" width="${s * 0.5}" height="${s * 0.05}" rx="${s * 0.02}" fill="${color}" fill-opacity="0.6"/>
      </g>`;
    case 'books':
      // Open book icon
      return `<g transform="translate(${cx - hs}, ${cy - hs})">
        <path d="M${s * 0.5} ${s * 0.22} Q${s * 0.3} ${s * 0.18} ${s * 0.1} ${s * 0.25} L${s * 0.1} ${s * 0.78} Q${s * 0.3} ${s * 0.72} ${s * 0.5} ${s * 0.75} Z" fill="${color}" fill-opacity="0.85"/>
        <path d="M${s * 0.5} ${s * 0.22} Q${s * 0.7} ${s * 0.18} ${s * 0.9} ${s * 0.25} L${s * 0.9} ${s * 0.78} Q${s * 0.7} ${s * 0.72} ${s * 0.5} ${s * 0.75} Z" fill="${color}"/>
        <line x1="${s * 0.5}" y1="${s * 0.22}" x2="${s * 0.5}" y2="${s * 0.75}" stroke="#08080d" stroke-width="${s * 0.02}" stroke-opacity="0.3"/>
      </g>`;
    default:
      // Fallback: colored circle with "?"
      return `<circle cx="${cx}" cy="${cy}" r="${hs * 0.8}" fill="${color}" fill-opacity="0.3"/>
        <text x="${cx}" y="${cy + hs * 0.3}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${s * 0.5}" font-weight="800" fill="${color}">?</text>`;
  }
}

// ── Frame Renderers ──────────────────────────────────────────

/**
 * Frame 1: Hook — "David's Top 4"
 */
export async function renderHookFrame(config: VideoConfig): Promise<Buffer> {
  const accentColor = config.categories[0]?.color ?? '#a78bfa';

  // Render categories in a 2x2 grid for even spacing
  const positions = [
    { x: WIDTH / 2 - 180, y: 940 },  // top-left
    { x: WIDTH / 2 + 180, y: 940 },  // top-right
    { x: WIDTH / 2 - 180, y: 1020 }, // bottom-left
    { x: WIDTH / 2 + 180, y: 1020 }, // bottom-right
  ];
  const categoryElements = config.categories.map((c, i) => {
    const pos = positions[i] || positions[0];
    // Icon centered at pos, label to the right
    return `${categoryIcon(c.category, pos.x - 50, pos.y - 12, 32, c.color)}
    <text x="${pos.x - 24}" y="${pos.y}" text-anchor="start" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600" fill="${c.color}">${esc(c.label)}</text>`;
  }).join('\n    ');

  // Multiple colored glows
  const numCats = config.categories.length;
  const glowDefs = config.categories.map((c, i) => {
    const cx = 25 + (i * 50 / Math.max(numCats - 1, 1));
    return `<radialGradient id="glow${i}" cx="${cx}%" cy="42%" r="35%">
      <stop offset="0%" stop-color="${c.color}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>`;
  }).join('\n      ');

  const glowRects = config.categories.map((_, i) =>
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow${i})"/>`
  ).join('\n    ');

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#08080d"/>
    
    <defs>
      ${glowDefs}
    </defs>
    ${glowRects}

    <!-- Accent bar with multi-color gradient -->
    <defs><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      ${config.categories.map((c, i) => `<stop offset="${(i / Math.max(numCats - 1, 1) * 100).toFixed(0)}%" stop-color="${c.color}" stop-opacity="0.8"/>`).join('\n      ')}
    </linearGradient></defs>
    <rect y="0" width="${WIDTH}" height="6" fill="url(#bar)"/>

    <!-- top4 branding -->
    <text x="${WIDTH / 2 - 20}" y="280" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="white" letter-spacing="-3">top</text>
    <text x="${WIDTH / 2 - 15}" y="280" text-anchor="start" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="${accentColor}" letter-spacing="-3">4</text>

    <!-- User name -->
    <text x="${WIDTH / 2}" y="700" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="600" fill="rgba(255,255,255,0.7)">${esc(config.displayName)}&apos;s</text>

    <!-- "Top 4" -->
    <text x="${WIDTH / 2}" y="840" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="100" font-weight="800" fill="white" letter-spacing="-2">Top 4</text>

    <!-- Categories with individual colors -->
    ${categoryElements}

    <!-- URL -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 120}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.2)">www.top4.info</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Category title frame — "🎵 Artists"
 */
export async function renderCategoryTitleFrame(
  config: VideoConfig,
  cat: CategoryData
): Promise<Buffer> {

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#08080d"/>

    <defs><radialGradient id="glow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="${cat.color}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${cat.color}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

    <!-- Accent bar -->
    <defs><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${cat.color}" stop-opacity="1"/>
      <stop offset="70%" stop-color="${cat.color}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${cat.color}" stop-opacity="0"/>
    </linearGradient></defs>
    <rect y="0" width="${WIDTH}" height="6" fill="url(#bar)"/>

    <!-- top4 (small, top left) -->
    <text x="60" y="100" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="800" fill="white" letter-spacing="-2">top</text>
    <text x="164" y="100" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="800" fill="${cat.color}" letter-spacing="-2">4</text>

    <!-- Category icon: colored SVG icon in circle -->
    <circle cx="${WIDTH / 2}" cy="660" r="120" fill="${cat.color}" fill-opacity="0.15"/>
    <circle cx="${WIDTH / 2}" cy="660" r="120" fill="none" stroke="${cat.color}" stroke-opacity="0.4" stroke-width="3"/>
    ${categoryIcon(cat.category, WIDTH / 2, 660, 160, cat.color)}

    <!-- Category label -->
    <text x="${WIDTH / 2}" y="920" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="80" font-weight="800" fill="${cat.color}" letter-spacing="-1">${esc(cat.label)}</text>

    <!-- User name -->
    <text x="${WIDTH / 2}" y="1020" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="500" fill="rgba(255,255,255,0.4)">${esc(config.displayName)}</text>

    <!-- URL -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 120}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.2)">www.top4.info</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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

  const bgSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#08080d"/>
    
    ${isNumber1 ? `<defs><radialGradient id="glow1" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="${cat.color}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${cat.color}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow1)"/>` : ''}

    <!-- Accent bar -->
    <defs><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${cat.color}" stop-opacity="1"/>
      <stop offset="70%" stop-color="${cat.color}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${cat.color}" stop-opacity="0"/>
    </linearGradient></defs>
    <rect y="0" width="${WIDTH}" height="6" fill="url(#bar)"/>

    <!-- top4 (top left) -->
    <text x="60" y="100" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="800" fill="white" letter-spacing="-2">top</text>
    <text x="164" y="100" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="800" fill="${cat.color}" letter-spacing="-2">4</text>

    <!-- Category (top right) -->
    <text x="${WIDTH - 60}" y="100" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600" fill="${cat.color}">${cat.emoji} ${esc(cat.label)}</text>

    <!-- Big rank number -->
    <text x="${WIDTH / 2}" y="${isNumber1 ? '880' : '800'}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${isNumber1 ? '200' : '180'}" font-weight="900" fill="${isNumber1 ? cat.color : 'rgba(255,255,255,0.08)'}" letter-spacing="-5">#${rank}</text>

    <!-- Title -->
    <text x="${WIDTH / 2}" y="${isNumber1 ? '1050' : '1020'}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${isNumber1 ? '72' : '64'}" font-weight="800" fill="white" letter-spacing="-1">${esc(item.title.length > 18 ? item.title.slice(0, 16) + '…' : item.title)}</text>

    ${item.subtitle ? `<text x="${WIDTH / 2}" y="${isNumber1 ? '1130' : '1090'}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="400" fill="rgba(255,255,255,0.5)">${esc(item.subtitle.length > 30 ? item.subtitle.slice(0, 28) + '…' : item.subtitle)}</text>` : ''}

    <!-- User name -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 180}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="500" fill="rgba(255,255,255,0.4)">${esc(config.displayName)}</text>

    <!-- URL -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 120}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.2)">www.top4.info</text>
  </svg>`;

  const composites: sharp.OverlayOptions[] = [];

  // Add item image if available
  if (imagePath) {
    try {
      const imgSize = isNumber1 ? 320 : 260;
      const imgTop = isNumber1 ? 340 : 380;
      const imgLeft = Math.floor((WIDTH - imgSize) / 2);
      const borderRadius = isArtist ? imgSize / 2 : 24;

      const roundedMask = Buffer.from(
        `<svg width="${imgSize}" height="${imgSize}"><rect width="${imgSize}" height="${imgSize}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/></svg>`
      );

      const roundedImg = await sharp(imagePath)
        .resize(imgSize, imgSize, { fit: 'cover' })
        .composite([{ input: roundedMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

      const borderSize = imgSize + 8;
      const borderSvg = Buffer.from(
        `<svg width="${borderSize}" height="${borderSize}">
          <rect x="0" y="0" width="${borderSize}" height="${borderSize}" rx="${borderRadius + 4}" ry="${borderRadius + 4}" fill="none" stroke="${isNumber1 ? cat.color : 'rgba(255,255,255,0.15)'}" stroke-width="3"/>
        </svg>`
      );

      composites.push(
        { input: borderSvg, top: imgTop - 4, left: imgLeft - 4 },
        { input: roundedImg, top: imgTop, left: imgLeft }
      );
    } catch {
      // Image failed — rank number is already visible in background
    }
  }

  return sharp(Buffer.from(bgSvg))
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Closing frame — summary of all categories + CTA
 */
export async function renderClosingFrame(config: VideoConfig): Promise<Buffer> {
  const accentColor = config.categories[0]?.color ?? '#a78bfa';

  // Build summary: show #1 pick from each category
  // Use colored dot + label text (sharp can't render color emoji)
  const rowX = 280; // fixed left edge for alignment
  const summaryLines = config.categories.map((cat, i) => {
    const topPick = cat.items[0];
    const y = 780 + i * 120;
    const title = topPick ? esc(topPick.title.length > 20 ? topPick.title.slice(0, 18) + '\u2026' : topPick.title) : '\u2014';
    // Colored SVG icon + title
    return `${categoryIcon(cat.category, rowX, y - 14, 48, cat.color)}
    <text x="${rowX + 42}" y="${y}" text-anchor="start" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="600" fill="rgba(255,255,255,0.8)">${title}</text>`;
  }).join('\n');

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#08080d"/>

    <defs><radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

    <!-- top4 branding -->
    <text x="${WIDTH / 2 - 20}" y="280" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="white" letter-spacing="-3">top</text>
    <text x="${WIDTH / 2 - 15}" y="280" text-anchor="start" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="${accentColor}" letter-spacing="-3">4</text>

    <!-- User name -->
    <text x="${WIDTH / 2}" y="460" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="600" fill="rgba(255,255,255,0.6)">${esc(config.displayName)}&apos;s #1 picks</text>

    <!-- Divider -->
    <line x1="340" y1="540" x2="${WIDTH - 340}" y2="540" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="2"/>

    <!-- #1 picks per category -->
    ${summaryLines}

    <!-- CTA -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 340}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="600" fill="rgba(255,255,255,0.7)">Do you agree?</text>

    <text x="${WIDTH / 2}" y="${HEIGHT - 240}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700" fill="white">Share yours at</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 180}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="700" fill="${accentColor}">www.top4.info</text>

    <!-- URL -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 100}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="400" fill="rgba(255,255,255,0.15)">Pick your top 4. See what everyone else loves.</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
