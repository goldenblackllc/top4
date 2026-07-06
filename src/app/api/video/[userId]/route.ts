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
import { resolvePreviewUrl } from '@/lib/audio/resolveAudioPreview';

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
const CATEGORY_TITLE_DURATION = 2;
const ITEM_DURATION = 5;
const NUMBER_1_DURATION = 6;
const CLOSING_DURATION = 3;

// Audio fade duration for smooth transitions between clips
const AUDIO_FADE_DURATION = 0.3;
const AUDIO_SKIP = 5; // skip first 5s of preview (intros/silence)

/**
 * GET /api/video/[userId]
 *
 * Generates an MP4 video with audio showing all of a user's Top 4 lists
 * in a dramatic countdown reveal format (9:16 vertical, TikTok/Reels ready).
 * Audio clips are sourced from iTunes preview URLs cached on each item.
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
    const categoriesMap = new Map<string, { items: Top4Item[]; imageUrls: string[]; previewUrls: string[] }>();
    for (const doc of entriesSnap.docs) {
      const data = doc.data();
      const items = (data.items as Top4Item[]) || [];
      const filledItems = items.filter(i => i.title);
      if (filledItems.length === 0) continue;

      const sliced = filledItems.slice(0, 4);

      // Always resolve through resolvePreviewUrl (uses audio_cache internally)
      // Don't trust item.preview_url — may have been cached with wrong search results
      const previewUrls = await Promise.all(
        sliced.map(async (item) => {
          try {
            const url = await resolvePreviewUrl(item.title, data.category, item.subtitle);
            return url || '';
          } catch {
            return '';
          }
        })
      );

      categoriesMap.set(data.category, {
        items: sliced,
        imageUrls: sliced.map(i => i.image_url || ''),
        previewUrls,
      });

      const resolvedCount = previewUrls.filter(u => u).length;
      console.log(`[Video] ${data.category}: ${resolvedCount}/${sliced.length} audio previews resolved`);
      if (resolvedCount > 0) {
        console.log(`[Video]   URLs: ${previewUrls.filter(u => u).map(u => u.slice(0, 60) + '...').join(', ')}`);
      }
    }

    // Order categories consistently
    const orderedCategories: string[] = CATEGORY_ORDER.filter(c => categoriesMap.has(c));
    if (orderedCategories.length === 0) {
      return NextResponse.json({ error: 'No filled entries found' }, { status: 404 });
    }

    // ── Set up work directory ──
    const workDir = join(tmpdir(), `top4-video-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });

    // ── Download all item images and audio clips in parallel ──
    console.log('[Video] Downloading images and audio...');
    const categoryDataList: CategoryData[] = [];

    for (const catKey of orderedCategories) {
      const catConfig = CATEGORY_CONFIG[catKey] || { emoji: '📋', color: '#a1a1aa', label: catKey };
      const { items, imageUrls, previewUrls } = categoriesMap.get(catKey)!;

      // Download images and audio in parallel
      const [imagePaths, audioPaths] = await Promise.all([
        // Images (existing logic)
        Promise.all(
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
        ),
        // Audio clips (new)
        Promise.all(
          previewUrls.map(async (url, idx) => {
            if (!url) return null;
            try {
              const res = await fetch(url);
              if (!res.ok) return null;
              const buf = Buffer.from(await res.arrayBuffer());
              const audioPath = join(workDir, `${catKey}_audio_${idx}.m4a`);
              await fs.writeFile(audioPath, buf);
              return audioPath;
            } catch {
              return null;
            }
          })
        ),
      ]);

      categoryDataList.push({
        category: catKey,
        label: catConfig.label,
        emoji: catConfig.emoji,
        color: catConfig.color,
        items,
        imagePaths,
        audioPaths,
      });

      const audioCount = audioPaths.filter(p => p !== null).length;
      console.log(`[Video] ${catKey}: downloaded ${audioCount}/${items.length} audio clips`);
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
    // Track which audio clip goes with each frame (null = silence)
    const frameAudioPaths: (string | null)[] = [];
    let frameIdx = 0;

    // Find the top artist's audio for hook/closing (first artist = #1 pick)
    const artistsCat = categoryDataList.find(c => c.category === 'artists');
    const topArtistAudio = artistsCat?.audioPaths[0] || // #1 artist
      categoryDataList[0]?.audioPaths[0] || null;       // fallback: #1 of first category

    // 1. Hook frame — play top artist's song
    const hookPath = join(workDir, `frame_${frameIdx++}.png`);
    await fs.writeFile(hookPath, await renderHookFrame(videoConfig));
    framePaths.push(hookPath);
    frameDurations.push(HOOK_DURATION);
    frameAudioPaths.push(topArtistAudio);

    // 2. Per-category: title + items (reverse order for countdown: #4, #3, #2, #1)
    for (const cat of categoryDataList) {
      // Category title frame — play the upcoming #4 item's audio (first shown)
      const titlePath = join(workDir, `frame_${frameIdx++}.png`);
      await fs.writeFile(titlePath, await renderCategoryTitleFrame(videoConfig, cat));
      framePaths.push(titlePath);
      frameDurations.push(CATEGORY_TITLE_DURATION);
      const lastItemIdx = cat.items.length - 1;
      frameAudioPaths.push(cat.audioPaths[lastItemIdx] || topArtistAudio);

      // Items in reverse: #4, #3, #2, #1
      const itemCount = cat.items.length;
      for (let i = itemCount - 1; i >= 0; i--) {
        const itemPath = join(workDir, `frame_${frameIdx++}.png`);
        await fs.writeFile(itemPath, await renderItemFrame(videoConfig, cat, i));
        framePaths.push(itemPath);
        frameDurations.push(i === 0 ? NUMBER_1_DURATION : ITEM_DURATION);
        // Fall back to #1 artist's audio if no audio for this item
        frameAudioPaths.push(cat.audioPaths[i] || topArtistAudio);
      }
    }

    // 3. Closing frame — play top artist's song
    const closingPath = join(workDir, `frame_${frameIdx++}.png`);
    await fs.writeFile(closingPath, await renderClosingFrame(videoConfig));
    framePaths.push(closingPath);
    frameDurations.push(CLOSING_DURATION);
    frameAudioPaths.push(topArtistAudio);

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

    // ── Check if we have any audio clips ──
    const hasAnyAudio = frameAudioPaths.some(p => p !== null);
    const audioFrameCount = frameAudioPaths.filter(p => p !== null).length;
    console.log(`[Video] Audio clips mapped to frames: ${audioFrameCount}/${frameAudioPaths.length}`);

    // ── Build audio track if we have audio clips ──
    let audioTrackPath: string | null = null;

    if (hasAnyAudio) {
      console.log('[Video] Building audio track...');
      audioTrackPath = await buildAudioTrack(
        ffmpegPath,
        spawnSync,
        workDir,
        frameDurations,
        frameAudioPaths,
      );
      if (audioTrackPath) {
        console.log('[Video] Audio track built successfully');
      } else {
        console.log('[Video] Audio track build failed, proceeding without audio');
      }
    } else {
      console.log('[Video] No audio clips found, generating silent video');
    }

    // ── Build ffmpeg command for video (+ optional audio mux) ──
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

    // If we have an audio track, add it as an input
    if (audioTrackPath) {
      inputs.push('-i', audioTrackPath);
    }

    const concatInputs = framePaths.map((_, i) => `[${i}:v]`).join('');
    const filterComplex = `${concatInputs}concat=n=${framePaths.length}:v=1:a=0[vout]`;
    const totalDuration = frameDurations.reduce((a, b) => a + b, 0);

    const ffmpegArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      // If audio track exists, map it; otherwise video-only
      ...(audioTrackPath ? ['-map', `${framePaths.length}:a`, '-c:a', 'aac', '-b:a', '128k'] : []),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-r', '15',
      '-t', totalDuration.toFixed(2),
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      ...(audioTrackPath ? ['-shortest'] : []),
      outputPath,
    ];

    console.log('[Video] Running ffmpeg (final mux)...');
    console.log('[Video] Audio input index:', audioTrackPath ? framePaths.length : 'none');
    const ffmpegResult = spawnSync(ffmpegPath, ffmpegArgs, {
      timeout: 55000,
      maxBuffer: 50 * 1024 * 1024,
    });

    // Log ffmpeg stderr (it contains stream info)
    const ffmpegStderr = (ffmpegResult.stderr || '').toString();
    // Extract stream info lines
    const streamLines = ffmpegStderr.split('\n').filter((l: string) => l.includes('Stream') || l.includes('Output'));
    if (streamLines.length > 0) {
      console.log('[Video] ffmpeg streams:', streamLines.join(' | '));
    }

    if (ffmpegResult.status !== 0) {
      console.error('[Video] ffmpeg stderr:', ffmpegStderr.slice(-500));
      throw new Error(`ffmpeg exited with code ${ffmpegResult.status}`);
    }
    console.log('[Video] ffmpeg completed');

    // ── Read output + cleanup ──
    const videoBuffer = await fs.readFile(outputPath);
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});

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


// ── Audio Track Builder ──────────────────────────────────────



/**
 * Builds a single AAC audio track using one ffmpeg filter_complex pass.
 * Each frame gets either a trimmed audio clip or silence, all concatenated
 * via the concat filter into a single output.
 */
