import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initI18next } from 'src/i18n/i18next';
import { AccentColorPicker, accentIcon, accentItems } from 'src/pickers/AccentColorPicker';
import { AccentPreviewService, applyPreview, themeBlock } from 'src/services/AccentPreviewService';
import { ACCENT_PRESETS, DEFAULT_ACCENT } from 'src/themes/accent';
import { ColorThemeGenerator } from 'src/themes/ColorThemeGenerator';
import { COLOR_THEMES, THEMES_FOLDER } from 'src/themes/colorThemes';

import type { PreviewState } from 'src/services/AccentPreviewService';
import type { Memento } from 'vscode';

import { testState } from '../mocks/vscode';

const root = join(__dirname, '..', '..');
const GREEN = '#79cb60';
const DARK = themeBlock('Cool Islands Dark');
const LIGHT = themeBlock('Cool Islands Light');
const CUSTOMIZATIONS = 'workbench.colorCustomizations';

const memento = () => {
  const state = new Map<string, unknown>();
  return {
    memento: {
      get: <T>(key: string) => state.get(key) as T | undefined,
      keys: () => [...state.keys()],
      update: async (key: string, value: unknown) => {
        if (value === undefined) state.delete(key);
        else state.set(key, value);
      },
    } as unknown as Memento,
    state,
  };
};

const EMPTY: PreviewState = { original: {}, written: {} };

const customizations = () => testState.config[CUSTOMIZATIONS] as Record<string, Record<string, string>> | undefined;

