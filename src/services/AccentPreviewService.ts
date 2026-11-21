import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getExtensionPath } from 'src/helpers/vscodeUtils';
import { colorThemeService } from 'src/services/ColorThemeService';
import { configService } from 'src/services/ConfigService';
import { logger } from 'src/services/LoggingService';
import { changedColors, isDefaultAccent, normalizeAccent } from 'src/themes/accent';
import { ColorThemeGenerator } from 'src/themes/ColorThemeGenerator';
import { COLOR_THEMES, THEMES_FOLDER } from 'src/themes/colorThemes';
import { ConfigurationTarget, workspace } from 'vscode';

import type { ColorMix, ColorThemePaths } from 'src/themes/ColorThemeGenerator';
import type { Memento } from 'vscode';

/**
 * The accent color shown at once, while the user picks it (user decision 2026-11-21).
 *
 * VS Code reads a color theme file again only on a reload, so the colors the new accent changes are written for the
 * moment into the user settings `workbench.colorCustomizations`, in the blocks of our two themes
 * (`"[Cool Islands Dark]"`, `"[Cool Islands Light]"`), which VS Code applies at once. Only there, and only:
 *   - the keys whose color differs from the theme file, with the color the theme file gets with the new accent;
 *   - a value the user had for such a key is kept (in globalState) and put back;
 *   - cancel puts back what was there before the preview (or the last accepted preview of this window);
 *   - accept writes `accentColor` (the theme files are generated again) and leaves the preview, which has the colors of
 *     the new files, until the next activation of the extension, which takes away every key still holding our value.
 * A key the user changed in between is never touched. This is the one exception to "the kit does not write
 * `workbench.colorCustomizations`" (docs/MAINTENANCE.md).
 */

const STATE_KEY = 'accentPreview';
const SETTING = 'colorCustomizations';

/** Theme block (`"[Cool Islands Dark]"`) -> color id -> color */
type Blocks = Record<string, Record<string, string>>;

/** What the preview wrote, and what was there before (null: nothing) */
type PreviewState = {
  /** the patches of the last accepted preview of this window, which cancel goes back to */
  accepted?: Blocks;
  original: Record<string, Record<string, string | null>>;
  written: Blocks;
};

const EMPTY_STATE: PreviewState = { original: {}, written: {} };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The block of a theme in `workbench.colorCustomizations`, which VS Code applies to that theme only */
export const themeBlock = (label: string) => `[${label}]`;

/**
 * The user settings `workbench.colorCustomizations` with the keys the preview wrote before taken away (when they still
 * hold its value: the value the user had is put back) and the new patches written. Pure, for the tests.
 * @returns the new value of the setting (undefined: empty) and the new state
 */
export const applyPreview = (
  customizations: unknown,
  state: PreviewState,
  patches: Blocks,
): { customizations: Record<string, unknown> | undefined; state: PreviewState } => {
  const result: Record<string, unknown> = isRecord(customizations) ? { ...customizations } : {};
  const original: PreviewState['original'] = {};
  const written: Blocks = {};

  for (const block of new Set([...Object.keys(state.written), ...Object.keys(patches)])) {
    const colors: Record<string, unknown> = isRecord(result[block]) ? { ...result[block] } : {};
    const before = { ...state.original[block] };

    // take our previous values away, where the user did not change them since
    for (const [key, value] of Object.entries(state.written[block] ?? {})) {
      if (colors[key] !== value) continue;
      const kept = before[key];
      if (kept === null || kept === undefined) delete colors[key];
      else colors[key] = kept;
    }

    const patch = patches[block] ?? {};
    const kept: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(patch)) {
      // ours taken away, this is the value of the user (or a value the user wrote over ours since)
      kept[key] = typeof colors[key] === 'string' ? (colors[key] as string) : null;
      colors[key] = value;
    }
    if (Object.keys(patch).length > 0) {
      original[block] = kept;
      written[block] = { ...patch };
    }

    if (Object.keys(colors).length > 0) result[block] = colors;
    else delete result[block];
  }

  return {
    customizations: Object.keys(result).length > 0 ? result : undefined,
    state: { ...(state.accepted ? { accepted: state.accepted } : {}), original, written },
  };
};

