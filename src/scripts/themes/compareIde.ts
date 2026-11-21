/**
 * Compare the Cool Islands themes with captures of the JetBrains IDEs, character by character.
 * A capture is what the IDE copies (Edit | Copy puts rich text on the clipboard): test/colors/ide/<sample>.<IDE>.<dark|light>.rtf,
 * <sample> a file of test/colors (its .expect.json gives the grammar). The colors are the ones the IDE draws, with the
 * IDE's semantic layers (not its inspections, nor the colors of plugins like rainbow brackets: take them from an IDE
 * without such plugins). To take one: open the sample in the IDE (Islands Dark or Islands Light), Edit | Select All, Edit |
 * Copy, then save the "Rich Text Format" of the clipboard (PowerShell -STA: [Windows.Forms.Clipboard]::GetData('Rich Text Format')).
 *
 * Usage: bun run compare:ide                    every capture; lists each difference (it does not fail)
 *        bun run compare:ide -- ruby php        only the captures whose name has one of these words
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodeStyle, describeStyle, SAMPLES_FOLDER, winningRule } from 'src/themes/colorCheck';
import { COLOR_THEMES } from 'src/themes/colorThemes';
import { parseRichText } from 'src/themes/richText';

import { loadTheme, loadVsCodeGrammars, root, textMateTheme, tokenize, VSCODE_VERSION } from './vscodeGrammars';

import type { SampleExpectations, TokenStyle } from 'src/themes/colorCheck';
import type { StyledChar } from 'src/themes/richText';

const CAPTURES_FOLDER = 'test/colors/ide';

const filters = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));

const ideStyle = (char: StyledChar): TokenStyle => ({
  fontStyle: [char.italic ? 'italic' : '', char.bold ? 'bold' : ''].filter(Boolean).join(' '),
  foreground: char.foreground,
});

const sameStyle = (a: TokenStyle, b: TokenStyle) =>
  a.foreground === b.foreground &&
  a.fontStyle.includes('italic') === b.fontStyle.includes('italic') &&
  a.fontStyle.includes('bold') === b.fontStyle.includes('bold');

const main = async () => {
  const { registry } = await loadVsCodeGrammars(VSCODE_VERSION);
  const samplesFolder = join(root, SAMPLES_FOLDER);
  const captures = readdirSync(join(root, CAPTURES_FOLDER))
    .filter((file) => file.endsWith('.rtf'))
    .filter((file) => filters.length === 0 || filters.some((word) => file.includes(word)));
  let differences = 0;
  let total = 0;

  for (const capture of captures) {
    const match = /^(.+)\.([^.]+)\.(dark|light)\.rtf$/.exec(capture);
    if (!match) throw new Error(`${capture}: name it <sample>.<IDE>.<dark|light>.rtf`);
    const [, file, ide, variant] = match;
    const info = COLOR_THEMES[variant === 'dark' ? 0 : 1];
    const sample = JSON.parse(
      readFileSync(join(samplesFolder, file.replace(/\.[^.]+$/, '.expect.json')), 'utf8')
    ) as SampleExpectations;
    const theme = loadTheme(info.base);
    registry.setTheme(textMateTheme(theme));
    const colorMap = registry.getColorMap();
    const grammar = await registry.loadGrammar(sample.scope);
    if (!grammar) throw new Error(`${file}: VS Code ${VSCODE_VERSION} has no grammar ${sample.scope}`);
    const lines = tokenize(grammar, readFileSync(join(samplesFolder, file), 'utf8'));
    const ideLines = parseRichText(readFileSync(join(root, CAPTURES_FOLDER, capture), 'utf8'));
    console.log(`\n${file}: ${ide} ${variant} vs ${info.label}`);

    let captureDifferences = 0;
    let captureTotal = 0;
    for (const [index, { line, tokens }] of lines.entries()) {
      const ideLine = ideLines[index] ?? [];
      if (ideLine.map((char) => char.char).join('') !== line) {
        if (line.trim())
          console.log(
            `  ${index + 1}: the capture has another text: ${JSON.stringify(ideLine.map((char) => char.char).join(''))}`
          );
        continue;
      }
      // spans of characters with the same difference
      let span: { ide: string; ours: string; rule: string; scope: string; start: number; text: string } | undefined;
      const flush = () => {
        if (span)
          console.log(
            `  ${String(index + 1).padStart(3)}: ${JSON.stringify(span.text.trimEnd())}  IDE ${span.ide}  ours ${span.ours}  ${span.rule} [${span.scope}]`
          );
        span = undefined;
      };
      for (const [column, char] of ideLine.entries()) {
        if (!char.char.trim()) {
          if (span) span.text += char.char;
          continue;
        }
        captureTotal++;
        const token = tokens.find((candidate) => candidate.start <= column && candidate.end > column);
        const ours = token ? decodeStyle(token.metadata, colorMap) : { fontStyle: '', foreground: '' };
        if (sameStyle(ideStyle(char), ours)) {
          flush();
          continue;
        }
        captureDifferences++;
        const ide = describeStyle(ideStyle(char));
        const oursText = describeStyle(ours);
        const scope = token?.scopes.at(-1) ?? '';
        if (span && span.ide === ide && span.ours === oursText) {
          span.text += char.char;
          continue;
        }
        flush();
        span = {
          ide,
          ours: oursText,
          rule: (token && winningRule(theme.tokenColors, token.scopes)) ?? '(editor text)',
          scope,
          start: column,
          text: char.char,
        };
      }
      flush();
    }
    console.log(`  ${captureDifferences} of ${captureTotal} characters differ`);
    differences += captureDifferences;
    total += captureTotal;
  }
  console.log(`\n${differences} of ${total} characters differ from the IDE`);
};

// ts-node runs the scripts as CommonJS, which has no top-level await
// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
