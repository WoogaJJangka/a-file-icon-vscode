import { strict as assert } from 'node:assert';
import {
  compareStyles,
  decodeStyle,
  describeStyle,
  expectedStyle,
  grammarScopes,
  missingRuleScopes,
  selectorScore,
  tokensOf,
  uncoloredScopes,
  winningRule,
} from 'src/themes/colorCheck';
import { fallbackChain, KEY_FALLBACKS } from 'src/themes/jetbrainsFallbacks';
import { resolveScheme, schemeChainData } from 'src/themes/jetbrainsTheme';

import type { SchemeData } from 'src/themes/jetbrainsTheme';

/** Default <- Darcula <- Islands Dark, like the bundled schemes; the Python plugin adds its colors to Darcula */
const schemes: SchemeData[] = [
  {
    attributes: {
      DEFAULT_IDENTIFIER: { foreground: '#000000' },
      DEFAULT_KEYWORD: { fontType: 1, foreground: '#000080' },
      STATIC_FINAL_FIELD_ATTRIBUTES: { fontType: 3, foreground: '#660e7a' },
      TEXT: { foreground: '#000000' },
    },
    colors: {},
    name: 'Default',
  },
  {
    attributes: {
      DEFAULT_STATIC_FIELD: { fontType: 2, foreground: '#9876aa' },
      INHERITED: { base: 'DEFAULT_KEYWORD' },
      TEXT: { foreground: '#a9b7c6' },
    },
    colors: {},
    name: 'Darcula',
    parent: 'Default',
  },
  {
    attributes: { DEFAULT_IDENTIFIER: { foreground: '#bcbec4' }, DEFAULT_KEYWORD: { foreground: '#cf8e6d' }, TEXT: { foreground: '#bcbec4' } },
    colors: {},
    name: 'Islands Dark',
    parent: 'Darcula',
  },
];
const additional = { Darcula: [{ 'PY.SELF_PARAMETER': { foreground: '#94558d' } }] };

