import { NextRequest } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/admin';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── helpers ────────────────────────────────────────────────────────────────

function startOfYesterdayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function endOfYesterdayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);          // midnight today = end of yesterday
  return d;
}

// ─── stats collection ───────────────────────────────────────────────────────

async function collectStats() {
  const since = startOfYesterdayUTC();
  const until = endOfYesterdayUTC();

  // 1. Total users (Firebase Auth — list all, count)
  //    listUsers is paginated; we iterate until done.
  let totalUsers = 0;
  let newUsers = 0;
  let pageToken: string | undefined;

  do {
    const result = await adminAuth.listUsers(1000, pageToken);
    totalUsers += result.users.length;
    newUsers += result.users.filter((u) => {
      const created = new Date(u.metadata.creationTime);
      return created >= since && created < until;
    }).length;
    pageToken = result.pageToken;
  } while (pageToken);

  // 2. Total top4 lists (count all docs in top4_entries with at least 1 item)
  const allEntriesSnap = await db.collection('top4_entries').count().get();
  const totalLists = allEntriesSnap.data().count;

  // 3. New top4 lists created yesterday
  const newListsSnap = await db
    .collection('top4_entries')
    .where('updated_at', '>=', since)
    .where('updated_at', '<', until)
    .count()
    .get();
  const newLists = newListsSnap.data().count;

  // 4. Total visits — tracked via a `page_views` collection.
  //    Each doc is a single page view: { path, date, timestamp }
  let totalVisits = 0;
  let yesterdayVisits = 0;
  try {
    const totalVisitsSnap = await db.collection('page_views').count().get();
    totalVisits = totalVisitsSnap.data().count;

    const yesterdayVisitsSnap = await db
      .collection('page_views')
      .where('timestamp', '>=', since)
      .where('timestamp', '<', until)
      .count()
      .get();
    yesterdayVisits = yesterdayVisitsSnap.data().count;
  } catch {
    totalVisits = 0;
    yesterdayVisits = 0;
  }

  return { totalUsers, newUsers, totalLists, newLists, totalVisits, yesterdayVisits, since, until };
}

// ─── email builder ──────────────────────────────────────────────────────────

function buildEmailHtml(stats: Awaited<ReturnType<typeof collectStats>>): string {
  const dateLabel = stats.since.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  const row = (label: string, value: string | number, isNew = false) => `
    <tr>
      <td style="padding:14px 20px;font-size:15px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td>
      <td style="padding:14px 20px;font-size:15px;font-weight:700;color:${isNew ? '#7c3aed' : '#111827'};text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Top4 Daily Report</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a78bfa);padding:32px 40px;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#e9d5ff;text-transform:uppercase;">Daily Report</p>
              <h1 style="margin:8px 0 0;font-size:28px;font-weight:800;color:#ffffff;">Top4</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#c4b5fd;">${dateLabel}</p>
            </td>
          </tr>

          <!-- Stats table -->
          <tr>
            <td style="padding:0 20px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">

                <!-- Section: Users -->
                <tr>
                  <td colspan="2" style="padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;">
                    👥 Users
                  </td>
                </tr>
                ${row('Total Users', stats.totalUsers.toLocaleString())}
                ${row('New Users Yesterday', `+${stats.newUsers.toLocaleString()}`, true)}

                <!-- Section: Content -->
                <tr>
                  <td colspan="2" style="padding:24px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;">
                    📋 Top4 Lists
                  </td>
                </tr>
                ${row('Total Lists', stats.totalLists.toLocaleString())}
                ${row('New Lists Yesterday', `+${stats.newLists.toLocaleString()}`, true)}

                <!-- Section: Traffic -->
                <tr>
                  <td colspan="2" style="padding:24px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;">
                    📈 Traffic
                  </td>
                </tr>
                ${row('Total Page Views', stats.totalVisits.toLocaleString())}
                ${row('New Page Views Yesterday', `+${stats.yesterdayVisits.toLocaleString()}`, true)}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Automated daily digest · top4.info<br/>
                Sent every morning at 8 AM ET
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── mailer ─────────────────────────────────────────────────────────────────

async function sendReport(html: string, dateLabel: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'breadstand@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: '"Top4 Reports" <breadstand@gmail.com>',
    to: 'breadstand@gmail.com',
    subject: `Top4 Daily Report — ${dateLabel}`,
    html,
  });
}

// ─── route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify the Vercel cron secret (or a manual call with the same header)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const stats = await collectStats();
    const html = buildEmailHtml(stats);

    const dateLabel = stats.since.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });

    await sendReport(html, dateLabel);

    return Response.json({ ok: true, message: `Report sent for ${dateLabel}` });
  } catch (err) {
    console.error('[daily-report] Error:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