function buildAudioTrack(
  ffmpegPath: string,
  spawnSync: typeof import('child_process').spawnSync,
  workDir: string,
  frameDurations: number[],
  frameAudioPaths: (string | null)[],
): string | null {
  try {
    // Collect unique audio file inputs (deduplicate for -i flags)
    const audioInputMap = new Map<string, number>(); // path → input index
    const inputs: string[] = [];

    // Input 0: silence generator (used for frames without audio)
    inputs.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
    const silenceIdx = 0;
    let nextInputIdx = 1;

    // Add unique audio files as inputs
    for (const audioPath of frameAudioPaths) {
      if (audioPath && !audioInputMap.has(audioPath)) {
        inputs.push('-i', audioPath);
        audioInputMap.set(audioPath, nextInputIdx);
        nextInputIdx++;
      }
    }

    // Merge consecutive frames with the same audio source into groups
    // This avoids fade-out/fade-in gaps (e.g. category title + #4 item same song)
    interface AudioGroup { audioPath: string | null; totalDuration: number; }
    const groups: AudioGroup[] = [];

    for (let i = 0; i < frameDurations.length; i++) {
      const audioPath = frameAudioPaths[i];
      const prev = groups[groups.length - 1];
      // Merge if same audio source as previous group (and not silence)
      if (prev && audioPath && prev.audioPath === audioPath) {
        prev.totalDuration += frameDurations[i];
      } else {
        groups.push({ audioPath, totalDuration: frameDurations[i] });
      }
    }

    // Build filter_complex from merged groups
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    for (let g = 0; g < groups.length; g++) {
      const { audioPath, totalDuration } = groups[g];
      const label = `seg${g}`;

      if (audioPath && audioInputMap.has(audioPath)) {
        const inputIdx = audioInputMap.get(audioPath)!;
        const fadeOutStart = Math.max(0, totalDuration - AUDIO_FADE_DURATION);
        filterParts.push(
          `[${inputIdx}:a]atrim=start=${AUDIO_SKIP}:end=${AUDIO_SKIP + totalDuration},asetpts=PTS-STARTPTS,afade=t=in:d=${AUDIO_FADE_DURATION},afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${AUDIO_FADE_DURATION}[${label}]`
        );
      } else {
        filterParts.push(
          `[${silenceIdx}:a]atrim=duration=${totalDuration.toFixed(3)},asetpts=PTS-STARTPTS[${label}]`
        );
      }
      concatInputs.push(`[${label}]`);
    }

    console.log(`[Video] Audio: ${groups.length} segments (merged from ${frameDurations.length} frames)`);

    const filterComplex =
      filterParts.join('; ') +
      `; ${concatInputs.join('')}concat=n=${groups.length}:v=0:a=1[aout]`;

    const audioOutputPath = join(workDir, 'audio_track.m4a');

    const result = spawnSync(ffmpegPath, [
      '-y',
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[aout]',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      audioOutputPath,
    ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });

    if (result.status !== 0) {
      const stderr = (result.stderr || '').toString();
      console.error('[Video] Audio track build failed:', stderr.slice(-500));
      return null;
    }

    return audioOutputPath;
  } catch (err) {
    console.error('[Video] Audio track build error:', err);
    return null;
  }
}


