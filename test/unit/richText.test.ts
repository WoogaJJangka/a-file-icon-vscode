import { strict as assert } from 'node:assert';
import { parseRichText } from 'src/themes/richText';

/** Written apart: the bundler reads `\u` in a raw template as an escape */
const BACKSLASH = '\\';

/** Like the RTF a JetBrains IDE copies: a color table, a font table, then the code with \cf, \i, \b and \line */
const RTF =
  String.raw`{\rtf1\ansi\deff0{\colortbl;\red188\green190\blue196;\red25\green26\blue28;\red207\green142\blue109;\red95\green130\blue107;}
{\fonttbl{\f1\fmodern JetBrains Mono;}{\f2\fmodern Courier New;}}

\s0\box\cbpat2\cb2\cf1\fs20
\cf4
\f1
\i\b0

// \f2

UNICODE\line
\cf3
\f1
\i0\b

class \cf1
\b0

A \{ \}\line
\par}`.replace('UNICODE', `${BACKSLASH}u54620?${BACKSLASH}u44544?`);

describe('Rich text copies of the IDE', () => {
  it('reads every character with its color and font style, and skips the header groups', () => {
    const lines = parseRichText(RTF);
    assert.equal(lines.length, 2);
    assert.equal(lines.map((line) => line.map((char) => char.char).join('')).join('\n'), '// 한글\nclass A { }');
    assert.deepEqual(lines[0][0], { bold: false, char: '/', foreground: '#5f826b', italic: true });
    // a Unicode character and its ANSI replacement (`?`) are one character
    assert.deepEqual(lines[0][3], { bold: false, char: '한', foreground: '#5f826b', italic: true });
    assert.deepEqual(lines[1][0], { bold: true, char: 'c', foreground: '#cf8e6d', italic: false });
    // escaped braces are text, in the color in effect
    assert.deepEqual(lines[1][8], { bold: false, char: '{', foreground: '#bcbec4', italic: false });
  });

  it(String.raw`reads hex escapes and tabs, and gives the default color to \cf0`, () => {
    const [line] = parseRichText(String.raw`{\rtf1{\colortbl;\red0\green0\blue0;}\cf0 a\tab\'41\cf1 b}`);
    assert.deepEqual(
      line.map((char) => [char.char, char.foreground]),
      [
        ['a', ''],
        ['\t', ''],
        ['A', ''],
        ['b', '#000000'],
      ]
    );
  });
});
