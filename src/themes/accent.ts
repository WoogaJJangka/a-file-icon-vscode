/**
 * The accent color of Cool Islands: the blue of the JetBrains Islands themes (focus ring, buttons, links, active tab,
 * selection) which the setting `accentColor` replaces. Pure functions: the generator hands in the base theme colors.
 *
 * Two kinds of keys change, and only them (a list kept by hand, checked against both base themes by a unit test):
 *   - `ACCENT_SOLID`: Islands paints them with the accent itself -> exactly the chosen color.
 *   - `ACCENT_TINT`: Islands paints them with a color derived from the accent (the pale selection of the light theme, the
 *     dark navy of the selection of the dark one, links) -> the same lightness and opacity, the hue moved by the same
 *     angle as the accent and the saturation scaled by the same ratio, so each part keeps reading well in its theme.
 *
 * The setting `accentTargets` also paints, with the accent itself, the parts listed in `ACCENT_TARGET_KEYS` (and the
 * folder icons), which Islands leaves gray.
 *
 * Not touched, on purpose: the colors that only happen to be blue but mean something else — the git decorations and
 * gutter marks of modified files, the terminal ANSI blues, the debugger stack frame, the find match, the merge headers.
 */

/** The accent of the Islands themes (`focusBorder`, `button.background`), which the tints are measured from */
const DEFAULT_ACCENT = '#3871e1';

/**
 * The named accents of the picker and of the theme mixer: the Islands blue, then the accents of the Material themes
 * (`helpers/themes.ts`), one per hue, around the color wheel. The names are `accent.preset.<id>` in the locales, the
 * source is the theme the color comes from.
 */
const ACCENT_PRESETS: ReadonlyArray<{ color: string; id: string; source?: string }> = [
  { color: DEFAULT_ACCENT, id: 'islandsBlue' },
  { color: '#79cb60', id: 'green', source: 'GitHub' },
  { color: '#009688', id: 'teal', source: 'Material Oceanic' },
  { color: '#00bcd4', id: 'cyan', source: 'Material Lighter' },
  { color: '#84ffff', id: 'aqua', source: 'Material Deep Ocean' },
  { color: '#2979ff', id: 'blue', source: 'Atom One Dark' },
  { color: '#7e57c2', id: 'violet', source: 'Night Owl' },
  { color: '#ab47bc', id: 'purple', source: 'Material Palenight' },
  { color: '#d33682', id: 'magenta', source: 'Solarized Dark' },
  { color: '#ff79c5', id: 'pink', source: 'Dracula' },
  { color: '#f9826c', id: 'coral', source: 'GitHub Dark' },
  { color: '#ff9800', id: 'orange', source: 'Material Darker' },
  { color: '#ffd866', id: 'yellow', source: 'Monokai Pro' },
];

type AccentPreset = (typeof ACCENT_PRESETS)[number];

/** The parts the setting `accentTargets` also paints with the accent */
const ACCENT_TARGETS = ['controls', 'tabs', 'folders'] as const;

type AccentTarget = (typeof ACCENT_TARGETS)[number];

/**
 * The workbench colors of each target of `accentTargets` (`folders` is the folder icons: `ConfigService.getIconSettings`).
 * `alpha` is the opacity given to the accent: none keeps the one of Islands (the scrollbar is see-through), '' makes it
 * opaque (Islands hides the line of the active activity bar item with #00000000). Checked against both base themes by a
 * unit test. VS Code has no setting for the thickness of these lines: only their color changes.
 */
const ACCENT_TARGET_KEYS: Record<Exclude<AccentTarget, 'folders'>, ReadonlyArray<{ alpha?: string; key: string }>> = {
  controls: [
    { key: 'badge.background' },
    { key: 'checkbox.border' },
    { key: 'inputOption.activeBackground' },
    { key: 'scrollbarSlider.activeBackground' },
    { key: 'scrollbarSlider.background' },
    { key: 'scrollbarSlider.hoverBackground' },
  ],
  tabs: [
    { alpha: '', key: 'activityBar.activeBorder' },
    { alpha: '', key: 'panelTitle.activeBorder' },
    { alpha: '', key: 'tab.activeBorder' },
    { alpha: '80', key: 'tab.unfocusedActiveBorder' },
  ],
};

/** The text drawn on a key of a target, kept readable like the text on the accent */
const TARGET_FOREGROUNDS: Partial<Record<AccentTarget, Array<{ foreground: string; on: string }>>> = {
  controls: [{ foreground: 'badge.foreground', on: 'badge.background' }],
};

/** Painted with the accent itself */
const ACCENT_SOLID = [
  'activityBar.activeBackground',
  'button.background',
  'button.border',
  'button.hoverBackground',
  'editorWidget.resizeBorder',
  'focusBorder',
  'inputOption.activeBorder',
  'peekView.border',
  'progressBar.background',
  'sash.hoverBorder',
] as const;

