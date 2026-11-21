/**
 * Attributes of closed plugins, as their IDEs draw them in Islands Dark and Islands Light: read from the rich text the
 * IDEs copy of the samples (test/colors/ide, `bun run compare:ide`; RubyMine, PhpStorm and WebStorm 2026.3, 2026-11-22).
 * The plugins add their attributes to the base schemes (`additionalTextAttributes`, like PythonDarcula.xml), here too:
 * Darcula for the dark theme, Default for the light one. Their keys are not public: the `IDE.` names are ours, the JS.,
 * CSS. names are the keys the bundled schemes already have for those plugins.
 * A value that equals a public key of the other theme is not written: its fallback below gives it (the light Ruby number
 * is the Islands number color, the dark one is not).
 */
import type { AdditionalAttributes, TextAttributes } from './jetbrainsTheme';

const ITALIC = 2;

/** Islands Dark: RubyMine and PhpStorm draw it with the colors their plugins give Darcula (the old Darcula palette) */
const dark: Record<string, TextAttributes> = {
  'IDE.PHP.CONSTANT': { fontType: ITALIC, foreground: '#9876aa' },
  'IDE.PHP.FUNCTION_CALL': { foreground: '#57aaf7' },
  'IDE.PHP.STRING_BRACES': { foreground: '#6f737a' },
  'IDE.PHP.VARIABLE': { foreground: '#9876aa' },
  'IDE.RUBY.COMMENT': { fontType: ITALIC, foreground: '#808080' },
  'IDE.RUBY.CONSTANT': { foreground: '#fefff9' },
  'IDE.RUBY.CONSTANT_DECLARATION': { fontType: ITALIC, foreground: '#ffc66d' },
  'IDE.RUBY.ESCAPE': { foreground: '#cc7832' },
  'IDE.RUBY.LOCAL_VARIABLE': { fontType: ITALIC, foreground: '#d4b01d' },
  'IDE.RUBY.METHOD_DECLARATION': { foreground: '#ffc66d' },
  'IDE.RUBY.NUMBER': { foreground: '#74a4c8' },
  'IDE.RUBY.PARAMETER': { fontType: ITALIC, foreground: '#d4b01d' },
  'IDE.RUBY.SPECIFIC_CALL': { foreground: '#fc9800' },
  'IDE.RUBY.SYMBOL': { foreground: '#89a6af' },
  'IDE.TS.TYPE_PARAMETER': { foreground: '#507874' },
  'JS.LOCAL_VARIABLE': { foreground: '#a9b7c6' },
};

/** Islands Light */
const light: Record<string, TextAttributes> = {
  'CSS.COLOR': { foreground: '#0033b3' },
  'IDE.PHP.FUNCTION_CALL': { foreground: '#00627a' },
  'IDE.PHP.STRING_BRACES': { foreground: '#808080' },
  'IDE.PHP.VARIABLE': { foreground: '#660000' },
  'IDE.RUBY.LOCAL_VARIABLE': { fontType: ITALIC, foreground: '#003c5a' },
  'IDE.RUBY.METHOD_DECLARATION': { fontType: ITALIC, foreground: '#0000ff' },
  'IDE.RUBY.PARAMETER': { fontType: ITALIC, foreground: '#c37522' },
  'IDE.RUBY.SPECIFIC_CALL': { fontType: ITALIC, foreground: '#00627a' },
  'IDE.RUBY.SYMBOL': { foreground: '#871094' },
  'IDE.TS.TYPE_PARAMETER': { foreground: '#20999d' },
  'JS.INSTANCE_MEMBER_FUNCTION': { foreground: '#914c07' },
};

/** By base scheme, like the `additionalTextAttributes` of the open plugins (`bun run sync:colors` adds them) */
export const CAPTURED_ATTRIBUTES: AdditionalAttributes = { Darcula: [dark], Default: [light] };

/** The public key each captured key falls back to where the theme has no value of its own (the other theme's case) */
export const CAPTURED_FALLBACKS: Record<string, string> = {
  'CSS.IMPORTANT': 'DEFAULT_KEYWORD',
  'IDE.PHP.CONSTANT': 'DEFAULT_CONSTANT',
  'IDE.RUBY.COMMENT': 'DEFAULT_LINE_COMMENT',
  'IDE.RUBY.CONSTANT': 'DEFAULT_CONSTANT',
  'IDE.RUBY.CONSTANT_DECLARATION': 'DEFAULT_CONSTANT',
  'IDE.RUBY.ESCAPE': 'DEFAULT_VALID_STRING_ESCAPE',
  'IDE.RUBY.NUMBER': 'DEFAULT_NUMBER',
};
