import i18next from 'i18next';
import { PRESET_GROUPS, PRESET_SETTING_IDS, PRESETS } from 'src/presets/presets';
import { accentPreviewService } from 'src/services/AccentPreviewService';
import { logger } from 'src/services/LoggingService';
import { normalizeAccent } from 'src/themes/accent';
import { commands, ConfigurationTarget, extensions, QuickPickItemKind, window, workspace } from 'vscode';

import type { Preset } from 'src/presets/presets';
import type { AccentPreviewService } from 'src/services/AccentPreviewService';
import type { Memento, QuickPickItem } from 'vscode';

/**
 * The theme combinations (`presets/presets.ts`) of the command `choosePreset`. Nothing happens until the user picks one
 * (the kit is opt-in): installing the extension, or opening the picker and closing it, changes no setting.
 *
 * While the user stays on a preset, the theme ids VS Code switches at once are written (`workbench.colorTheme`, …) and
 * its accent is shown through `AccentPreviewService`; the layers of other themes are mixed in once it is chosen. Escape
 * puts the settings back. Choosing one asks first to install the extensions it needs, writes its settings to the user
 * settings, and keeps the values they had in globalState for `undoPreset`.
 */

const UNDO_KEY = 'presetUndo';
/** Moving through the list shows the preset the user stops on */
const PREVIEW_DELAY = 200;
/** The settings a preview changes at once: VS Code applies a new color, file icon or product icon theme without a reload */
const LIVE_SETTINGS = ['workbench.colorTheme', 'workbench.iconTheme', 'workbench.productIconTheme'];

/** The user value of each setting, `null` for none */
type Snapshot = Record<string, unknown>;
type UndoState = { preset: string; previous: Snapshot };

type PresetItem = QuickPickItem & { preset?: Preset };

const split = (id: string) => {
  const dot = id.lastIndexOf('.');
  return { key: id.slice(dot + 1), section: id.slice(0, dot) };
};

/** The user value of a setting (`null`: none) */
const userValue = (id: string): unknown => {
  const { key, section } = split(id);
  return workspace.getConfiguration(section).inspect(key)?.globalValue ?? null;
};

/** Write a user setting; `null` takes the user value away */
const writeSetting = async (id: string, value: unknown) => {
  const { key, section } = split(id);
  await workspace.getConfiguration(section).update(key, value ?? undefined, ConfigurationTarget.Global);
};

export const presetName = (preset: Preset) => i18next.t(`preset.${preset.id}.name`);

/** The extensions of the preset that are not installed */
export const missingExtensions = (preset: Preset): string[] =>
  preset.extensions.filter((id) => !extensions.all.some((extension) => extension.id.toLowerCase() === id.toLowerCase()));

/** The items of the picker: the presets by group, each with what it needs installed */
export const presetItems = (): PresetItem[] =>
  PRESET_GROUPS.flatMap((group) => {
    const presets = PRESETS.filter((preset) => preset.group === group);
    if (presets.length === 0) return [];
    return [
      { kind: QuickPickItemKind.Separator, label: i18next.t(`preset.group.${group}`) } as PresetItem,
      ...presets.map((preset): PresetItem => {
        const missing = missingExtensions(preset);
        return {
          description: missing.length > 0 ? `$(cloud-download) ${i18next.t('preset.needsInstall', { extensions: missing.join(', ') })}` : undefined,
          detail: i18next.t(`preset.${preset.id}.description`),
          label: presetName(preset),
          preset,
        };
      }),
    ];
  });

export class PresetService {
  private memento: Memento | undefined;

  constructor(private readonly accentPreview: AccentPreviewService = accentPreviewService) {}

  init(memento: Memento) {
    this.memento = memento;
  }

  /** The picker of the command `choosePreset` */
  async choose(): Promise<void> {
    const before: Snapshot = Object.fromEntries(PRESET_SETTING_IDS.map((id) => [id, userValue(id)]));
    const quickPick = window.createQuickPick<PresetItem>();
    quickPick.title = i18next.t('preset.title');
    quickPick.placeholder = i18next.t('preset.placeholder');
    quickPick.matchOnDetail = true;
    quickPick.items = presetItems();

    let previewTimer: NodeJS.Timeout | undefined;
    let previewed: Preset | undefined;
    let done = false;

    const picked = await new Promise<Preset | void>((resolve) => {
      quickPick.onDidChangeActive(([item]) => {
        clearTimeout(previewTimer);
        const preset = item?.preset;
        if (!preset || preset === previewed) return;
        previewTimer = setTimeout(() => {
          previewed = preset;
          this.preview(preset, before).catch((error: unknown) => logger.error(`Preset preview: ${String(error)}`));
        }, PREVIEW_DELAY);
      });
      quickPick.onDidAccept(() => {
        done = true;
        resolve((quickPick.selectedItems[0] ?? quickPick.activeItems[0])?.preset);
        quickPick.hide();
      });
      quickPick.onDidHide(() => {
        clearTimeout(previewTimer);
        if (!done) resolve();
      });
      quickPick.show();
    });
    quickPick.dispose();

    if (picked && (await this.apply(picked, before))) return;
    if (previewed) await this.restore(before);
  }

