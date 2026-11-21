/**
 * Build a VS Code color theme from a resolved JetBrains UI theme and editor color scheme, with the hand-kept maps.
 */
import { SEMANTIC_RULES, TOKEN_RULES } from './jetbrainsTokenMap';
import { UI_MAP } from './jetbrainsUiMap';

import type { ResolvedScheme, ResolvedUiTheme, TextAttributes } from './jetbrainsTheme';
import type { ColorSource } from './jetbrainsUiMap';
import type { TokenRule } from './jetbrainsTokenMap';

type Maps = { semantic?: Record<string, string[]>; tokens?: TokenRule[]; ui?: Record<string, ColorSource[]> };

const ATTRIBUTE_FIELDS: Record<string, keyof TextAttributes> = {
  bg: 'background',
  effect: 'effectColor',
  fg: 'foreground',
  stripe: 'errorStripe',
};

const UNDERLINED = new Set([1, 4]);
const STRIKEOUT = 3;

const styleOf = (attributes: TextAttributes): SemanticStyle => ({
  bold: Boolean((attributes.fontType ?? 0) & 1),
  italic: Boolean((attributes.fontType ?? 0) & 2),
  strikethrough: attributes.effectType === STRIKEOUT,
  underline: attributes.effectType !== undefined && UNDERLINED.has(attributes.effectType),
});

/**
 * Syntax: the font style of the first attributes found for the keys, the color of the first ones with a color (a key
 * without one shows the layer under it). `undefined` when the scheme defines none of the keys.
 */
const textStyle = (lookup: (keys: string[]) => TextAttributes[], keys: string[]): SemanticStyle | undefined => {
  const defined = lookup(keys);
  if (defined.length === 0) return undefined;
  const style = styleOf(defined[0]);
  const foreground = defined.find((value) => value.foreground)?.foreground;
  return foreground ? { ...style, foreground } : style;
};

const fontStyle = (style: SemanticStyle) =>
  (['italic', 'bold', 'underline', 'strikethrough'] as const).filter((key) => style[key]).join(' ');

export type TokenColor = { name: string; scope: string[]; settings: { fontStyle?: string; foreground?: string } };
export type SemanticStyle = {
  bold?: boolean;
  foreground?: string;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
};

export type VsCodeColorTheme = {
  $schema: string;
  colors: Record<string, string>;
  name: string;
  semanticHighlighting: boolean;
  semanticTokenColors: Record<string, SemanticStyle>;
  tokenColors: TokenColor[];
  type: 'dark' | 'light';
};

export type ConversionResult = {
  theme: VsCodeColorTheme;
  /** Map entries that got no value (VS Code default) */
  unresolved: string[];
};

export const convertJetbrainsTheme = (
  name: string,
  ui: ResolvedUiTheme,
  scheme: ResolvedScheme,
  maps: Maps = {},
): ConversionResult => {
  const uiMap = maps.ui ?? UI_MAP;
  const unresolved: string[] = [];

  // Workbench colors, with `=id` references resolved on demand
  const colors: Record<string, string> = {};
  const done = new Set<string>();
  const resolveId = (id: string, stack: string[] = []): string | undefined => {
    if (done.has(id)) return colors[id];
    if (stack.includes(id)) throw new Error(`Color reference loop: ${[...stack, id].join(' -> ')}`);
    const sources = uiMap[id];
    if (!sources) throw new Error(`Unknown color reference: ${id}`);
    let value: string | undefined;
    for (const source of sources) {
      value = resolveSource(source, [...stack, id]);
      if (value) break;
    }
    done.add(id);
    if (value) colors[id] = value;
    return value;
  };
  const resolveSource = (source: ColorSource, stack: string[]): string | undefined => {
    if (source.startsWith('#')) return source.toLowerCase();
    if (source.startsWith('=')) return resolveId(source.slice(1), stack);
    const separator = source.indexOf(':');
    const kind = source.slice(0, separator);
    const key = source.slice(separator + 1);
    if (kind === 'ui') return ui.get(key);
    if (kind === 'color') return scheme.color(key);
    const field = ATTRIBUTE_FIELDS[kind];
    if (!field) throw new Error(`Unknown color source: ${source}`);
    const value = scheme.attributes(key)?.[field];
    return typeof value === 'string' ? value : undefined;
  };
  for (const id of Object.keys(uiMap)) {
    if (!resolveId(id)) unresolved.push(id);
  }

  // The keys of a rule one after the other, each looked up in the whole scheme chain. Not `scheme.lookup` (the order of
  // the IDE) yet: the `from` lists are hand-picked keys, not the fallback chains of the code, which that order needs
  // (`bun run check:colors` compares with the IDE order)
  const byKey = (keys: string[]) => keys.flatMap((key) => scheme.attributes(key) ?? []);

  const tokenColors: TokenColor[] = [];
  for (const rule of maps.tokens ?? TOKEN_RULES) {
    const style = textStyle(byKey, rule.from);
    if (!style) {
      unresolved.push(`token: ${rule.name}`);
      continue;
    }
    const settings: TokenColor['settings'] = { fontStyle: fontStyle(style) };
    if (style.foreground) settings.foreground = style.foreground;
    tokenColors.push({ name: rule.name, scope: rule.scope, settings });
  }

  const semanticTokenColors: Record<string, SemanticStyle> = {};
  for (const [selector, keys] of Object.entries(maps.semantic ?? SEMANTIC_RULES)) {
    const style = textStyle(byKey, keys);
    if (!style) {
      unresolved.push(`semantic: ${selector}`);
      continue;
    }
    semanticTokenColors[selector] = style;
  }

  return {
    theme: {
      $schema: 'vscode://schemas/color-theme',
      colors,
      name,
      semanticHighlighting: true,
      semanticTokenColors,
      tokenColors,
      type: ui.dark ? 'dark' : 'light',
    },
    unresolved,
  };
};

export { fontStyle, styleOf };
