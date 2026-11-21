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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { COLOR_THEMES } from 'src/themes/colorThemes';
import { resolveScheme } from 'src/themes/jetbrainsTheme';

import { loadTheme, loadVsCodeGrammars, root, textMateTheme, tokenize, VSCODE_VERSION } from './vscodeGrammars';

import type { SampleExpectations, SchemeChain } from 'src/themes/colorCheck';

/** Scopes of grammars VS Code does not bundle, which some token rules are written for (TOML: Even Better TOML) */
const EXTERNAL_SCOPES = ['.toml'];

const cliArguments = process.argv.slice(2);
const report = cliArguments.includes('--report');
const version = cliArguments.includes('--vscode') ? cliArguments[cliArguments.indexOf('--vscode') + 1] : VSCODE_VERSION;

const main = async () => {
  console.log(`VS Code ${version}`);
  const { contributions, registry } = await loadVsCodeGrammars(version);

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
        const expected = expectedStyle(scheme, expectation.key, expectation.under, undefined, expectation.layers);
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
  // The TextMate rules (textMateTheme.ts) are written for every TextMate language, whether its grammar has the scope or not
  const ownRules = rules.filter((rule) => !rule.name.startsWith('TextMate '));
  const missing = missingRuleScopes(ownRules, [...new Set([...scopesByGrammar.values()].flat())], EXTERNAL_SCOPES);
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