  /**
   * Show what VS Code can show at once: the themes of the kit it selects, and its accent
   * @param before the user values when the picker opened: a theme the preset does not select is the one of the user
   */
  async preview(preset: Preset, before: Snapshot) {
    for (const id of LIVE_SETTINGS) {
      const value = id in preset.settings ? preset.settings[id] : before[id];
      if (userValue(id) !== value) await writeSetting(id, value);
    }
    if ('a-file-icon-vscode.accentColor' in preset.settings) await this.accentPreview.show(normalizeAccent(preset.settings['a-file-icon-vscode.accentColor']));
    // a preset without an accent leaves the one of the user: the preview of the previous preset goes
    else if (this.accentPreview.isPending) await this.accentPreview.cancel();
  }

  /**
   * Install what the preset needs (asked first), write its settings and remember the ones they replace
   * @param before the user values when the picker opened, before any preview
   * @returns whether it was applied (no: the user did not want the extensions installed)
   */
  async apply(preset: Preset, before: Snapshot = Object.fromEntries(PRESET_SETTING_IDS.map((id) => [id, userValue(id)]))): Promise<boolean> {
    const missing = missingExtensions(preset);
    if (missing.length > 0) {
      const install = { title: i18next.t('preset.install') };
      const answer = await window.showInformationMessage(
        i18next.t('preset.installQuestion', { extensions: missing.join(', '), name: presetName(preset) }),
        { modal: true },
        install,
      );
      if (answer !== install) return false;
      for (const id of missing) await commands.executeCommand('workbench.extensions.installExtension', id);
    }

    const previous = Object.fromEntries(Object.keys(preset.settings).map((id) => [id, before[id] ?? null]));
    await this.memento?.update(UNDO_KEY, { preset: preset.id, previous } satisfies UndoState);
    for (const [id, value] of Object.entries(preset.settings)) {
      if (id === 'a-file-icon-vscode.accentColor') continue;
      await writeSetting(id, value);
    }
    // the accent through the preview: shown at once, and its colors leave the user settings on the next start
    if ('a-file-icon-vscode.accentColor' in preset.settings) await this.accentPreview.accept(normalizeAccent(preset.settings['a-file-icon-vscode.accentColor']));
    logger.info(`Preset ${preset.id} applied`);

    const reload = { title: i18next.t('colors.reloadWindow') };
    const undo = { title: i18next.t('preset.undo') };
    window.showInformationMessage(i18next.t('preset.applied', { name: presetName(preset) }), reload, undo).then(async (action) => {
      if (action === reload) await commands.executeCommand('workbench.action.reloadWindow');
      if (action === undo) await this.undo();
    }, (error: unknown) => logger.error(String(error)));
    return true;
  }

  /** Put back the settings the last preset replaced */
  async undo(): Promise<void> {
    const state = this.memento?.get<UndoState>(UNDO_KEY);
    if (!state) {
      window.showInformationMessage(i18next.t('preset.nothingToUndo'));
      return;
    }
    for (const [id, value] of Object.entries(state.previous)) {
      if (id === 'a-file-icon-vscode.accentColor') continue;
      await writeSetting(id, value);
    }
    if ('a-file-icon-vscode.accentColor' in state.previous) await this.accentPreview.accept(normalizeAccent(state.previous['a-file-icon-vscode.accentColor']));
    // eslint-disable-next-line unicorn/no-useless-undefined -- Memento.update takes the value, undefined removes the key
    await this.memento?.update(UNDO_KEY, undefined);
    const name = PRESETS.find((preset) => preset.id === state.preset);
    window.showInformationMessage(i18next.t('preset.undone', { name: name ? presetName(name) : state.preset }));
  }

  /** The picker closed after a preview: the theme ids and the accent go back */
  private async restore(before: Snapshot) {
    for (const id of LIVE_SETTINGS) {
      if (userValue(id) !== before[id]) await writeSetting(id, before[id]);
    }
    if (this.accentPreview.isPending) await this.accentPreview.cancel();
  }
}

export const presetService = new PresetService();
