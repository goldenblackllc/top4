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

const WIDTH = 1080;
const HEIGHT = 1920;

// ── Helpers ──────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Frame Renderers ──────────────────────────────────────────

/**
 * Frame 1: Hook — "David's Top 4"
 */
export async function renderHookFrame(config: VideoConfig): Promise<Buffer> {
  // Pick first category color for accent, or purple default
  const accentColor = config.categories[0]?.color ?? '#a78bfa';
  const categoryList = config.categories.map(c => `${c.emoji} ${c.label}`).join('   ');

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#08080d"/>
    
    <defs><radialGradient id="glow" cx="50%" cy="38%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

    <!-- top4 branding -->
    <text x="${WIDTH / 2 - 20}" y="280" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="white" letter-spacing="-3">top</text>
    <text x="${WIDTH / 2 - 15}" y="280" text-anchor="start" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800" fill="${accentColor}" letter-spacing="-3">4</text>

    <!-- User name -->
    <text x="${WIDTH / 2}" y="700" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="600" fill="rgba(255,255,255,0.7)">${esc(config.displayName)}&apos;s</text>

    <!-- "Top 4" -->
    <text x="${WIDTH / 2}" y="840" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="100" font-weight="800" fill="white" letter-spacing="-2">Top 4</text>

    <!-- Categories preview -->
    <text x="${WIDTH / 2}" y="960" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="500" fill="rgba(255,255,255,0.5)">${esc(categoryList)}</text>

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

    <!-- Big category emoji -->
    <text x="${WIDTH / 2}" y="720" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="160">${cat.emoji}</text>

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
    <text x="${WIDTH / 2}" y="${isNumber1 ? '820' : '800'}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${isNumber1 ? '220' : '180'}" font-weight="900" fill="${isNumber1 ? cat.color : 'rgba(255,255,255,0.08)'}" letter-spacing="-5">#${rank}</text>

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
  const summaryLines = config.categories.map((cat, i) => {
    const topPick = cat.items[0];
    const y = 780 + i * 120;
    return `<text x="${WIDTH / 2}" y="${y}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="600" fill="rgba(255,255,255,0.8)">
      <tspan fill="${cat.color}" font-weight="800">${cat.emoji}</tspan>  ${topPick ? esc(topPick.title.length > 20 ? topPick.title.slice(0, 18) + '…' : topPick.title) : '—'}
    </text>`;
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
