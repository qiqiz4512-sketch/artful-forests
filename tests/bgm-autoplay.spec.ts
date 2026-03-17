import { test, expect } from '../playwright-fixture';

const BASE_URL = process.env.BGM_TEST_BASE_URL ?? 'http://127.0.0.1:8081/';
const SESSION_STORAGE_KEY = 'secondme.oauth.session';

const TEST_SESSION = {
  accessToken: 'playwright-access-token',
  refreshToken: 'playwright-refresh-token',
  expiresAt: Date.now() + 60 * 60 * 1000,
  scope: ['user.info', 'chat'],
  user: {
    userId: 'playwright-user',
    name: 'Playwright Ranger',
    email: null,
    avatar: null,
    route: null,
    tags: ['AI'],
  },
};

type AudioSnapshot = {
  exists: boolean;
  paused: boolean;
  muted: boolean;
  currentTime: number;
  readyState: number;
};

const readBgmState = async (page: Parameters<typeof test>[0]['page']): Promise<AudioSnapshot> => {
  return page.evaluate(() => {
    const audio = Array.from(document.querySelectorAll('audio')).find((node) =>
      node.getAttribute('src')?.includes('forest-bgm.mp3') || node.currentSrc.includes('forest-bgm.mp3'),
    ) as HTMLAudioElement | undefined;

    if (!audio) {
      return {
        exists: false,
        paused: true,
        muted: false,
        currentTime: 0,
        readyState: 0,
      };
    }

    return {
      exists: true,
      paused: audio.paused,
      muted: audio.muted,
      currentTime: audio.currentTime,
      readyState: audio.readyState,
    };
  });
};

const waitForBgmPlaying = async (page: Parameters<typeof test>[0]['page']) => {
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('audio')).some((node) =>
      node.getAttribute('src')?.includes('forest-bgm.mp3') || node.currentSrc.includes('forest-bgm.mp3'),
    );
  });

  await expect
    .poll(async () => readBgmState(page), { timeout: 10000, intervals: [200, 400, 800] })
    .toMatchObject({ exists: true, paused: false });

  await expect
    .poll(async () => (await readBgmState(page)).currentTime, { timeout: 10000, intervals: [250, 500, 800] })
    .toBeGreaterThan(0);
};

test('bgm keeps playing on first load and after reload with restored login session', async ({ page }) => {
  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: SESSION_STORAGE_KEY, session: TEST_SESSION },
  );

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForBgmPlaying(page);

  const initialState = await readBgmState(page);
  expect(initialState.muted).toBe(false);
  expect(initialState.readyState).toBeGreaterThan(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForBgmPlaying(page);

  const reloadedState = await readBgmState(page);
  expect(reloadedState.muted).toBe(false);
  expect(reloadedState.readyState).toBeGreaterThan(1);
});