/**
 * Check that the Cool Islands themes color code like the JetBrains IDE (src/themes/colorCheck.ts).
 * The samples of test/colors are split into tokens with the grammars of a real VS Code (downloaded into .vscode-test,
 * like the smoke tests) and vscode-textmate, the tokenizer of VS Code, with the token rules of themes/*.base.json.
 * Semantic tokens (language servers) are not checked: they need the language server.
 *
 * Usage: bun run check:colors                 every expectation, both themes; fails on a difference
 *        bun run check:colors -- --report     also every token of the samples (scopes, color, rule) and, for each
 *                                              grammar, the scopes no rule colors
 *        bun run check:colors -- --vscode 1.95.0   another VS Code (default: VSCODE_VERSION)
 */
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma';
import { INITIAL, parseRawGrammar, Registry } from 'vscode-textmate';
import {
  ATTRIBUTES_FILE,
  compareStyles,
  decodeStyle,
  describeStyle,
  expectedStyle,
  grammarScopes,
  missingRuleScopes,
  SAMPLES_FOLDER,
  tokensOf,
  uncoloredScopes,
  winningRule,
} from 'src/themes/colorCheck';
import { COLOR_THEMES, extensionRoot, THEMES_FOLDER } from 'src/themes/colorThemes';
import { resolveScheme } from 'src/themes/jetbrainsTheme';

import type { LineToken, SampleExpectations, SchemeChain } from 'src/themes/colorCheck';
import type { VsCodeColorTheme } from 'src/themes/convertJetbrainsTheme';
import type { IGrammar, IRawGrammar } from 'vscode-textmate';

/** The VS Code whose grammars are checked: move it with the grammars (a newer grammar can change scopes) */
const VSCODE_VERSION = '1.147.0';

/** Scopes of grammars VS Code does not bundle, which some token rules are written for (TOML: Even Better TOML) */
const EXTERNAL_SCOPES = ['.toml'];

type Contribution = { injectTo?: string[]; path: string; scopeName: string };

const root = extensionRoot(__dirname);
const cliArguments = process.argv.slice(2);
const report = cliArguments.includes('--report');
const version = cliArguments.includes('--vscode') ? cliArguments[cliArguments.indexOf('--vscode') + 1] : VSCODE_VERSION;

/** The `extensions` folder of the downloaded VS Code (resources/app/extensions, one level down on newer Windows builds) */
const findExtensionsFolder = (executable: string): string => {
  const candidates = [dirname(executable), join(dirname(executable), '..', 'Resources')];
  for (const start of candidates) {
    for (const folder of [start, ...(existsSync(start) ? readdirSync(start).map((entry) => join(start, entry)) : [])]) {
      const extensions = join(folder, 'resources', 'app', 'extensions');
      if (existsSync(extensions)) return extensions;
      const mac = join(folder, 'app', 'extensions');
      if (existsSync(mac)) return mac;
    }
  }
  throw new Error(`No resources/app/extensions next to ${executable}`);
};

const readGrammars = (extensions: string): Contribution[] =>
  readdirSync(extensions).flatMap((name) => {
    const manifest = join(extensions, name, 'package.json');
    if (!existsSync(manifest)) return [];
    const json = JSON.parse(readFileSync(manifest, 'utf8')) as { contributes?: { grammars?: Contribution[] } };
    return (json.contributes?.grammars ?? []).map((grammar) => ({ ...grammar, path: join(extensions, name, grammar.path) }));
  });

const loadTheme = (file: string) => JSON.parse(readFileSync(join(root, THEMES_FOLDER, file), 'utf8')) as VsCodeColorTheme;

/** The theme as VS Code hands it to the tokenizer: the editor colors as the default rule, then the token rules */
const textMateTheme = (theme: VsCodeColorTheme) => ({
  name: theme.name,
  settings: [
    { settings: { background: theme.colors['editor.background'], foreground: theme.colors['editor.foreground'] } },
    ...theme.tokenColors.map((rule) => ({ name: rule.name, scope: rule.scope, settings: rule.settings })),
  ],
});

const tokenize = (grammar: IGrammar, text: string): Array<{ line: string; tokens: LineToken[] }> => {
  let state = INITIAL;
  return text.split(/\r?\n/).map((line) => {
    const scoped = grammar.tokenizeLine(line, state);
    const encoded = grammar.tokenizeLine2(line, state);
    state = encoded.ruleStack;
    const tokens: LineToken[] = [];
    for (let index = 0; index < encoded.tokens.length; index += 2) {
      const start = encoded.tokens[index];
      const end = index + 2 < encoded.tokens.length ? encoded.tokens[index + 2] : line.length;
      // The scopes of the first token of the plain tokenizer that starts here (both split at the same places or finer)
      const scopes = scoped.tokens.find((token) => token.startIndex <= start && token.endIndex > start)?.scopes ?? [];
      tokens.push({ end, metadata: encoded.tokens[index + 1], scopes, start });
    }
    return { line, tokens };
  });
};

