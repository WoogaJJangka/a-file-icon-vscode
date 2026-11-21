/**
 * The numbers of docs/THEME_COMBINATIONS.md: for each preset of `src/presets/presets.ts`, the contrast of the main
 * syntax colors of the mixed Cool Islands theme on its editor background, and how many names an icon layer adds.
 *
 * `bun run analyze:presets [--extensions <folder>]`: the extensions of the presets are installed, with the CLI of a
 * VS Code of `.vscode-test`, into `.vscode-test/preset-extensions` (an isolated folder: never the user's own
 * extensions), then read like the extension reads them. Run `bun run build` first (the generated icon theme is read).
 * Prints Markdown.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSON_FILE_NAME } from 'src/helpers/constants';
import { PRESETS } from 'src/presets/presets';
import { contrastRatio } from 'src/themes/accent';
import { normalizeColorLayers, tokenStyleFor } from 'src/themes/colorLayers';
import { ColorThemeGenerator, kindOf } from 'src/themes/ColorThemeGenerator';
import { COLOR_THEMES, THEMES_FOLDER } from 'src/themes/colorThemes';
import { readColorTheme } from 'src/themes/readColorTheme';

import type { ColorThemeData, MixedTheme } from 'src/themes/colorLayers';

const root = join(__dirname, '..', '..', '..');
const cliArguments = process.argv.slice(2);
const extensionsArgument = cliArguments.indexOf('--extensions');
const extensionsFolder = extensionsArgument === -1 ? join(root, '.vscode-test', 'preset-extensions') : cliArguments[extensionsArgument + 1];

/** The syntax colors compared, as TextMate scopes of Python (the language of the PyCharm look), with their WCAG goal */
const TOKENS: Array<{ goal: number; name: string; scope: string }> = [
  { goal: 4.5, name: 'keyword', scope: 'keyword.control.flow.python' },
  { goal: 4.5, name: 'string', scope: 'string.quoted.single.python' },
  { goal: 4.5, name: 'number', scope: 'constant.numeric.dec.python' },
  { goal: 4.5, name: 'function', scope: 'entity.name.function.python' },
  { goal: 4.5, name: 'class', scope: 'entity.name.type.class.python' },
  { goal: 4.5, name: 'parameter', scope: 'variable.parameter.function.language.python' },
  { goal: 3, name: 'comment', scope: 'comment.line.number-sign.python' },
];

/** Popular color themes looked at and not made presets: their syntax mixed into Cool Islands Dark, for comparison */
const CANDIDATES: Array<{ extension: string; theme: string }> = [
  { extension: 'enkia.tokyo-night', theme: 'Tokyo Night' },
  { extension: 'sdras.night-owl', theme: 'Night Owl' },
  { extension: 'github.github-vscode-theme', theme: 'GitHub Dark Default' },
];

/** The VS Code downloaded by the tests: its command line installs the extensions */
const vscodeCli = (): string => {
  const folders = [join(root, '.vscode-test'), join(root, '..', '..', '..', '.vscode-test')].filter((folder) => existsSync(folder));
  for (const folder of folders) {
    for (const entry of readdirSync(folder).filter((name) => name.startsWith('vscode-')).sort().reverse()) {
      const cli = join(folder, entry, 'bin', process.platform === 'win32' ? 'code.cmd' : 'code');
      if (existsSync(cli)) return cli;
    }
  }
  throw new Error('No VS Code in .vscode-test: run `bun run test:smoke` once');
};

const install = (ids: string[]) => {
  const installed = new Set(existsSync(extensionsFolder) ? readdirSync(extensionsFolder).map((name) => name.toLowerCase()) : []);
  const missing = ids.filter((id) => ![...installed].some((name) => name.startsWith(`${id.toLowerCase()}-`)));
  if (missing.length === 0) return;
  const cli = vscodeCli();
  const profile = mkdtempSync(join(tmpdir(), 'cool-presets-'));
  try {
    for (const id of missing) {
      const result = spawnSync(
        cli,
        [`--user-data-dir=${join(profile, 'user')}`, `--shared-data-dir=${join(profile, 'shared')}`, `--extensions-dir=${extensionsFolder}`, '--install-extension', id],
        { encoding: 'utf8', shell: process.platform === 'win32' },
      );
      if (result.status !== 0) throw new Error(`Could not install ${id}: ${result.stderr}`);
    }
  } finally {
    rmSync(profile, { force: true, recursive: true });
  }
};

type Contributed = { id?: string; label?: string; path: string; uiTheme?: string };
type Extension = { folder: string; manifest: { contributes?: { iconThemes?: Contributed[]; themes?: Contributed[] } } };