/** Derived from the accent: keep the lightness and the opacity, move the hue, scale the saturation */
const ACCENT_TINT = [
  'activityBarBadge.background',
  'banner.background',
  'editor.inactiveSelectionBackground',
  'editor.selectionBackground',
  'editorLink.activeForeground',
  'editorSuggestWidget.focusHighlightForeground',
  'editorSuggestWidget.highlightForeground',
  'editorSuggestWidget.selectedBackground',
  'list.activeSelectionBackground',
  'list.focusHighlightForeground',
  'list.highlightForeground',
  'menu.selectionBackground',
  'notificationLink.foreground',
  'panelTitle.activeBorder',
  'quickInputList.focusBackground',
  'selection.background',
  'tab.activeBackground',
  'tab.activeBorder',
  'terminal.selectionBackground',
  'textLink.activeForeground',
  'textLink.foreground',
] as const;

/** The tints that are text on the editor background: they also keep their contrast */
const ACCENT_TEXT = [
  'editorLink.activeForeground',
  'editorSuggestWidget.focusHighlightForeground',
  'editorSuggestWidget.highlightForeground',
  'list.focusHighlightForeground',
  'list.highlightForeground',
  'notificationLink.foreground',
  'textLink.activeForeground',
  'textLink.foreground',
] as const;

/** Text drawn on the accent: kept if it stays readable, else pure black or white (the best of the two always reaches 4.5:1) */
const ACCENT_FOREGROUNDS: Array<{ foreground: string; on: string }> = [
  { foreground: 'button.foreground', on: 'button.background' },
  { foreground: 'activityBarBadge.foreground', on: 'activityBarBadge.background' },
];

const MIN_CONTRAST = 4.5;
const DARK_TEXT = '#000000';
const LIGHT_TEXT = '#ffffff';

type Rgb = { b: number; g: number; r: number };
type Hsl = { h: number; l: number; s: number };
type Color = { alpha: string; rgb: Rgb };

const HEX = /^#([\dA-Fa-f]{3,4}|[\dA-Fa-f]{6}|[\dA-Fa-f]{8})$/;

/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` -> its parts, the opacity as the two digits it had ('' for opaque) */
const parseColor = (value: string): Color | undefined => {
  const match = HEX.exec(value.trim());
  if (!match) return undefined;
  const digits = match[1].length <= 4 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  const value24 = Number.parseInt(digits.slice(0, 6), 16);
  const alpha = digits.length === 8 ? digits.slice(6).toLowerCase() : '';
  return { alpha: alpha === 'ff' ? '' : alpha, rgb: { b: value24 & 255, g: (value24 >> 8) & 255, r: (value24 >> 16) & 255 } };
};

const toHex = ({ b, g, r }: Rgb, alpha = '') =>
  `#${[r, g, b].map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}${alpha}`;

const toHsl = ({ b, g, r }: Rgb): Hsl => {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, l, s: 0 };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return { h: (h * 60 + 360) % 360, l, s };
};

const toRgb = ({ h, l, s }: Hsl): Rgb => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const sector = Math.floor((((h % 360) + 360) % 360) / 60);
  const [r, g, b] = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][sector];
  return { b: (b + m) * 255, g: (g + m) * 255, r: (r + m) * 255 };
};

/** WCAG relative luminance */
const luminance = ({ b, g, r }: Rgb) => {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** WCAG contrast ratio of two opaque colors */
const contrastRatio = (first: Rgb, second: Rgb) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

/** The color moved in lightness, away from the background, until it has the contrast (the hue and saturation stay) */
const readable = (color: Hsl, background: Rgb, contrast: number): Hsl => {
  const step = luminance(background) > 0.5 ? -0.01 : 0.01;
  let result = color;
  for (let index = 0; index < 100 && contrastRatio(toRgb(result), background) < contrast; index++) {
    result = { ...result, l: Math.min(1, Math.max(0, result.l + step)) };
  }
  return result;
};

/** Pure black or white, whichever reads better on the color (the best of the two always reaches 4.5:1) */
const readableText = (background: Rgb) =>
  contrastRatio(parseColor(DARK_TEXT)!.rgb, background) >= contrastRatio(parseColor(LIGHT_TEXT)!.rgb, background) ? DARK_TEXT : LIGHT_TEXT;

/** The colors of the targets of `accentTargets` painted with the accent, and the text on them kept readable */
const targetColors = (colors: Record<string, string>, accent: Rgb, targets: readonly AccentTarget[]) => {
  const result: Record<string, string> = {};
  for (const target of targets) {
    if (target === 'folders') continue;
    for (const { alpha, key } of ACCENT_TARGET_KEYS[target]) {
      const color = colors[key] === undefined ? undefined : parseColor(colors[key]);
      if (color) result[key] = toHex(accent, alpha ?? color.alpha);
    }
    for (const { foreground, on } of TARGET_FOREGROUNDS[target] ?? []) {
      const background = result[on] === undefined ? undefined : parseColor(result[on]);
      if (!background || background.alpha) continue;
      const text = colors[foreground] === undefined ? undefined : parseColor(colors[foreground]);
      if (text && contrastRatio(text.rgb, background.rgb) >= MIN_CONTRAST) continue;
      result[foreground] = readableText(background.rgb);
    }
  }
  return result;
};

/** The setting `accentTargets`: the known targets, each once, in the order of {@link ACCENT_TARGETS} */
export const normalizeAccentTargets = (value: unknown): AccentTarget[] =>
  Array.isArray(value) ? ACCENT_TARGETS.filter((target) => value.includes(target)) : [];

/**
 * The accent of the setting as `#rrggbb` in lower case, or `undefined` when there is none or it is not a color.
 * The settings schema only takes `#rrggbb`; here `#rgb`, capitals and spaces around are tolerated, and an opacity is dropped.
 */
export const normalizeAccent = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const color = parseColor(value);
  return color ? toHex(color.rgb) : undefined;
};