/** Let the timers of the picker run */
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe('accent preview', () => {
  describe('applyPreview', () => {
    it('writes the patches into the theme blocks and remembers what was there', () => {
      const { customizations: result, state } = applyPreview(
        { [DARK]: { 'button.background': '#123456', 'editor.background': '#000000' }, 'statusBar.background': '#ff0000' },
        EMPTY,
        { [DARK]: { 'button.background': GREEN, focusBorder: GREEN }, [LIGHT]: { focusBorder: GREEN } },
      );
      assert.deepEqual(result, {
        [DARK]: { 'button.background': GREEN, 'editor.background': '#000000', focusBorder: GREEN },
        [LIGHT]: { focusBorder: GREEN },
        'statusBar.background': '#ff0000',
      });
      assert.deepEqual(state.original, { [DARK]: { 'button.background': '#123456', focusBorder: null }, [LIGHT]: { focusBorder: null } });
    });

    it('takes its values away again, puts back the ones of the user and drops an empty block', () => {
      const first = applyPreview({ [DARK]: { 'button.background': '#123456' } }, EMPTY, {
        [DARK]: { 'button.background': GREEN, focusBorder: GREEN },
        [LIGHT]: { focusBorder: GREEN },
      });
      const second = applyPreview(first.customizations, first.state, {});
      assert.deepEqual(second.customizations, { [DARK]: { 'button.background': '#123456' } });
      assert.deepEqual(second.state, EMPTY);
      assert.equal(applyPreview({ [DARK]: { focusBorder: GREEN } }, { original: { [DARK]: { focusBorder: null } }, written: { [DARK]: { focusBorder: GREEN } } }, {}).customizations, undefined);
    });

    it('leaves a key the user changed during the preview, and keeps that value as the one to put back', () => {
      const first = applyPreview({}, EMPTY, { [DARK]: { focusBorder: GREEN } });
      const changed = { [DARK]: { focusBorder: '#abcdef' } };
      assert.deepEqual(applyPreview(changed, first.state, {}).customizations, changed);

      const again = applyPreview(changed, first.state, { [DARK]: { focusBorder: '#ff9800' } });
      assert.deepEqual(again.state.original, { [DARK]: { focusBorder: '#abcdef' } });
      assert.deepEqual(applyPreview(again.customizations, again.state, {}).customizations, changed);
    });

    it('moves from one preview to the next without losing the values of the user', () => {
      const user = { [DARK]: { 'button.background': '#123456' } };
      const first = applyPreview(user, EMPTY, { [DARK]: { 'button.background': GREEN, focusBorder: GREEN } });
      const second = applyPreview(first.customizations, first.state, { [DARK]: { 'button.background': '#ff9800' } });
      assert.deepEqual(second.customizations, { [DARK]: { 'button.background': '#ff9800' } });
      assert.deepEqual(applyPreview(second.customizations, second.state, {}).customizations, user);
    });

    it('ignores a setting that is not an object', () => {
      assert.deepEqual(applyPreview('nonsense', EMPTY, { [DARK]: { focusBorder: GREEN } }).customizations, { [DARK]: { focusBorder: GREEN } });
      // a block the preview never wrote is not its business
      assert.deepEqual(applyPreview({ [DARK]: 'nonsense' }, EMPTY, {}).customizations, { [DARK]: 'nonsense' });
      assert.deepEqual(applyPreview({ [DARK]: 'nonsense' }, EMPTY, { [DARK]: { focusBorder: GREEN } }).customizations, { [DARK]: { focusBorder: GREEN } });
    });
  });

  describe('AccentPreviewService', () => {
    let dist: string;
    const paths = () => ({ dist, themes: join(root, THEMES_FOLDER) });

    beforeEach(() => {
      dist = mkdtempSync(join(tmpdir(), 'accent-preview-'));
      new ColorThemeGenerator(paths()).createJsonThemes();
      testState.config = {};
      testState.sections = new Set(['workbench']);
    });

    afterEach(() => {
      rmSync(dist, { force: true, recursive: true });
      testState.config = {};
      testState.sections = new Set();
    });

    it('shows an accent in both Cool Islands blocks, only the keys that change, and cancel puts the settings back', async () => {
      testState.config[CUSTOMIZATIONS] = { [DARK]: { 'button.background': '#123456' }, 'editor.background': '#000000' };
      const before = structuredClone(testState.config[CUSTOMIZATIONS]);
      const { memento: state } = memento();
      const service = new AccentPreviewService(paths());
      service.init(state);

      await service.show(GREEN);
      assert.equal(service.isPending, true);
      assert.equal(customizations()?.[DARK]['button.background'], GREEN);
      assert.equal(customizations()?.[LIGHT].focusBorder, GREEN);
      const dark = JSON.parse(readFileSync(join(dist, COLOR_THEMES[0].file), 'utf8')) as { colors: Record<string, string> };
      for (const [key, value] of Object.entries(customizations()?.[DARK] ?? {})) {
        if (key !== 'button.background') assert.notEqual(dark.colors[key], value, key);
      }
      assert.equal(customizations()?.['editor.background'], '#000000');

      await service.cancel();
      assert.equal(service.isPending, false);
      assert.deepEqual(testState.config[CUSTOMIZATIONS], before);
      assert.equal(state.get('accentPreview'), undefined);
    });

    it('accepts: writes the setting, keeps the colors until the next activation, which takes them away', async () => {
      const { memento: state } = memento();
      const service = new AccentPreviewService(paths());
      service.init(state);

      await service.show('#ff9800');
      await service.accept(GREEN);
      assert.equal(testState.config.accentColor, GREEN);
      assert.equal(customizations()?.[DARK]['button.background'], GREEN);

      // a later preview cancelled goes back to the accepted one, not to the theme file VS Code has not read again
      await service.show('#ff9800');
      await service.cancel();
      assert.equal(customizations()?.[DARK]['button.background'], GREEN);

      const next = new AccentPreviewService(paths());
      next.init(state);
      await next.cleanUp();
      assert.equal(testState.config[CUSTOMIZATIONS], undefined);
      assert.equal(state.get('accentPreview'), undefined);
    });

    it('cleans up nothing when it wrote nothing, and takes the Islands blue as no setting', async () => {
      testState.config[CUSTOMIZATIONS] = { 'editor.background': '#000000' };
      const { memento: state } = memento();
      const service = new AccentPreviewService(paths());
      service.init(state);
      await service.cleanUp();
      assert.deepEqual(testState.config[CUSTOMIZATIONS], { 'editor.background': '#000000' });

      await service.accept(DEFAULT_ACCENT);
      assert.equal(testState.config.accentColor, undefined);
      // the theme files have the blue already: nothing to show
      assert.deepEqual(testState.config[CUSTOMIZATIONS], { 'editor.background': '#000000' });
    });
  });

  describe('AccentColorPicker', () => {
    let dist: string;

    before(async () => {
      await initI18next();
    });

    beforeEach(() => {
      dist = mkdtempSync(join(tmpdir(), 'accent-icons-'));
      testState.config = {};
      testState.quickPicks = [];
      testState.inputs = [];
      testState.messages = [];
      testState.extensionPath = dist;
      testState.sections = new Set(['workbench']);
    });

    afterEach(() => {
      rmSync(dist, { force: true, recursive: true });
      testState.extensionPath = '';
      testState.sections = new Set();
      testState.config = {};
      testState.quickPicks = [];
      testState.inputs = [];
      testState.messages = [];
    });

    /** A preview service that records the calls */
    const recorder = () => {
      const calls: string[] = [];
      let pending = false;
      const preview = {
        accept: async (accent: string | undefined) => {
          pending = false;
          calls.push(`accept ${accent}`);
        },
        cancel: async () => {
          pending = false;
          calls.push('cancel');
        },
        get isPending() {
          return pending;
        },
        show: async (accent: string | undefined) => {
          pending = true;
          calls.push(`show ${accent}`);
        },
      };
      return { calls, preview: preview as unknown as AccentPreviewService };
    };

    type Item = { color?: string; custom?: boolean; label: string };
    const items = () => testState.quickPicks.at(-1)?.items as Item[];
    const byColor = (color: string) => items().find((item) => item.color === color && !item.label.startsWith('$('))!;

    it('writes a dot for each color, once', () => {
      const uri = accentIcon(dist, GREEN) as unknown as { fsPath: string };
      assert.equal(uri.fsPath, join(dist, 'accents', '79cb60.svg'));
      assert.match(readFileSync(uri.fsPath, 'utf8'), /fill="#79cb60"/);
    });

    it('lists the named accents, marks the current one, and offers the blue back only for another accent', () => {
      const listed = accentItems(DEFAULT_ACCENT, () => undefined);
      const colors = listed.map((item) => (item as Item).color).filter(Boolean);
      assert.deepEqual(colors, ACCENT_PRESETS.map((preset) => preset.color));
      assert.ok(listed.find((item) => (item as Item).color === DEFAULT_ACCENT)?.description?.includes('current'));
      assert.equal(listed.find((item) => item.label === 'Islands Blue')?.label, 'Islands Blue');
      assert.ok(listed.some((item) => (item as Item).custom));

      const custom = accentItems('#123456', () => undefined);
      assert.ok(custom.some((item) => item.label === '#123456'), 'the current custom color is listed');
      assert.ok(custom.some((item) => item.label.includes('Islands blue')), 'the way back to the blue');
    });

    it('shows the accent the user stops on, and keeps the one accepted', async () => {
      const { calls, preview } = recorder();
      const opened = new AccentColorPicker(preview).open();
      const quickPick = testState.quickPicks.at(-1)!;
      assert.equal((quickPick.activeItems[0] as Item).color, DEFAULT_ACCENT);
      // not Cool Islands: the user is told where the accent is seen
      assert.equal(testState.messages.length, 1);

      quickPick.fireActive(byColor('#ff9800'));
      quickPick.fireActive(byColor(GREEN));
      await wait(200);
      quickPick.accept();
      await opened;
      assert.deepEqual(calls, [`show ${GREEN}`, `accept ${GREEN}`]);
      assert.equal(quickPick.disposed, true);
    });

    it('goes back when the user presses Escape after a preview', async () => {
      testState.config['workbench.colorTheme'] = 'Cool Islands Dark';
      const { calls, preview } = recorder();
      const opened = new AccentColorPicker(preview).open();
      const quickPick = testState.quickPicks.at(-1)!;
      assert.equal(testState.messages.length, 0);
      quickPick.fireActive(byColor(GREEN));
      await wait(200);
      quickPick.hide();
      await opened;
      assert.deepEqual(calls, [`show ${GREEN}`, 'cancel']);
    });

    it('closes without a change when nothing was shown', async () => {
      const { calls, preview } = recorder();
      const opened = new AccentColorPicker(preview).open();
      testState.quickPicks.at(-1)!.hide();
      await opened;
      assert.deepEqual(calls, []);
    });

    it('takes a typed color, shown while typed, and cancels a wrong one', async () => {
      const { calls, preview } = recorder();
      testState.inputs = ['#8BC34A'];
      let opened = new AccentColorPicker(preview).open();
      let quickPick = testState.quickPicks.at(-1)!;
      quickPick.accept(items().find((item) => item.custom));
      await opened;
      assert.deepEqual(calls, ['show #8bc34a', 'accept #8bc34a']);

      calls.length = 0;
      testState.inputs = [];
      opened = new AccentColorPicker(preview).open();
      quickPick = testState.quickPicks.at(-1)!;
      quickPick.fireActive(byColor(GREEN));
      await wait(200);
      quickPick.accept(items().find((item) => item.custom));
      await opened;
      assert.deepEqual(calls, [`show ${GREEN}`, 'cancel']);
    });

    it('draws the dots of the items in the dist folder of the extension', async () => {
      const opened = new AccentColorPicker(recorder().preview).open();
      testState.quickPicks.at(-1)!.hide();
      await opened;
      assert.ok(existsSync(join(dist, 'dist', 'accents', '79cb60.svg')));
    });
  });
});