const extensions = (): Extension[] =>
  readdirSync(extensionsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(extensionsFolder, entry.name))
    .filter((folder) => existsSync(join(folder, 'package.json')))
    .map((folder) => ({ folder, manifest: JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')) }));

const colorTheme = (id: string): ColorThemeData | undefined => {
  for (const { folder, manifest } of extensions()) {
    const theme = manifest.contributes?.themes?.find((item) => (item.id ?? item.label) === id);
    if (theme) return readColorTheme({ extensionPath: folder, path: join(folder, theme.path), uiTheme: theme.uiTheme ?? 'vs-dark' });
  }
  return undefined;
};

type IconJson = Record<string, unknown> & { fileExtensions?: object; fileNames?: object; folderNames?: object; languageIds?: object };

const iconTheme = (id: string): IconJson | undefined => {
  for (const { folder, manifest } of extensions()) {
    const theme = manifest.contributes?.iconThemes?.find((item) => item.id === id);
    if (theme) return JSON.parse(readFileSync(join(folder, theme.path), 'utf8')) as IconJson;
  }
  return undefined;
};

const hex = (value: string) => {
  const rgb = Number.parseInt(value.slice(1, 7), 16);
  return { b: rgb & 255, g: (rgb >> 8) & 255, r: (rgb >> 16) & 255 };
};

/** The names an icon theme gives an icon to that Cool Icons has none for: what a `fill` layer adds */
const iconFill = (id: string) => {
  const ours = JSON.parse(readFileSync(join(root, 'dist', JSON_FILE_NAME), 'utf8')) as IconJson;
  const theirs = iconTheme(id);
  if (!theirs) return;
  const count = (map: 'fileExtensions' | 'fileNames' | 'folderNames') => {
    const known = new Set(Object.keys(ours[map] ?? {}).map((key) => key.toLowerCase()));
    return Object.keys(theirs[map] ?? {}).filter((key) => !known.has(key.toLowerCase())).length;
  };
  return { extensions: count('fileExtensions'), files: count('fileNames'), folders: count('folderNames') };
};

const main = () => {
  install([...new Set([...PRESETS.flatMap((preset) => preset.extensions), ...CANDIDATES.map((candidate) => candidate.extension)])]);
  const generator = new ColorThemeGenerator({ dist: join(root, 'dist'), themes: join(root, THEMES_FOLDER) });

  console.log(`| preset | theme | ${TOKENS.map((token) => token.name).join(' | ')} | below goal |`);
  console.log(`|---|---|${TOKENS.map(() => '---:').join('|')}|---:|`);
  const rows = [
    ...PRESETS.map((preset) => ({ id: preset.id, settings: preset.settings })),
    ...CANDIDATES.map((candidate) => ({
      id: `(${candidate.theme} syntax)`,
      settings: {
        'a-file-icon-vscode.colorThemeLayers': [{ syntax: 'override', theme: candidate.theme, ui: 'off' }],
        'workbench.colorTheme': COLOR_THEMES[0].label,
      } as Record<string, unknown>,
    })),
  ];
  for (const preset of rows) {
    const selected = preset.settings['workbench.colorTheme'];
    const info = COLOR_THEMES.find((item) => item.label === selected);
    if (!info) continue;
    const layers: MixedTheme[] = normalizeColorLayers(preset.settings['a-file-icon-vscode.colorThemeLayers'] ?? []).flatMap((layer) => {
      const data = colorTheme(layer.theme);
      return data ? [{ data, layer }] : [];
    });
    const accent = preset.settings['a-file-icon-vscode.accentColor'];
    const theme = generator.createTheme(info, {
      accent: typeof accent === 'string' ? accent : undefined,
      byKey: [],
      layers,
    });
    const background = hex(theme.colors['editor.background']);
    let below = 0;
    const cells = TOKENS.map((token) => {
      const foreground = tokenStyleFor(theme.tokenColors, token.scope)?.foreground ?? theme.colors['editor.foreground'];
      const ratio = contrastRatio(hex(foreground), background);
      if (ratio < token.goal) below += 1;
      return `${ratio.toFixed(1)}${ratio < token.goal ? ' ⚠' : ''}`;
    });
    console.log(`| ${preset.id} | ${info.label} (${kindOf(info)}) | ${cells.join(' | ')} | ${below} |`);
  }

  console.log('\n| layer theme | kind | file names | extensions | folder names |');
  console.log('|---|---|---:|---:|---:|');
  const iconLayers = new Set(['material-icon-theme', 'vscode-icons', 'catppuccin-mocha']);
  for (const id of iconLayers) {
    const fill = iconFill(id);
    console.log(fill ? `| ${id} | icons | ${fill.files} | ${fill.extensions} | ${fill.folders} |` : `| ${id} | icons | – | – | – |`);
  }

  console.log('\n| color theme | kind | editor.background | sideBar.background |');
  console.log('|---|---|---|---|');
  for (const id of ['One Dark Pro', 'Catppuccin Mocha', 'GitHub Dark Default', 'Dracula Theme', 'Tokyo Night', 'Night Owl']) {
    const data = colorTheme(id);
    if (data) console.log(`| ${id} | ${data.kind} | ${data.colors['editor.background'] ?? '–'} | ${data.colors['sideBar.background'] ?? '–'} |`);
  }
};

main();