/** Whether the accent is the one of the Islands themes, which leaves the theme as it is */
export const isDefaultAccent = (accent: string | undefined) => accent === undefined || accent === DEFAULT_ACCENT;

/**
 * The colors the accent changes, for the keys the base theme has.
 * The tints are measured from the colors of the base theme, never from the ones of a mixed-in theme.
 * @param base the workbench colors of a Cool Islands base theme
 * @param accent a value of `normalizeAccent`
 * @param targets the setting `accentTargets`, normalized
 */
export const accentColors = (
  base: Record<string, string>,
  accent: string,
  targets: readonly AccentTarget[] = [],
): Record<string, string> => {
  const chosen = parseColor(accent);
  if (!chosen) return {};
  // the Islands blue leaves the theme as it is, but the targets the user asked for still take it
  if (isDefaultAccent(accent)) return targetColors(base, chosen.rgb, targets);
  const reference = toHsl(parseColor(DEFAULT_ACCENT)!.rgb);
  const target = toHsl(chosen.rgb);
  const turn = target.h - reference.h;
  const scale = reference.s === 0 ? 1 : target.s / reference.s;
  const editorBackground = base['editor.background'] === undefined ? undefined : parseColor(base['editor.background'])?.rgb;

  const result: Record<string, string> = {};
  for (const key of ACCENT_SOLID) {
    const color = base[key] === undefined ? undefined : parseColor(base[key]);
    if (color) result[key] = toHex(chosen.rgb, color.alpha);
  }
  for (const key of ACCENT_TINT) {
    const color = base[key] === undefined ? undefined : parseColor(base[key]);
    if (!color) continue;
    const hsl = toHsl(color.rgb);
    let tinted: Hsl = { h: (((hsl.h + turn) % 360) + 360) % 360, l: hsl.l, s: Math.min(1, hsl.s * scale) };
    // Text in the color of the accent (links, the matched letters of a list) must stay as readable as the Islands blue,
    // or at least 4.5:1: a green of the same lightness looks much lighter than a blue, and a pale link on white is lost
    if (editorBackground && (ACCENT_TEXT as readonly string[]).includes(key)) {
      tinted = readable(tinted, editorBackground, Math.min(MIN_CONTRAST, contrastRatio(color.rgb, editorBackground)));
    }
    result[key] = toHex(toRgb(tinted), color.alpha);
  }

  // The targets take the accent itself, over its tint (the active tab line is a tint without them)
  Object.assign(result, targetColors({ ...base, ...result }, chosen.rgb, targets));

  // The text on the accent stays readable whatever the accent
  const colors = { ...base, ...result };
  for (const { foreground, on } of ACCENT_FOREGROUNDS) {
    const background = colors[on] === undefined ? undefined : parseColor(colors[on]);
    const text = colors[foreground] === undefined ? undefined : parseColor(colors[foreground]);
    if (!background) continue;
    if (text && contrastRatio(text.rgb, background.rgb) >= MIN_CONTRAST) continue;
    result[foreground] = readableText(background.rgb);
  }
  return result;
};

/**
 * The colors of `next` that differ from `current`: what a preview writes over the theme file. A color only `current`
 * has is left out: `workbench.colorCustomizations` cannot take a color away.
 */
export const changedColors = (current: Record<string, string>, next: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(next).filter(([key, value]) => current[key]?.toLowerCase() !== value.toLowerCase()));

export {
  ACCENT_PRESETS,
  ACCENT_SOLID,
  ACCENT_TARGET_KEYS,
  ACCENT_TARGETS,
  ACCENT_TEXT,
  ACCENT_TINT,
  contrastRatio,
  DEFAULT_ACCENT,
};
export type { AccentPreset, AccentTarget };