export class AccentPreviewService {
  private memento: Memento | undefined;
  /** the writes of the setting, one after the other (a picker moves faster than settings.json is written) */
  private queue: Promise<void> = Promise.resolve();
  /** the other themes mixed in, read once per preview */
  private mix: ColorMix | undefined;
  /** a preview is shown that was neither accepted nor cancelled */
  private pending = false;

  constructor(private readonly paths?: ColorThemePaths) {}

  get isPending() {
    return this.pending;
  }

  /** Called on activation: the state lives in globalState, to clean up after a window closed during a preview */
  init(memento: Memento) {
    this.memento = memento;
  }

  /** Show the colors of this accent at once (undefined or the Islands blue: the colors of Islands) */
  show(accent: string | undefined): Promise<void> {
    this.pending = true;
    return this.enqueue(async () => this.write(this.patches(accent)));
  }

  /** Go back to the colors before the preview */
  cancel(): Promise<void> {
    this.pending = false;
    this.mix = undefined;
    return this.enqueue(async () => this.write(this.state().accepted ?? {}));
  }

  /** Keep this accent: the setting is written (the theme files follow) and the preview stays until the next activation */
  accept(accent: string | undefined): Promise<void> {
    this.pending = false;
    const normalized = normalizeAccent(accent);
    return this.enqueue(async () => {
      const patches = this.patches(normalized);
      await this.write(patches);
      await this.saveState({ ...this.state(), accepted: patches });
      this.mix = undefined;
      configService.setConfigValueWhereDefined('accentColor', isDefaultAccent(normalized) ? undefined : normalized, ConfigurationTarget.Global);
    });
  }

  /** On activation: the theme files have the accent, the colors of the preview are taken away */
  cleanUp(): Promise<void> {
    if (!this.memento?.get<PreviewState>(STATE_KEY)) return Promise.resolve();
    this.pending = false;
    return this.enqueue(async () => {
      await this.write({});
      await this.saveState();
    });
  }

  /** The colors the accent changes in each theme file, by theme block */
  private patches(accent: string | undefined): Blocks {
    const paths = this.paths ?? { dist: join(getExtensionPath(), 'dist'), themes: join(getExtensionPath(), THEMES_FOLDER) };
    const generator = new ColorThemeGenerator(paths);
    this.mix ??= colorThemeService.mix();
    const mix: ColorMix = { ...this.mix, accent: isDefaultAccent(normalizeAccent(accent)) ? undefined : normalizeAccent(accent) };

    const patches: Blocks = {};
    for (const info of COLOR_THEMES) {
      let current: Record<string, string> = {};
      try {
        current = (JSON.parse(readFileSync(join(paths.dist, info.file), 'utf8')) as { colors?: Record<string, string> }).colors ?? {};
      } catch {
        // no theme file yet: everything is new
      }
      const changed = changedColors(current, generator.createTheme(info, mix).colors);
      if (Object.keys(changed).length > 0) patches[themeBlock(info.label)] = changed;
    }
    return patches;
  }

  private state(): PreviewState {
    const stored = this.memento?.get<PreviewState>(STATE_KEY);
    return isRecord(stored) && isRecord(stored.original) && isRecord(stored.written) ? stored : EMPTY_STATE;
  }

  private async saveState(state?: PreviewState) {
    await this.memento?.update(STATE_KEY, state);
  }

  private async write(patches: Blocks) {
    const config = workspace.getConfiguration('workbench');
    const current = config.inspect<Record<string, unknown>>(SETTING)?.globalValue;
    const { customizations, state } = applyPreview(current, this.state(), patches);
    await this.saveState(Object.keys(state.written).length > 0 || state.accepted ? state : undefined);
    await config.update(SETTING, customizations, ConfigurationTarget.Global);
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task).catch((error: unknown) => logger.error(`Accent preview: ${String(error)}`));
    return this.queue;
  }
}

export const accentPreviewService = new AccentPreviewService();

export type { Blocks, PreviewState };
