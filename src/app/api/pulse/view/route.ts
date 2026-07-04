import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) {
      return Response.json({ error: 'Path is required' }, { status: 400 });
    }

    const dateStr = new Date().toISOString().split('T')[0];

    await db.collection('page_views').add({
      path,
      date: dateStr,
      timestamp: new Date(),
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[analytics] Error logging page view:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
