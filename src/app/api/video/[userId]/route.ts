import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  renderHookFrame,
  renderCategoryTitleFrame,
  renderItemFrame,
  renderClosingFrame,
  type VideoConfig,
  type CategoryData,
  type Top4Item,
} from '@/lib/video/renderTop4Frames';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ── Category config ──

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  movies: { emoji: '🎬', color: '#f59e0b', label: 'Movies' },
  tv: { emoji: '📺', color: '#ec4899', label: 'TV Shows' },
  artists: { emoji: '🎵', color: '#a78bfa', label: 'Artists' },
  books: { emoji: '📚', color: '#2dd4bf', label: 'Books' },
};

// Category order for the video sequence
const CATEGORY_ORDER = ['artists', 'movies', 'tv', 'books'];

// Frame durations in seconds
const HOOK_DURATION = 2.5;
const CATEGORY_TITLE_DURATION = 1.5;
const ITEM_DURATION = 2;
const NUMBER_1_DURATION = 2.5;
const CLOSING_DURATION = 3;

/**
 * GET /api/video/[userId]
 *
 * Generates an MP4 video showing all of a user's Top 4 lists
 * in a dramatic countdown reveal format (9:16 vertical, TikTok/Reels ready).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // ── Fetch user profile ──
    const profileSnap = await db.collection('profiles').doc(userId).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    const displayName = profile?.display_name || 'Someone';

    // ── Fetch all entries for this user ──
    const entriesSnap = await db
      .collection('top4_entries')
      .where('user_id', '==', userId)
      .get();

    if (entriesSnap.empty) {
      return NextResponse.json({ error: 'No entries found' }, { status: 404 });
    }

    // Parse entries into categories, ordered consistently
    const categoriesMap = new Map<string, { items: Top4Item[]; imageUrls: string[] }>();
    for (const doc of entriesSnap.docs) {
      const data = doc.data();
      const items = (data.items as Top4Item[]) || [];
      const filledItems = items.filter(i => i.title);
      if (filledItems.length === 0) continue;

      categoriesMap.set(data.category, {
        items: filledItems.slice(0, 4),
        imageUrls: filledItems.slice(0, 4).map(i => i.image_url || ''),
      });
    }

    // Order categories consistently
    const orderedCategories: string[] = CATEGORY_ORDER.filter(c => categoriesMap.has(c));
    if (orderedCategories.length === 0) {
      return NextResponse.json({ error: 'No filled entries found' }, { status: 404 });
    }

    // ── Set up work directory ──
    const workDir = join(tmpdir(), `top4-video-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });

    // ── Download all item images in parallel ──
    console.log('[Video] Downloading images...');
    const categoryDataList: CategoryData[] = [];

    for (const catKey of orderedCategories) {
      const catConfig = CATEGORY_CONFIG[catKey] || { emoji: '📋', color: '#a1a1aa', label: catKey };
      const { items, imageUrls } = categoriesMap.get(catKey)!;

      const imagePaths: (string | null)[] = await Promise.all(
        imageUrls.map(async (url, idx) => {
          if (!url) return null;
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const buf = Buffer.from(await res.arrayBuffer());
            const imgPath = join(workDir, `${catKey}_${idx}.jpg`);
            await fs.writeFile(imgPath, buf);
            return imgPath;
          } catch {
            return null;
          }
        })
      );

      categoryDataList.push({
        category: catKey,
        label: catConfig.label,
        emoji: catConfig.emoji,
        color: catConfig.color,
        items,
        imagePaths,
      });
    }

    const videoConfig: VideoConfig = {
      displayName,
      categories: categoryDataList,
    };

    // ── Set up fontconfig for Vercel/Lambda (no system fontconfig) ──
    // Without this, sharp/librsvg can't find fonts and SVG text fails
    const fontconfigPath = join(workDir, 'fonts.conf');
    await fs.writeFile(fontconfigPath, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/usr/share/fonts</dir>
  <dir>/usr/local/share/fonts</dir>
  <dir>${workDir}</dir>
  <cachedir>${workDir}/fc-cache</cachedir>
</fontconfig>`, 'utf-8');
    await fs.mkdir(join(workDir, 'fc-cache'), { recursive: true });
    process.env.FONTCONFIG_FILE = fontconfigPath;

    // ── Render all frames ──
    console.log(`[Video] Rendering frames for ${categoryDataList.length} categories...`);
    const framePaths: string[] = [];
    const frameDurations: number[] = [];
    let frameIdx = 0;

    // 1. Hook frame
    const hookPath = join(workDir, `frame_${frameIdx++}.png`);
    await fs.writeFile(hookPath, await renderHookFrame(videoConfig));
    framePaths.push(hookPath);
    frameDurations.push(HOOK_DURATION);

    // 2. Per-category: title + items (reverse order for countdown: #4, #3, #2, #1)
    for (const cat of categoryDataList) {
      // Category title frame
      const titlePath = join(workDir, `frame_${frameIdx++}.png`);
      await fs.writeFile(titlePath, await renderCategoryTitleFrame(videoConfig, cat));
      framePaths.push(titlePath);
      frameDurations.push(CATEGORY_TITLE_DURATION);

      // Items in reverse: #4, #3, #2, #1
      const itemCount = cat.items.length;
      for (let i = itemCount - 1; i >= 0; i--) {
        const itemPath = join(workDir, `frame_${frameIdx++}.png`);
        await fs.writeFile(itemPath, await renderItemFrame(videoConfig, cat, i));
        framePaths.push(itemPath);
        frameDurations.push(i === 0 ? NUMBER_1_DURATION : ITEM_DURATION);
      }
    }

    // 3. Closing frame
    const closingPath = join(workDir, `frame_${frameIdx++}.png`);
    await fs.writeFile(closingPath, await renderClosingFrame(videoConfig));
    framePaths.push(closingPath);
    frameDurations.push(CLOSING_DURATION);

    console.log(`[Video] Rendered ${framePaths.length} frames`);

    // ── Resolve ffmpeg ──
    const { existsSync } = require('fs');
    const { spawnSync, execSync: execSyncCheck } = require('child_process');
    const pathMod = require('path');

    let ffmpegPath = pathMod.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    if (!existsSync(ffmpegPath)) {
      try {
        ffmpegPath = execSyncCheck('which ffmpeg', { encoding: 'utf8' }).trim();
      } catch {
        throw new Error(`ffmpeg not found at ${ffmpegPath} or in system PATH`);
      }
    }
    console.log('[Video] ffmpeg:', ffmpegPath);

    // ── Build ffmpeg command ──
    // Each frame is a looping image input with its own duration,
    // concatenated via the concat filter.
    const outputPath = join(workDir, 'output.mp4');

    const inputs: string[] = ['-y'];
    for (let i = 0; i < framePaths.length; i++) {
      inputs.push(
        '-loop', '1',
        '-framerate', '2',
        '-t', frameDurations[i].toFixed(3),
        '-i', framePaths[i],
      );
    }

    const concatInputs = framePaths.map((_, i) => `[${i}:v]`).join('');
    const filterComplex = `${concatInputs}concat=n=${framePaths.length}:v=1:a=0[vout]`;

    const ffmpegArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-r', '15',
      '-t', frameDurations.reduce((a, b) => a + b, 0).toFixed(2),
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ];

    console.log('[Video] Running ffmpeg...');
    const ffmpegResult = spawnSync(ffmpegPath, ffmpegArgs, {
      timeout: 55000,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (ffmpegResult.status !== 0) {
      const stderr = (ffmpegResult.stderr || '').toString();
      console.error('[Video] ffmpeg stderr:', stderr.slice(-500));
      throw new Error(`ffmpeg exited with code ${ffmpegResult.status}`);
    }
    console.log('[Video] ffmpeg completed');

    // ── Read output + cleanup ──
    const videoBuffer = await fs.readFile(outputPath);
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});

    const totalDuration = frameDurations.reduce((a, b) => a + b, 0);
    console.log(`[Video] Done: ${videoBuffer.length} bytes, ${totalDuration.toFixed(1)}s`);

    return new NextResponse(new Uint8Array(videoBuffer), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="top4-${displayName.replace(/\s+/g, '-').toLowerCase()}.mp4"`,
        'Content-Length': String(videoBuffer.length),
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Video] Generation failed:', message);
    return NextResponse.json(
      { error: 'Video generation failed', detail: message },
      { status: 500 }
    );
  }
}
