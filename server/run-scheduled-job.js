import 'dotenv/config';

const RAW_APP_URL = (process.env.APP_URL || '').trim();
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || '';

function normalizeAppUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function main() {
  const jobName = process.argv[2];
  if (!jobName) {
    throw new Error('Usage: node server/run-scheduled-job.js <morning-reminders|post-meeting-check|daily-digest>');
  }

  const appUrl = normalizeAppUrl(RAW_APP_URL);

  if (!appUrl) {
    throw new Error('APP_URL must be configured to run scheduled jobs.');
  }

  if (!SCHEDULER_SECRET) {
    throw new Error('SCHEDULER_SECRET must be configured to run scheduled jobs.');
  }

  const routeMap = {
    'morning-reminders': '/api/jobs/meetings/morning-reminders/run',
    'post-meeting-check': '/api/jobs/meetings/post-meeting-check/run',
    'daily-digest': '/api/jobs/meetings/daily-digest/run'
  };

  const route = routeMap[jobName];
  if (!route) {
    throw new Error(`Unknown scheduled job "${jobName}".`);
  }

  const response = await fetch(`${appUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-scheduler-secret': SCHEDULER_SECRET
    },
    body: JSON.stringify({})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Scheduled job failed with status ${response.status}.`);
  }

  console.log(JSON.stringify({
    jobName,
    evaluatedAt: data.evaluatedAt || new Date().toISOString(),
    result: data
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
