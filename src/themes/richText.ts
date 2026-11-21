/**
 * The RTF a JetBrains IDE puts on the clipboard when it copies code (Edit | Copy, "Copy as rich text" is on by
 * default): every character with the color and font style the editor draws it in, from the highlighter and the
 * semantic layers (not the inspections: an unresolved name keeps its own color). Captures of the samples are in
 * test/colors/ide, compared with the themes by `bun run compare:ide`.
 */

type StyledChar = { bold: boolean; char: string; foreground: string; italic: boolean };

const hex = (value: number) => value.toString(16).padStart(2, '0');

/** `{\colortbl;\red188\green190\blue196;…}`: index 0 is the default color (empty entry) */
const colorTable = (rtf: string): string[] => {
  const table = /{\\colortbl;?([^}]*)}/.exec(rtf)?.[1] ?? '';
  return [
    '',
    ...table
      .split(';')
      .filter((entry) => entry.trim())
      .map((entry) => {
        const part = (name: string) => Number(new RegExp(String.raw`\\${name}(\d+)`).exec(entry)?.[1] ?? 0);
        return `#${hex(part('red'))}${hex(part('green'))}${hex(part('blue'))}`;
      }),
  ];
};

/** The end of a group of the header (color and font tables): only the text of the outer group is content */
const skipGroup = (rtf: string, start: number): number => {
  let depth = 0;
  for (let index = start; index < rtf.length; index++) {
    if (rtf[index] === '\\') index++;
    else if (rtf[index] === '{') depth++;
    else if (rtf[index] === '}' && --depth === 0) return index + 1;
  }
  return rtf.length;
};

type ParseState = { bold: boolean; colors: string[]; foreground: string; italic: boolean; lines: StyledChar[][] };

const push = (state: ParseState, char: string) =>
  state.lines.at(-1)!.push({ bold: state.bold, char, foreground: state.foreground, italic: state.italic });

/** Applies a control word (`\cf3`, `\i0`, `\line`, `呢0`); returns how many characters after it it consumed */
const controlWord = (state: ParseState, name: string, value: number | undefined, after: string | undefined): number => {
  switch (name) {
    case 'b': {
      state.bold = value !== 0;
      return 0;
    }
    case 'cf': {
      state.foreground = state.colors[value ?? 0] ?? '';
      return 0;
    }
    case 'i': {
      state.italic = value !== 0;
      return 0;
    }
    case 'line': {
      state.lines.push([]);
      return 0;
    }
    case 'tab': {
      push(state, '\t');
      return 0;
    }
    case 'u': {
      push(state, String.fromCodePoint(value! < 0 ? value! + 65_536 : value!));
      // the ANSI replacement character that follows (`?`)
      return after && !String.raw`\{}`.includes(after) ? 1 : 0;
    }
    default: {
      return 0;
    }
  }
};

/** The lines of a rich text copy, each character with its style */
const parseRichText = (rtf: string): StyledChar[][] => {
  const state: ParseState = { bold: false, colors: colorTable(rtf), foreground: '', italic: false, lines: [[]] };
  let depth = 0;
  let index = 0;
  while (index < rtf.length) {
    const char = rtf[index];
    if (char === '{' && depth > 0) {
      index = skipGroup(rtf, index);
    } else if (char === '{' || char === '}') {
      depth += char === '{' ? 1 : -1;
      index++;
    } else if (char === '\r' || char === '\n') {
      index++;
    } else if (char !== '\\') {
      push(state, char);
      index++;
    } else if (String.raw`\{}`.includes(rtf[index + 1])) {
      push(state, rtf[index + 1]);
      index += 2;
    } else if (rtf[index + 1] === "'") {
      push(state, String.fromCodePoint(Number.parseInt(rtf.slice(index + 2, index + 4), 16)));
      index += 4;
    } else {
      const word = /^\\([a-z]+)(-?\d+)? ?/.exec(rtf.slice(index));
      if (word) {
        index += word[0].length;
        index += controlWord(state, word[1], word[2] === undefined ? undefined : Number(word[2]), rtf[index]);
      } else {
        index += 2;
      }
    }
  }
  // the copy ends with a line break: no last empty line
  if (state.lines.length > 1 && state.lines.at(-1)!.length === 0) state.lines.pop();
  return state.lines;
};

export { parseRichText };
export type { StyledChar };
