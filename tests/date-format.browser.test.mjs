import { execFileSync } from 'node:child_process';

const pageUrl = process.env.TEST_URL || 'http://127.0.0.1:5173/index.html';
const datePattern = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}（韩国时间）$/;

function runAgent(args, { timeout = 10000, allowTimeout = false } = {}) {
  try {
    return execFileSync('agent-browser', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    }).trim();
  } catch (error) {
    if (allowTimeout && error.signal === 'SIGTERM') {
      return '';
    }
    const stderr = error.stderr ? `\n${error.stderr.toString()}` : '';
    const stdout = error.stdout ? `\n${error.stdout.toString()}` : '';
    throw new Error(`agent-browser ${args.join(' ')} failed${stdout}${stderr}`);
  }
}

function evalInBrowser(expression, timeout = 10000) {
  const output = runAgent(['eval', expression], { timeout });
  return JSON.parse(output);
}

async function waitForBrowserCondition(expression, timeoutMs = 30000) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      if (evalInBrowser(expression, 5000) === true) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw lastError || new Error(`Timed out waiting for browser condition: ${expression}`);
}

try {
  runAgent(['open', 'about:blank']);
  runAgent(['network', 'route', 'https://fonts.googleapis.com/*', '--abort']);
  runAgent(['network', 'route', 'https://fonts.gstatic.com/*', '--abort']);
  runAgent(['open', pageUrl], { timeout: 15000 });

  await waitForBrowserCondition(`
    Boolean(window.IUApp) &&
    document.readyState === 'complete' &&
    document.querySelectorAll('.reply-card-date, .iu-reply-date').length >= 2
  `);

  const result = evalInBrowser(`(() => {
    const dates = Array.from(document.querySelectorAll('.reply-card-date, .iu-reply-date'))
      .slice(0, 20)
      .map(element => element.textContent.trim());

    return {
      sample: window.IUApp.formatFullDate('2026-04-13 21:36:00'),
      dates,
      oldStyleDates: dates.filter(date => /\\d+年|\\d+月|\\d+日/.test(date)),
      missingKstLabelDates: dates.filter(date => !date.endsWith('（韩国时间）')),
      malformedDates: dates.filter(date => !${datePattern}.test(date)),
    };
  })()`);

  if (result.sample !== '2026/04/14 06:36（韩国时间）') {
    throw new Error(`Expected sample date to be 2026/04/14 06:36（韩国时间）, got ${result.sample}`);
  }

  if (result.malformedDates.length > 0) {
    throw new Error(`Found malformed dates: ${result.malformedDates.join(', ')}`);
  }

  if (result.oldStyleDates.length > 0) {
    throw new Error(`Found old-style dates: ${result.oldStyleDates.join(', ')}`);
  }

  if (result.missingKstLabelDates.length > 0) {
    throw new Error(`Found dates missing Korea time label: ${result.missingKstLabelDates.join(', ')}`);
  }

  console.log(`PASS date format browser test: ${result.dates.length} rendered dates matched YYYY/MM/DD HH:mm（韩国时间）`);
} finally {
  runAgent(['close'], { timeout: 5000, allowTimeout: true });
}