const main = async () => {
  console.log(`VS Code ${version}`);
  const executable = await downloadAndUnzipVSCode(version);
  const contributions = readGrammars(findExtensionsFolder(executable));
  const byScope = new Map(contributions.map((grammar) => [grammar.scopeName, grammar]));

  const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new Registry({
    getInjections: (scopeName) => contributions.filter((grammar) => grammar.injectTo?.includes(scopeName)).map((grammar) => grammar.scopeName),
    loadGrammar: async (scopeName): Promise<IRawGrammar | null> => {
      const grammar = byScope.get(scopeName);
      return grammar ? parseRawGrammar(readFileSync(grammar.path, 'utf8'), grammar.path) : null;
    },
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
  });

  const allAttributes = JSON.parse(readFileSync(join(root, ATTRIBUTES_FILE), 'utf8')) as Record<string, SchemeChain>;
  const samplesFolder = join(root, SAMPLES_FOLDER);
  const samples = readdirSync(samplesFolder)
    .filter((file) => file.endsWith('.expect.json'))
    .map((file) => JSON.parse(readFileSync(join(samplesFolder, file), 'utf8')) as SampleExpectations);

  let failures = 0;
  let todos = 0;
  /** Expectations marked todo, and the ones of them that still differ in a theme: a todo that differs in none is stale */
  const todoChecked = new Set<string>();
  const todoFailed = new Set<string>();
  let checked = 0;
  for (const info of COLOR_THEMES) {
    const theme = loadTheme(info.base);
    const chain = allAttributes[info.label];
    if (!chain) throw new Error(`${ATTRIBUTES_FILE} has no ${info.label}: run bun run sync:colors`);
    const scheme = resolveScheme(chain.schemes, chain.scheme, chain.additional);
    registry.setTheme(textMateTheme(theme));
    const colorMap = registry.getColorMap();
    console.log(`\n${info.label}`);

    for (const sample of samples) {
      const grammar = await registry.loadGrammar(sample.scope);
      if (!grammar) throw new Error(`${sample.file}: VS Code ${version} has no grammar ${sample.scope}`);
      const lines = tokenize(grammar, readFileSync(join(samplesFolder, sample.file), 'utf8'));

      for (const expectation of sample.tokens) {
        const where = `${sample.file}:${expectation.line} "${expectation.text}"`;
        const line = lines[expectation.line - 1];
        const tokens = line ? tokensOf(line.line, line.tokens, expectation.text, expectation.nth) : undefined;
        const expected = expectedStyle(scheme, expectation.key, expectation.under);
        if (!tokens || tokens.length === 0) throw new Error(`${where}: not on that line`);
        if (!expected) throw new Error(`${where}: the scheme has neither ${expectation.key} nor a fallback of it (KEY_FALLBACKS)`);
        checked++;
        const problem = compareStyles(expected, tokens.map((token) => decodeStyle(token.metadata, colorMap)));
        if (expectation.todo) todoChecked.add(where);
        if (!problem) continue;
        const scopes = tokens.map((token) => token.scopes.at(-1)).join(' + ');
        if (expectation.todo) {
          todos++;
          todoFailed.add(where);
          console.log(`  todo  ${where} (${expectation.key}): ${problem} [${scopes}] — ${expectation.todo}`);
        } else {
          failures++;
          console.log(`  FAIL  ${where} (${expectation.key}): ${problem} [${scopes}]`);
        }
      }

      if (report) {
        console.log(`  -- ${sample.file}`);
        for (const [index, { line, tokens }] of lines.entries()) {
          for (const token of tokens) {
            const text = line.slice(token.start, token.end);
            if (!text.trim()) continue;
            const rule = winningRule(theme.tokenColors, token.scopes) ?? '(editor text)';
            const style = describeStyle(decodeStyle(token.metadata, colorMap));
            console.log(`     ${index + 1}: ${JSON.stringify(text)} ${style} ${rule} [${token.scopes.slice(1).join(' ')}]`);
          }
        }
      }
    }
  }

  // Scopes: what the rules name and the grammars do not have, and what the grammars have and no rule colors
  const scopesByGrammar = new Map(contributions.map((grammar) => [grammar.scopeName, grammarScopes(readFileSync(grammar.path, 'utf8'))]));
  const rules = loadTheme(COLOR_THEMES[0].base).tokenColors;
  const missing = missingRuleScopes(rules, [...new Set([...scopesByGrammar.values()].flat())], EXTERNAL_SCOPES);
  if (missing.length > 0) console.log(`\nRule scopes no grammar of VS Code ${version} has (typo, or another extension's grammar):\n  ${missing.join('\n  ')}`);
  if (report) {
    console.log('\nScopes no rule colors, by grammar:');
    for (const [scopeName, scopes] of scopesByGrammar) {
      const uncolored = uncoloredScopes(rules, scopes);
      if (uncolored.length > 0) console.log(`  ${scopeName} (${uncolored.length}/${scopes.length}): ${uncolored.join(' ')}`);
    }
  }

  const stale = [...todoChecked].filter((where) => !todoFailed.has(where));
  for (const where of stale) console.log(`  FIXED ${where}: matches the IDE in both themes, remove its todo`);
  failures += stale.length;
  console.log(`\n${checked} checks, ${failures} differences, ${todos} known differences (todo)`);
  if (failures > 0) process.exitCode = 1;
};

// ts-node runs the scripts as CommonJS, which has no top-level await
// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