describe('Color check', () => {
  it('follows the fallbacks of the IDE code to the text color, and stops on a loop', () => {
    assert.deepEqual(fallbackChain('STATIC_FINAL_FIELD_ATTRIBUTES'), [
      'STATIC_FINAL_FIELD_ATTRIBUTES',
      'STATIC_FIELD_ATTRIBUTES',
      'DEFAULT_STATIC_FIELD',
      'DEFAULT_IDENTIFIER',
      'TEXT',
    ]);
    assert.deepEqual(fallbackChain('UNKNOWN'), ['UNKNOWN']);
    assert.deepEqual(fallbackChain('A', { A: 'B', B: 'A' }), ['A', 'B']);
    for (const [key, fallback] of Object.entries(KEY_FALLBACKS)) {
      assert.ok(fallbackChain(key).at(-1) !== key || fallback === key, key);
    }
  });

  it('looks keys up in the order of the IDE: the scheme with all its fallbacks, then its parent', () => {
    const scheme = resolveScheme(schemes, 'Islands Dark', additional);
    const darcula = resolveScheme(schemes, 'Darcula', additional);
    // Darcula has a fallback of the key: the value Default gives the key itself is not used
    assert.deepEqual(darcula.lookup(fallbackChain('STATIC_FINAL_FIELD_ATTRIBUTES'))[0], { fontType: 2, foreground: '#9876aa' });
    // Islands has a fallback further down the chain (DEFAULT_IDENTIFIER): it comes before everything of Darcula
    assert.deepEqual(scheme.lookup(fallbackChain('STATIC_FINAL_FIELD_ATTRIBUTES'))[0], { foreground: '#bcbec4' });
    // the key alone, looked up in the whole chain: Default has it
    assert.deepEqual(scheme.attributes('STATIC_FINAL_FIELD_ATTRIBUTES'), { fontType: 3, foreground: '#660e7a' });
    // Islands defines a fallback of the plugin key (DEFAULT_IDENTIFIER): it comes before the plugin color of Darcula
    assert.deepEqual(scheme.lookup(fallbackChain('PY.SELF_PARAMETER'))[0], { foreground: '#bcbec4' });
    // an inherited key (baseAttributes) is not a value: its base is tried in the same scheme first
    assert.deepEqual(scheme.lookup(['INHERITED'])[0], { foreground: '#cf8e6d' });
    assert.deepEqual(scheme.lookup(['NOPE']), []);
  });

  it('keeps the attributes of a scheme chain, the added ones merged in, to resolve it again without the files', () => {
    const data = schemeChainData(schemes, 'Islands Dark', additional);
    assert.deepEqual(
      data.map((scheme) => scheme.name),
      ['Islands Dark', 'Darcula', 'Default'],
    );
    assert.deepEqual(data[1].attributes['PY.SELF_PARAMETER'], { foreground: '#94558d' });
    const again = resolveScheme(data, 'Islands Dark');
    const original = resolveScheme(schemes, 'Islands Dark', additional);
    for (const key of ['PY.SELF_PARAMETER', 'STATIC_FINAL_FIELD_ATTRIBUTES', 'INHERITED', 'TEXT']) {
      assert.deepEqual(again.lookup(fallbackChain(key)), original.lookup(fallbackChain(key)), key);
    }
  });

  it('expects the style of the first attributes found, and the text color when they have none', () => {
    const scheme = resolveScheme(
      [{ attributes: { BOLD_ONLY: { fontType: 1 }, DEFAULT_KEYWORD: { foreground: '#CF8E6DFF' }, TEXT: { foreground: '#bcbec4' } }, colors: {}, name: 'S' }],
      'S',
    );
    assert.deepEqual(expectedStyle(scheme, 'DEFAULT_KEYWORD'), { fontStyle: '', foreground: '#cf8e6d' });
    assert.deepEqual(expectedStyle(scheme, 'BOLD_ONLY'), { fontStyle: 'bold', foreground: '#bcbec4' });
    assert.deepEqual(expectedStyle(scheme, 'CHILD', { CHILD: 'DEFAULT_KEYWORD' }), { fontStyle: '', foreground: '#cf8e6d' });
    assert.equal(expectedStyle(scheme, 'NOPE'), undefined);
    const noText = resolveScheme([{ attributes: { BOLD_ONLY: { fontType: 1 } }, colors: {}, name: 'S' }], 'S');
    assert.equal(expectedStyle(noText, 'BOLD_ONLY'), undefined);
  });

  it('decodes the color and font style of a token of vscode-textmate', () => {
    const colorMap = ['', '#BCBEC4', '#CF8E6D'];
    // foreground index 2 (bits 15-23), bold + underline (bits 11-14)
    const metadata = (2 << 15) | (0b0110 << 11);
    assert.deepEqual(decodeStyle(metadata, colorMap), { fontStyle: 'bold underline', foreground: '#cf8e6d' });
    assert.deepEqual(decodeStyle(1 << 15, colorMap), { fontStyle: '', foreground: '#bcbec4' });
    assert.deepEqual(decodeStyle((9 << 15) | (0b1001 << 11), colorMap), { fontStyle: 'italic strikethrough', foreground: '' });
  });

  it('finds the tokens that draw a text, any occurrence of it', () => {
    const line = 'a = a + b';
    const tokens = [
      { end: 1, metadata: 1, scopes: ['x'], start: 0 },
      { end: 4, metadata: 2, scopes: ['x'], start: 1 },
      { end: 5, metadata: 3, scopes: ['x'], start: 4 },
      { end: 9, metadata: 4, scopes: ['x'], start: 5 },
    ];
    assert.deepEqual(tokensOf(line, tokens, 'a')?.map((token) => token.metadata), [1]);
    assert.deepEqual(tokensOf(line, tokens, 'a', 2)?.map((token) => token.metadata), [3]);
    assert.deepEqual(tokensOf(line, tokens, 'a + b')?.map((token) => token.metadata), [3, 4]);
    assert.equal(tokensOf(line, tokens, 'a', 3), undefined);
    assert.equal(tokensOf(line, tokens, 'c'), undefined);
  });

  it('reports a token whose parts do not all have the expected style', () => {
    const keyword = { fontStyle: '', foreground: '#cf8e6d' };
    const text = { fontStyle: '', foreground: '#bcbec4' };
    assert.equal(compareStyles(keyword, [keyword, keyword]), undefined);
    assert.equal(compareStyles(keyword, [text, keyword]), 'expected #cf8e6d, got #bcbec4 + #cf8e6d');
    assert.equal(describeStyle({ fontStyle: 'italic', foreground: '#5f826b' }), '#5f826b italic');
    assert.match(compareStyles(keyword, [{ fontStyle: 'bold', foreground: '#cf8e6d' }])!, /got #cf8e6d bold/);
  });

  it('names the most specific rule for a scope stack, the later one on a tie', () => {
    const scopes = ['source.python', 'meta.function-call.python', 'entity.name.function.python'];
    assert.equal(selectorScore('entity.name.function', scopes) > selectorScore('entity.name', scopes), true);
    assert.equal(selectorScore('meta.function-call entity.name.function', scopes) > selectorScore('entity.name.function', scopes), true);
    assert.equal(selectorScore('meta.class entity.name.function', scopes), -1);
    assert.equal(selectorScore('entity.name.functions', scopes), -1);
    // a deeper scope wins over a longer selector of an outer scope
    assert.equal(selectorScore('entity', scopes) > selectorScore('meta.function-call.python', scopes), true);
    const rules = [
      { name: 'Entity', scope: ['entity.name'] },
      { name: 'Function', scope: ['entity.name.function'] },
      { name: 'Call', scope: ['meta.function-call entity.name.function'] },
      { name: 'Call again', scope: ['meta.function-call entity.name.function'] },
    ];
    assert.equal(winningRule(rules, scopes), 'Call again');
    assert.equal(winningRule(rules, ['source.python', 'keyword']), undefined);
  });

  it('lists the scopes of a grammar, the rule scopes no grammar has and the scopes no rule colors', () => {
    const grammar = JSON.stringify({
      name: 'Magic Python',
      patterns: [{ name: 'keyword.control.flow.python' }, { captures: { 1: { name: 'meta.call entity.name.function.python' } } }, { name: 'string.$1.python' }],
      repository: { a: { contentName: 'comment.line.python' } },
    });
    const scopes = grammarScopes(grammar);
    assert.deepEqual(scopes, ['comment.line.python', 'entity.name.function.python', 'keyword.control.flow.python', 'meta.call']);
    const rules = [
      { name: 'Keyword', scope: ['keyword'] },
      { name: 'Typo', scope: ['keywords.control', 'meta.call entity.name.function'] },
      { name: 'TOML', scope: ['support.type.property-name.toml'] },
    ];
    assert.deepEqual(missingRuleScopes(rules, scopes, ['.toml']), ['Typo: keywords.control']);
    assert.deepEqual(uncoloredScopes(rules, scopes), ['comment.line.python']);
  });
});
