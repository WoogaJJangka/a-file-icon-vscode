import { join } from 'node:path';
import i18next from 'i18next';
import { writeFileAtomic } from 'src/helpers/fsUtils';
import { isCancellation, isValidHexColorCode } from 'src/helpers/utils';
import { getExtensionPath } from 'src/helpers/vscodeUtils';
import { accentPreviewService } from 'src/services/AccentPreviewService';
import { configService } from 'src/services/ConfigService';
import { logger } from 'src/services/LoggingService';
import { ACCENT_PRESETS, DEFAULT_ACCENT, normalizeAccent } from 'src/themes/accent';
import { COLOR_THEMES } from 'src/themes/colorThemes';
import { QuickPickItemKind, Uri, window, workspace } from 'vscode';

import type { AccentPreviewService } from 'src/services/AccentPreviewService';
import type { QuickPickItem } from 'vscode';

/** An item of the picker: a color to show, or the input of a color */
type AccentItem = QuickPickItem & { color?: string; custom?: boolean };

/** Moving through the list with the arrow keys shows the accent once the user stops on it */
const PREVIEW_DELAY = 120;

/**
 * The icon of a color in the picker: a dot, written once to `dist/accents/<rrggbb>.svg` (VS Code shows a QuickPick icon
 * from a file only)
 */
export const accentIcon = (distributionFolder: string, color: string): Uri => {
  const path = join(distributionFolder, 'accents', `${color.slice(1)}.svg`);
  writeFileAtomic(
    path,
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="${color}" stroke="#808080" stroke-opacity="0.6"/></svg>\n`,
  );
  return Uri.file(path);
};

/** The items: the named accents (the current one marked), the input of another color, and the way back to the blue */
export const accentItems = (current: string, icon: (color: string) => Uri | undefined): AccentItem[] => {
  const isPreset = ACCENT_PRESETS.some((preset) => preset.color === current);
  const item = (color: string, label: string, detail?: string): AccentItem => ({
    color,
    description: color === current ? `${color} · ${i18next.t('accent.current')}` : color,
    ...(detail ? { detail } : {}),
    iconPath: icon(color),
    label,
  });
  return [
    { kind: QuickPickItemKind.Separator, label: i18next.t('accent.presets') },
    ...ACCENT_PRESETS.map((preset) => item(preset.color, i18next.t(`accent.preset.${preset.id}`), preset.source)),
    { kind: QuickPickItemKind.Separator, label: '' },
    ...(isPreset ? [] : [item(current, current)]),
    { custom: true, detail: i18next.t('accent.customDetail'), label: `$(edit) ${i18next.t('accent.custom')}` },
    ...(current === DEFAULT_ACCENT ? [] : [{ color: DEFAULT_ACCENT, label: `$(discard) ${i18next.t('accent.reset')}` }]),
  ];
};

/**
 * The command `chooseAccentColor`: the named accents, each shown at once while the user stays on it
 * (`AccentPreviewService`); Enter keeps it, Escape goes back.
 */
export class AccentColorPicker {
  constructor(private readonly preview: AccentPreviewService = accentPreviewService) {}

  async open(): Promise<void> {
    const current = normalizeAccent(configService.accentColor) ?? DEFAULT_ACCENT;
    const selected = workspace.getConfiguration('workbench').get<string>('colorTheme');
    if (!COLOR_THEMES.some((info) => info.label === selected)) {
      window.showInformationMessage(i18next.t('accent.inactive')).then(undefined, (error: unknown) => {
        if (!isCancellation(error)) logger.error(String(error));
      });
    }

    const distributionFolder = join(getExtensionPath(), 'dist');
    const icon = (color: string) => {
      try {
        return accentIcon(distributionFolder, color);
      } catch (error) {
        // a read-only extension folder: the items have no dot
        logger.debug(`Accent icon: ${String(error)}`);
        return;
      }
    };

    const quickPick = window.createQuickPick<AccentItem>();
    quickPick.title = i18next.t('accent.title');
    quickPick.placeholder = i18next.t('accent.placeholder');
    quickPick.matchOnDescription = true;
    quickPick.items = accentItems(current, icon);
    const active = quickPick.items.find((item) => item.color === current && !item.label.startsWith('$('));
    if (active) quickPick.activeItems = [active];

    let previewTimer: NodeJS.Timeout | undefined;
    let shown: string | undefined = current;
    let done = false;

    const result = new Promise<AccentItem | void>((resolve) => {
      quickPick.onDidChangeActive(([item]) => {
        clearTimeout(previewTimer);
        if (!item?.color || item.color === shown) return;
        const color = item.color;
        previewTimer = setTimeout(() => {
          shown = color;
          this.preview.show(color).then(undefined, (error: unknown) => logger.error(String(error)));
        }, PREVIEW_DELAY);
      });
      quickPick.onDidAccept(() => {
        done = true;
        resolve(quickPick.selectedItems[0] ?? quickPick.activeItems[0]);
        quickPick.hide();
      });
      quickPick.onDidHide(() => {
        clearTimeout(previewTimer);
        if (!done) resolve();
      });
    });
    quickPick.show();

    const picked = await result;
    quickPick.dispose();

    if (picked?.custom) {
      await this.custom(current === DEFAULT_ACCENT ? '' : current);
      return;
    }
    if (picked?.color) {
      await this.preview.accept(picked.color);
      return;
    }
    if (this.preview.isPending) await this.preview.cancel();
  }

  /** Another color, typed: shown at once when it is one */
  private async custom(value: string) {
    let shown: string | undefined;
    const color = await window.showInputBox({
      placeHolder: i18next.t('folders.hexCode'),
      prompt: i18next.t('accent.customDetail'),
      validateInput: (input) => {
        if (!isValidHexColorCode(input.trim())) return i18next.t('folders.wrongHexCode');
        const accent = normalizeAccent(input);
        if (accent && accent !== shown) {
          shown = accent;
          this.preview.show(accent).then(undefined, (error: unknown) => logger.error(String(error)));
        }
        return;
      },
      value,
    });
    const accent = normalizeAccent(color);
    if (accent) await this.preview.accept(accent);
    else if (this.preview.isPending) await this.preview.cancel();
  }
}

export const accentColorPicker = new AccentColorPicker();
