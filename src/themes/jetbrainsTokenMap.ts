/**
 * Syntax colors: TextMate scopes and semantic tokens -> the JetBrains editor attributes that color the same code.
 * Hand kept: change it and run `bun run sync:colors`.
 *
 * Each rule lists attribute keys: the first one the color scheme defines gives the font style, the first one with a
 * foreground gives the color (like the IDE, which draws a key without a color in the color of the layer under it). Many
 * language keys of the IDE fall back to a default key in code, not in the scheme files (`JSON.PROPERTY_KEY` ->
 * `DEFAULT_INSTANCE_FIELD`, `YAML_SCALAR_KEY` -> `DEFAULT_KEYWORD`): those fallbacks are written here.
 * The order of the rules is kept in the theme: for the same scope depth, a later rule wins in VS Code.
 */
/** Semantic keys of the JavaScript plugin (its fallbacks are not in this repository: the default ones are written) */
const JS_MEMBER_FUNCTION = ['JS.INSTANCE_MEMBER_FUNCTION', 'DEFAULT_INSTANCE_METHOD', 'DEFAULT_FUNCTION_CALL', 'TEXT'];
const JS_GLOBAL_VARIABLE = ['JS.GLOBAL_VARIABLE', 'DEFAULT_GLOBAL_VARIABLE'];

export type TokenRule = { from: string[]; name: string; scope: string[] };

export const TOKEN_RULES: TokenRule[] = [
  // Defaults of every language
  { from: ['DEFAULT_LINE_COMMENT'], name: 'Comment', scope: ['comment', 'punctuation.definition.comment'] },
  { from: ['DEFAULT_BLOCK_COMMENT'], name: 'Block comment', scope: ['comment.block'] },
  {
    from: ['DEFAULT_DOC_COMMENT'],
    name: 'Doc comment',
    // the delimiters (`/** */`, the quotes of a docstring) too, as the IDE draws them (seen in PyCharm 2026-11-21)
    scope: [
      'comment.block.documentation',
      'comment.block.javadoc',
      'string.quoted.docstring',
      'comment.block.documentation punctuation.definition.comment',
      'comment.block.javadoc punctuation.definition.comment',
      'string.quoted.docstring punctuation.definition.string',
    ],
  },
  { from: ['DEFAULT_DOC_COMMENT_TAG'], name: 'Doc comment tag', scope: ['comment.block.documentation storage.type', 'comment.block.documentation keyword', 'storage.type.class.jsdoc'] },
  { from: ['DEFAULT_KEYWORD'], name: 'Keyword', scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.control', 'constant.language', 'variable.language.this', 'variable.language.super', 'support.type.primitive'] },
  { from: ['DEFAULT_OPERATION_SIGN', 'TEXT'], name: 'Operator', scope: ['keyword.operator', 'punctuation.separator.key-value', 'punctuation.accessor'] },
  // Word operators are keywords in the IDE (and, or, not, in, is, new, typeof…)
  { from: ['DEFAULT_KEYWORD'], name: 'Word operator', scope: ['keyword.operator.logical.python', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.word', 'keyword.operator.instanceof', 'keyword.operator.typeof'] },
  { from: ['DEFAULT_STRING'], name: 'String', scope: ['string', 'punctuation.definition.string'] },
  { from: ['DEFAULT_VALID_STRING_ESCAPE'], name: 'String escape', scope: ['constant.character.escape', 'constant.character.format.placeholder', 'meta.format.percent', 'constant.other.placeholder'] },
  { from: ['DEFAULT_INVALID_STRING_ESCAPE'], name: 'Invalid string escape', scope: ['invalid.illegal.character.escape', 'invalid.illegal.unrecognized-string-escape'] },
  { from: ['DEFAULT_NUMBER'], name: 'Number', scope: ['constant.numeric'] },
  { from: ['DEFAULT_CONSTANT'], name: 'Constant', scope: ['variable.other.constant', 'constant.other', 'variable.other.enummember', 'entity.name.constant'] },
  { from: ['DEFAULT_FUNCTION_DECLARATION'], name: 'Function declaration', scope: ['entity.name.function', 'meta.definition.method entity.name.function', 'meta.function entity.name.function'] },
  { from: ['DEFAULT_FUNCTION_CALL', 'TEXT'], name: 'Function call', scope: ['meta.function-call entity.name.function', 'meta.function-call.generic', 'support.function'] },
  { from: ['DEFAULT_INSTANCE_METHOD', 'DEFAULT_FUNCTION_CALL', 'TEXT'], name: 'Method call', scope: ['meta.method-call entity.name.function', 'meta.function-call.method'] },
  { from: ['DEFAULT_INSTANCE_FIELD'], name: 'Field', scope: ['variable.other.property', 'variable.other.object.property', 'variable.other.member', 'support.variable.property', 'entity.name.variable.field'] },
  { from: ['DEFAULT_CLASS_NAME', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Class name', scope: ['entity.name.type', 'entity.name.class', 'entity.other.inherited-class'] },
  { from: ['DEFAULT_CLASS_REFERENCE', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Class reference', scope: ['support.class', 'support.type', 'entity.name.type.module'] },
  { from: ['DEFAULT_INTERFACE_NAME', 'DEFAULT_CLASS_NAME', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Interface name', scope: ['entity.name.type.interface'] },
  { from: ['TYPE_PARAMETER_NAME_ATTRIBUTES'], name: 'Type parameter', scope: ['entity.name.type.parameter', 'meta.type.parameters entity.name.type'] },
  { from: ['DEFAULT_PARAMETER', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Parameter', scope: ['variable.parameter'] },
  { from: ['DEFAULT_METADATA'], name: 'Annotation', scope: ['meta.decorator', 'entity.name.function.decorator', 'punctuation.definition.decorator', 'storage.type.annotation', 'punctuation.definition.annotation'] },
  { from: ['DEFAULT_LABEL', 'DEFAULT_IDENTIFIER'], name: 'Label', scope: ['entity.name.label'] },
  // The tag key colors the whole tag, its brackets too (XmlHighlighterColors: HTML_TAG -> DEFAULT_TAG)
  { from: ['HTML_TAG', 'DEFAULT_TAG', 'TEXT'], name: 'Tag punctuation', scope: ['punctuation.definition.tag', 'meta.tag punctuation'] },
  { from: ['HTML_TAG_NAME', 'XML_TAG_NAME', 'DEFAULT_KEYWORD'], name: 'Tag name', scope: ['entity.name.tag'] },
  { from: ['HTML_ATTRIBUTE_NAME', 'XML_ATTRIBUTE_NAME', 'DEFAULT_INSTANCE_FIELD'], name: 'Attribute name', scope: ['entity.other.attribute-name'] },
  { from: ['HTML_ATTRIBUTE_VALUE', 'XML_ATTRIBUTE_VALUE', 'DEFAULT_STRING'], name: 'Attribute value', scope: ['meta.attribute-with-value string', 'meta.tag string'] },
  { from: ['HTML_ENTITY_REFERENCE', 'XML_ENTITY_REFERENCE', 'DEFAULT_VALID_STRING_ESCAPE'], name: 'Entity', scope: ['constant.character.entity'] },
  { from: ['ERRORS_ATTRIBUTES'], name: 'Invalid', scope: ['invalid', 'invalid.illegal'] },
  { from: ['DEPRECATED_ATTRIBUTES'], name: 'Deprecated', scope: ['invalid.deprecated'] },

  // Python, as PyCharm colors it (keys and fallbacks of PyHighlighter.java: no key for constants or attributes, method
  // calls fall back to function calls)
  { from: ['PY.ANNOTATION', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Python name in capitals', scope: ['constant.other.caps.python', 'variable.other.constant.python'] },
  { from: ['PY.METHOD_CALL', 'PY.FUNCTION_CALL', 'DEFAULT_FUNCTION_CALL', 'TEXT'], name: 'Python call', scope: ['meta.function-call.python entity.name.function', 'meta.function-call.generic.python'] },
  { from: ['PY.KEYWORD', 'DEFAULT_KEYWORD'], name: 'Python keyword', scope: ['keyword.control.flow.python', 'keyword.control.import.python', 'storage.type.function.python', 'storage.type.class.python', 'constant.language.python'] },
  { from: ['PY.SELF_PARAMETER', 'DEFAULT_KEYWORD'], name: 'Python self', scope: ['variable.parameter.function.language.special.self.python', 'variable.language.special.self.python', 'variable.parameter.function.language.special.cls.python', 'variable.language.special.cls.python'] },
  { from: ['PY.KEYWORD_ARGUMENT', 'DEFAULT_PARAMETER'], name: 'Python keyword argument', scope: ['variable.parameter.function-call.python', 'meta.function-call.arguments.python variable.parameter'] },
  { from: ['PY.BUILTIN_NAME', 'DEFAULT_PREDEFINED_SYMBOL'], name: 'Python builtin', scope: ['support.function.builtin.python', 'support.type.python', 'support.type.exception.python', 'support.function.builtin', 'support.type.builtin.python'] },
  { from: ['PY.PREDEFINED_USAGE', 'DEFAULT_PREDEFINED_SYMBOL'], name: 'Python special name', scope: ['support.variable.magic.python', 'support.function.magic.python', 'entity.name.function.magic.python'] },
  { from: ['PY.PREDEFINED_DEFINITION', 'PY.PREDEFINED_USAGE'], name: 'Python special method', scope: ['meta.function.python support.function.magic.python'] },
  { from: ['PY.DECORATOR', 'DEFAULT_METADATA'], name: 'Python decorator', scope: ['meta.function.decorator.python', 'entity.name.function.decorator.python', 'punctuation.definition.decorator.python'] },
  { from: ['PY.DOC_COMMENT', 'DEFAULT_DOC_COMMENT'], name: 'Python docstring', scope: ['string.quoted.docstring.multi.python', 'string.quoted.docstring.single.python', 'string.quoted.docstring punctuation.definition.string.begin.python', 'string.quoted.docstring punctuation.definition.string.end.python'] },
  { from: ['PY.STRING.B', 'DEFAULT_STRING'], name: 'Python bytes', scope: ['string.quoted.binary.single.python', 'string.quoted.binary.multi.python'] },
  { from: ['PY.FUNC_DEFINITION', 'DEFAULT_FUNCTION_DECLARATION'], name: 'Python function', scope: ['meta.function.python entity.name.function.python'] },
  { from: ['PY.CLASS_DEFINITION', 'DEFAULT_CLASS_NAME', 'TEXT'], name: 'Python class', scope: ['entity.name.type.class.python'] },

  // Java (JavaHighlightingColors.java): the grammar gives class names `storage.type`, which the IDE draws as class names,
  // not keywords; the package and import paths are plain identifiers. A static final field needs the language server
  // (semantic tokens), the grammar cannot tell it.
  { from: ['CLASS_NAME_ATTRIBUTES'], name: 'Java class name', scope: ['storage.type.java', 'storage.type.generic.java', 'storage.type.object.array.java'] },
  { from: ['DEFAULT_IDENTIFIER'], name: 'Java package', scope: ['storage.modifier.package.java', 'storage.modifier.import.java'] },

  // C and C++ (CLion, seen on screen 2026-11-21; its keys are closed): a call is text, not a declaration; the member
  // initializer of a constructor is a field; a macro has the color of an annotation; the type of a parameter is a class
  // reference (the grammar names it like a type parameter)
  { from: ['DEFAULT_FUNCTION_CALL', 'TEXT'], name: 'C++ call', scope: ['entity.name.function.call.cpp', 'entity.name.function.member.cpp', 'entity.name.function.member.c'] },
  { from: ['DEFAULT_INSTANCE_FIELD'], name: 'C++ member initializer', scope: ['entity.name.function.call.initializer.cpp'] },
  { from: ['DEFAULT_METADATA'], name: 'C++ macro', scope: ['entity.name.function.preprocessor.cpp', 'entity.name.function.preprocessor.c'] },
  { from: ['DEFAULT_CLASS_REFERENCE'], name: 'C++ parameter type', scope: ['entity.name.type.parameter.cpp'] },

  // Rust (keys of intellij-rust, RsColors.kt; RustRover's Islands colors seen on screen 2026-11-21): doc comments, primitive
  // types are keywords, attributes are metadata, a call is text (not intellij-rust's old yellow: RustRover draws it plain),
  // a macro stays blue like a declaration, a lifetime takes the teal of a type parameter (RustRover: teal, italic)
  { from: ['org.rust.DOC_COMMENT'], name: 'Rust doc comment', scope: ['comment.line.documentation.rust', 'comment.block.documentation.rust', 'comment.line.documentation.rust punctuation.definition.comment', 'comment.block.documentation.rust punctuation.definition.comment'] },
  { from: ['org.rust.PRIMITIVE_TYPE'], name: 'Rust primitive type', scope: ['entity.name.type.numeric.rust', 'entity.name.type.primitive.rust'] },
  { from: ['org.rust.SELF_PARAMETER'], name: 'Rust self', scope: ['variable.language.self.rust'] },
  { from: ['org.rust.ATTRIBUTE'], name: 'Rust attribute', scope: ['meta.attribute.rust', 'meta.attribute.rust entity.name.type.rust', 'meta.attribute.rust punctuation'] },
  { from: ['org.rust.FUNCTION_CALL', 'TEXT'], name: 'Rust call', scope: ['meta.function.call.rust entity.name.function.rust'] },
  { from: ['TYPE_PARAMETER_NAME_ATTRIBUTES'], name: 'Rust lifetime', scope: ['entity.name.type.lifetime.rust', 'punctuation.definition.lifetime.rust'] },

  // C# (Rider draws C# with its own palette, not the Islands one: C# follows the defaults like the other languages). The
  // XML tags of a doc comment are doc markup, like the HTML of a Javadoc, not HTML tags
  { from: ['DEFAULT_DOC_MARKUP', 'DEFAULT_DOC_COMMENT'], name: 'C# doc comment tag', scope: ['comment.block.documentation.cs meta.tag', 'comment.block.documentation.cs punctuation.definition.tag', 'comment.block.documentation.cs entity.name.tag'] },

  // Go (GoLand's colors are closed: only the GO_* keys the bundled schemes have, Islands Light's, then the defaults): a call
  // is text, not a declaration; builtins and their constants have their key where a scheme gives one
  { from: ['GO_EXPORTED_FUNCTION_CALL', 'TEXT'], name: 'Go call', scope: ['entity.name.function.support.go'] },
  { from: ['GO_BUILTIN_FUNCTION_CALL', 'TEXT'], name: 'Go builtin call', scope: ['entity.name.function.support.builtin.go'] },
  { from: ['GO_BUILTIN_TYPE_REFERENCE'], name: 'Go builtin type', scope: ['storage.type.numeric.go', 'storage.type.string.go', 'storage.type.boolean.go', 'storage.type.byte.go', 'storage.type.rune.go', 'storage.type.error.go', 'storage.type.uintptr.go'] },
  { from: ['GO_BUILTIN_CONSTANT'], name: 'Go builtin constant', scope: ['constant.language.null.go', 'constant.language.boolean.go', 'constant.language.iota.go'] },

  // Data and markup
  { from: ['JSON.PROPERTY_KEY', 'DEFAULT_INSTANCE_FIELD'], name: 'JSON key', scope: ['support.type.property-name.json', 'meta.object-literal.key'] },
  // TOML (TomlColors.kt; the grammar of the Even Better TOML extension): a key is a keyword, not a field like in JSON
  { from: ['org.toml.KEY'], name: 'TOML key', scope: ['support.type.property-name.toml', 'support.type.property-name.table.toml'] },
  { from: ['YAML_SCALAR_KEY', 'DEFAULT_KEYWORD'], name: 'YAML key', scope: ['entity.name.tag.yaml'] },
  { from: ['YAML_ANCHOR'], name: 'YAML anchor', scope: ['variable.other.anchor.yaml', 'variable.other.alias.yaml', 'punctuation.definition.anchor.yaml', 'punctuation.definition.alias.yaml'] },
  // A comment of YAML falls back to the doc comment (YAMLHighlighter); a plain value is text, numbers and booleans too
  { from: ['YAML_COMMENT'], name: 'YAML comment', scope: ['comment.line.number-sign.yaml', 'punctuation.definition.comment.yaml'] },
  {
    from: ['YAML_SCALAR_VALUE'],
    name: 'YAML value',
    scope: ['constant.language.boolean.yaml', 'constant.language.null.yaml', 'constant.numeric.float.yaml', 'constant.numeric.float.inf.yaml', 'constant.numeric.float.nan.yaml', 'constant.numeric.integer.decimal.yaml', 'constant.numeric.integer.hexadecimal.yaml', 'constant.numeric.integer.octal.yaml'],
  },
  { from: ['PROPERTIES.KEY'], name: 'Properties key', scope: ['support.type.property-name.properties', 'keyword.other.definition.ini', 'entity.name.section.group-title.ini'] },
  { from: ['PROPERTIES.KEY_VALUE_SEPARATOR'], name: 'Properties separator', scope: ['punctuation.separator.key-value.ini'] },
  // .env (DotEnvSyntaxHighlighter): a key is a keyword, a value a string with its quotes and `${…}`, `export` a comment
  { from: ['DOTENV_KEY'], name: '.env key', scope: ['variable.key.dotenv'] },
  { from: ['DOTENV_VALUE'], name: '.env value', scope: ['property.value.dotenv', 'property.value.dotenv keyword', 'property.value.dotenv variable'] },
  { from: ['DOTENV_COMMENT'], name: '.env export', scope: ['keyword.key.export.dotenv'] },
  // SQL (Database Tools, closed). Seen in PyCharm 2026-11-21: the table of a CREATE, an alias and the column after it are
  // text (a column the IDE resolves can be purple: semantic), a built-in function italic like a static method
  { from: ['DEFAULT_IDENTIFIER'], name: 'SQL name', scope: ['entity.name.function.sql', 'constant.other.database-name.sql', 'constant.other.table-name.sql'] },
  { from: ['DEFAULT_STATIC_METHOD'], name: 'SQL function', scope: ['source.sql support.function'] },
  // CSS (the CSS plugin is closed: its keys fall back in code we cannot read). Seen in PyCharm 2026-11-21: a property name
  // is text, a keyword value (`auto`, `none`, a font name) a string, a unit a number, a whole selector the color of an HTML
  // tag name (its `.` `#` `:` too)
  { from: ['CSS.PROPERTY_NAME', 'DEFAULT_IDENTIFIER'], name: 'CSS property', scope: ['support.type.property-name.css', 'support.type.vendored.property-name.css', 'support.type.property-name.scss', 'support.type.property-name.less', 'support.type.property-name.media.css'] },
  { from: ['CSS.PROPERTY_VALUE', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'CSS value', scope: ['meta.property-value.css'] },
  { from: ['CSS.PROPERTY_VALUE', 'DEFAULT_STRING'], name: 'CSS value keyword', scope: ['support.constant.property-value.css', 'support.constant.font-name.css'] },
  { from: ['CSS.NUMBER', 'DEFAULT_NUMBER'], name: 'CSS unit', scope: ['keyword.other.unit'] },
  {
    from: ['CSS.TAG_NAME', 'HTML_TAG_NAME'],
    name: 'CSS selector',
    scope: [
      'entity.name.tag.css',
      'entity.other.attribute-name.class.css',
      'entity.other.attribute-name.id.css',
      'entity.other.attribute-name.pseudo-class.css',
      'entity.other.attribute-name.pseudo-element.css',
      'meta.attribute-selector.css entity.other.attribute-name',
    ],
  },
  { from: ['CSS.COLOR', 'DEFAULT_NUMBER'], name: 'CSS color', scope: ['constant.other.color.rgb-value.hex.css', 'support.constant.color'] },
  { from: ['CSS.URL', 'DEFAULT_STRING'], name: 'CSS url', scope: ['variable.parameter.url.css'] },
  { from: ['CSS.IMPORTANT', 'DEFAULT_KEYWORD'], name: 'CSS important', scope: ['keyword.other.important.css'] },
  // A header, its `#` too, has the key of its level (MarkdownHighlighterColors); a setext header (underlined) is level 1 or 2
  { from: ['MARKDOWN_HEADER_LEVEL_1'], name: 'Markdown header', scope: ['markup.heading', 'entity.name.section.markdown', 'punctuation.definition.heading.markdown'] },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({
    from: [`MARKDOWN_HEADER_LEVEL_${level}`],
    name: `Markdown header ${level}`,
    scope: [`heading.${level}.markdown`, `heading.${level}.markdown entity.name.section.markdown`, `heading.${level}.markdown punctuation.definition.heading.markdown`, ...(level <= 2 ? [`markup.heading.setext.${level}.markdown`] : [])],
  })),
  { from: ['MARKDOWN_BOLD'], name: 'Markdown bold', scope: ['markup.bold'] },
  { from: ['MARKDOWN_ITALIC'], name: 'Markdown italic', scope: ['markup.italic'] },
  { from: ['MARKDOWN_CODE_SPAN', 'DEFAULT_STRING'], name: 'Markdown code span', scope: ['markup.inline.raw', 'markup.inline.raw.string.markdown'] },
  { from: ['MARKDOWN_CODE_FENCE', 'MARKDOWN_CODE_BLOCK', 'DEFAULT_STRING'], name: 'Markdown code fence', scope: ['markup.fenced_code.block.markdown punctuation.definition.markdown', 'fenced_code.block.language'] },
  { from: ['MARKDOWN_CODE_BLOCK', 'DEFAULT_STRING'], name: 'Markdown code block', scope: ['markup.raw.block.markdown'] },
  { from: ['MARKDOWN_BLOCK_QUOTE', 'MARKDOWN_TEXT', 'TEXT'], name: 'Markdown quote', scope: ['markup.quote'] },
  { from: ['MARKDOWN_BLOCK_QUOTE_MARKER', 'DEFAULT_KEYWORD'], name: 'Markdown quote marker', scope: ['punctuation.definition.quote.begin.markdown'] },
  { from: ['MARKDOWN_LIST_MARKER', 'DEFAULT_KEYWORD'], name: 'Markdown list marker', scope: ['punctuation.definition.list.begin.markdown', 'beginning.punctuation.definition.list.markdown'] },
  { from: ['MARKDOWN_LINK_TEXT', 'HYPERLINK_ATTRIBUTES'], name: 'Markdown link text', scope: ['string.other.link.title.markdown', 'string.other.link.description.markdown'] },
  // The IDE draws the address as a hyperlink, on top of MARKDOWN_LINK_DESTINATION (seen in PyCharm 2026-11-21)
  { from: ['HYPERLINK_ATTRIBUTES'], name: 'Markdown link', scope: ['markup.underline.link', 'markup.underline.link.markdown'] },
  { from: ['DEFAULT_KEYWORD'], name: 'Markdown separator', scope: ['meta.separator.markdown'] },
  { from: ['DIFF_INSERTED', 'CONSOLE_GREEN_OUTPUT'], name: 'Inserted', scope: ['markup.inserted'] },
  { from: ['DIFF_DELETED', 'CONSOLE_RED_OUTPUT'], name: 'Deleted', scope: ['markup.deleted'] },
  { from: ['DIFF_MODIFIED', 'CONSOLE_BLUE_OUTPUT'], name: 'Changed', scope: ['markup.changed'] },

  // XML (XmlHighlighterColors.java) and the custom elements of HTML
  { from: ['XML_TAG', 'DEFAULT_TAG', 'TEXT'], name: 'XML tag', scope: ['punctuation.definition.tag.xml'] },
  { from: ['XML_TAG_NAME', 'DEFAULT_KEYWORD'], name: 'XML tag name', scope: ['entity.name.tag.xml', 'entity.name.tag.localname.xml'] },
  { from: ['XML_ATTRIBUTE_NAME', 'DEFAULT_ATTRIBUTE', 'DEFAULT_INSTANCE_FIELD'], name: 'XML attribute name', scope: ['entity.other.attribute-name.xml', 'entity.other.attribute-name.localname.xml'] },
  // A namespace prefix has the color of its name: PyCharm (2026-11-21) does not draw XML_NS_PREFIX on `xmlns:demo` or `demo:greeter`
  { from: ['XML_TAG_NAME'], name: 'XML namespace prefix', scope: ['entity.name.tag.namespace.xml'] },
  { from: ['XML_ATTRIBUTE_NAME'], name: 'XML attribute prefix', scope: ['entity.other.attribute-name.namespace.xml', 'entity.other.attribute-name.xml punctuation.separator.namespace.xml'] },
  // CDATA: the markers like a tag, the text like tag data (PyCharm 2026-11-21)
  { from: ['XML_TAG_DATA', 'TEXT'], name: 'XML CDATA', scope: ['string.unquoted.cdata.xml'] },
  { from: ['XML_TAG', 'TEXT'], name: 'XML CDATA marker', scope: ['string.unquoted.cdata.xml punctuation.definition.string'] },
  { from: ['XML_PROLOGUE', 'TEXT'], name: 'XML prologue', scope: ['meta.tag.preprocessor.xml punctuation.definition.tag.xml', 'meta.tag.preprocessor.xml entity.name.tag.xml'] },
  { from: ['HTML_CUSTOM_TAG_NAME', 'HTML_TAG_NAME', 'DEFAULT_KEYWORD'], name: 'HTML custom element', scope: ['meta.tag.custom entity.name.tag'] },

  // Regular expressions (keys and fallbacks of RegExpHighlighter.java), for the regex scopes of the TypeScript,
  // JavaScript and Python grammars. Plain characters are strings; brackets and parentheses have the brace color.
  { from: ['REGEXP.CHARACTER', 'DEFAULT_STRING'], name: 'Regex', scope: ['string.regexp', 'constant.other.character-class.set.regexp', 'constant.other.character-class.range.regexp', 'constant.other.set.regexp', 'constant.character.set.regexp'] },
  { from: ['REGEXP.CHAR_CLASS', 'DEFAULT_ENTITY'], name: 'Regex class', scope: ['constant.other.character-class.regexp', 'support.other.escape.special.regexp'] },
  { from: ['REGEXP.DOT', 'DEFAULT_DOT', 'TEXT'], name: 'Regex dot', scope: ['support.other.match.any.regexp'] },
  { from: ['REGEXP.ESC_CHARACTER', 'DEFAULT_VALID_STRING_ESCAPE'], name: 'Regex escape', scope: ['constant.character.escape.backslash.regexp', 'constant.character.escape.regexp', 'constant.character.control.regexp', 'constant.character.numeric.regexp', 'constant.character.unicode.regexp', 'keyword.other.back-reference.regexp', 'entity.name.tag.backreference.regexp', 'entity.name.tag.named.backreference.regexp'] },
  { from: ['REGEXP.META', 'DEFAULT_KEYWORD'], name: 'Regex meta', scope: ['keyword.operator.quantifier.regexp', 'keyword.control.anchor.regexp', 'keyword.operator.or.regexp', 'keyword.operator.disjunction.regexp', 'keyword.operator.negation.regexp', 'support.other.match.begin.regexp', 'support.other.match.end.regexp'] },
  { from: ['REGEXP.BRACKETS', 'DEFAULT_BRACKETS', 'TEXT'], name: 'Regex brackets', scope: ['punctuation.definition.character-class.regexp', 'punctuation.character.set.begin.regexp', 'punctuation.character.set.end.regexp', 'punctuation.character.set constant.other.set.regexp'] },
  {
    from: ['REGEXP.PARENTHS', 'DEFAULT_PARENTHS', 'TEXT'],
    name: 'Regex parentheses',
    // the IDE reads "(?=", "(?<!", "(?P<" as one parenthesis token
    scope: ['punctuation.definition.group.regexp', 'punctuation.definition.group.assertion.regexp', 'punctuation.definition.group.no-capture.regexp', 'support.other.parenthesis.regexp', 'string.regexp punctuation.parenthesis', 'string.regexp keyword.operator.lookahead', 'string.regexp keyword.operator.lookbehind', 'string.regexp keyword.operator.conditional'],
  },
  { from: ['REGEXP.NAME', 'DEFAULT_IDENTIFIER', 'TEXT'], name: 'Regex group name', scope: ['entity.name.tag.named.group.regexp'] },
  { from: ['REGEXP.OPTIONS', 'DEFAULT_PREDEFINED_SYMBOL'], name: 'Regex flags', scope: ['storage.modifier.flag.regexp'] },

  // JavaScript and TypeScript: a regex literal, its slashes and flags too, has the JS.REGEXP color (the scheme only has
  // it, JS.REGEXP is not in this repository: its fallback is the one the theme had before)
  {
    from: ['JS.REGEXP', 'DEFAULT_VALID_STRING_ESCAPE'],
    name: 'JavaScript regex',
    scope: ['ts', 'tsx', 'js'].flatMap((suffix) => [
      `string.regexp.${suffix}`,
      `string.regexp.${suffix} punctuation.definition.string`,
      `string.regexp.${suffix} keyword.other.${suffix}`,
      `string.regexp.${suffix} constant.other.character-class.set.regexp`,
      `string.regexp.${suffix} constant.other.character-class.range.regexp`,
    ]),
  },

  // Shell
  // Shell (ShHighlighterColors.java): an unquoted word (an argument, an option) is text, only quoted strings are strings
  { from: ['BASH.EXTERNAL_COMMAND'], name: 'Shell command', scope: ['entity.name.command.shell'] },
  { from: ['BASH.INTERNAL_COMMAND'], name: 'Shell builtin', scope: ['support.function.builtin.shell'] },
  { from: ['BASH.FUNCTION_DEF_NAME'], name: 'Shell function', scope: ['entity.name.function.shell'] },
  {
    from: ['BASH.VAR_USE'],
    name: 'Shell variable',
    scope: ['variable.other.normal.shell', 'variable.parameter.positional.shell', 'variable.parameter.positional.all.shell', 'variable.language.special.shell', 'punctuation.definition.variable.shell'],
  },
  { from: ['BASH.VAR_DEF'], name: 'Shell variable definition', scope: ['variable.other.assignment.shell'] },
  // A variable inside double quotes is part of the string; the shebang is text, bold (seen in PyCharm 2026-11-21)
  {
    from: ['BASH.STRING'],
    name: 'Shell variable in a string',
    scope: ['string.quoted.double.shell variable.other.normal.shell', 'string.quoted.double.shell variable.parameter.positional.shell', 'string.quoted.double.shell punctuation.definition.variable.shell'],
  },
  { from: ['BASH.SHEBANG', 'TEXT'], name: 'Shell shebang', scope: ['meta.shebang.shell', 'punctuation.definition.comment.shebang.shell'] },
  { from: ['TEXT'], name: 'Shell word', scope: ['string.unquoted.argument.shell', 'constant.other.option.dash.shell', 'meta.statement.command.shell constant.other.option'] },

  // Groovy (GroovySyntaxHighlighter.java, keys named like their settings): like Java, class names are not keywords and the
  // package paths are identifiers; a map key is a string
  { from: ['Class'], name: 'Groovy class name', scope: ['storage.type.groovy'] },
  { from: ['DEFAULT_IDENTIFIER'], name: 'Groovy package', scope: ['storage.modifier.package.groovy', 'storage.modifier.import.groovy'] },
  { from: ['Map key'], name: 'Groovy map key', scope: ['constant.other.key.groovy'] },
  // GroovyDarcula sets the method declaration to nothing: text (the grammar names it like Java's)
  { from: ['Groovy method declaration', 'TEXT'], name: 'Groovy method declaration', scope: ['meta.definition.method.groovy entity.name.function'] },

  // reStructuredText (RestSyntaxHighlighter.java): a section header is a number, emphasis is text (bold, italic), an inline
  // literal a string on a background (seen in PyCharm 2026-11-21), a reference is a string, a directive is a keyword
  { from: ['REST.SECTION.HEADER'], name: 'reST section header', scope: ['source.rst markup.heading'] },
  { from: ['REST.BOLD', 'TEXT'], name: 'reST bold', scope: ['source.rst markup.bold'] },
  { from: ['REST.ITALIC', 'TEXT'], name: 'reST italic', scope: ['source.rst markup.italic'] },
  { from: ['REST.FIXED', 'DEFAULT_STRING'], name: 'reST literal', scope: ['source.rst string.interpolated'] },
  { from: ['REST.REF.NAME'], name: 'reST reference', scope: ['source.rst entity.name.tag'] },
  { from: ['REST.EXPLICIT'], name: 'reST directive', scope: ['source.rst keyword.control'] },
  { from: ['REST.LINE_COMMENT'], name: 'reST comment', scope: ['source.rst comment.block'] },
];

/**
 * VS Code semantic tokens (language servers: Pylance, TypeScript…), `type.modifier` selectors. The colors of the IDE
 * come from its own analysis, which they replace for the code a language server knows.
 */
// Not `variable.readonly`: TypeScript gives it to every `const`, which the IDE does not color as a constant
export const SEMANTIC_RULES: Record<string, string[]> = {
  '*.deprecated': ['DEPRECATED_ATTRIBUTES'],
  // Rust (rust-analyzer), as RustRover draws it: calls are text, declarations blue, macros blue, lifetimes teal
  'attribute:rust': ['org.rust.ATTRIBUTE'],
  'attributeBracket:rust': ['org.rust.ATTRIBUTE'],
  'builtinType:rust': ['org.rust.PRIMITIVE_TYPE'],
  class: ['DEFAULT_CLASS_NAME', 'DEFAULT_CLASS_REFERENCE', 'TEXT'],
  'class.builtin': ['PY.BUILTIN_NAME', 'DEFAULT_PREDEFINED_SYMBOL', 'DEFAULT_CLASS_REFERENCE', 'TEXT'],
  clsParameter: ['PY.SELF_PARAMETER', 'DEFAULT_KEYWORD'],
  decorator: ['PY.DECORATOR', 'DEFAULT_METADATA'],
  enumMember: ['DEFAULT_CONSTANT'],
  function: ['DEFAULT_FUNCTION_CALL', 'TEXT'],
  'function.builtin': ['PY.BUILTIN_NAME', 'DEFAULT_PREDEFINED_SYMBOL', 'DEFAULT_FUNCTION_CALL', 'TEXT'],
  'function.declaration': ['DEFAULT_FUNCTION_DECLARATION'],
  'function.declaration:rust': ['org.rust.FUNCTION'],
  'function:rust': ['org.rust.FUNCTION_CALL', 'TEXT'],
  interface: ['DEFAULT_INTERFACE_NAME', 'DEFAULT_CLASS_NAME', 'TEXT'],
  'lifetime:rust': ['TYPE_PARAMETER_NAME_ATTRIBUTES'],
  macro: ['DEFAULT_METADATA'],
  'macro:rust': ['DEFAULT_FUNCTION_DECLARATION'],
  method: ['DEFAULT_INSTANCE_METHOD', 'DEFAULT_FUNCTION_CALL', 'TEXT'],
  'method.declaration': ['DEFAULT_FUNCTION_DECLARATION'],
  'method.declaration:python': ['PY.FUNC_DEFINITION', 'DEFAULT_FUNCTION_DECLARATION'],
  'method.declaration:rust': ['org.rust.METHOD'],
  'method.static': ['DEFAULT_STATIC_METHOD', 'DEFAULT_INSTANCE_METHOD', 'TEXT'],
  // JavaScript and TypeScript (keys of the JavaScript plugin that the Islands scheme colors): members, and the globals
  // of the standard and DOM libraries (console, window, Math…), which the language server marks `defaultLibrary`
  'method:javascript': JS_MEMBER_FUNCTION,
  'method:javascriptreact': JS_MEMBER_FUNCTION,
  'method:python': ['PY.METHOD_CALL', 'PY.FUNCTION_CALL', 'DEFAULT_FUNCTION_CALL', 'TEXT'],
  'method:rust': ['org.rust.METHOD_CALL', 'TEXT'],
  'method:typescript': JS_MEMBER_FUNCTION,
  'method:typescriptreact': JS_MEMBER_FUNCTION,
  namespace: ['DEFAULT_IDENTIFIER', 'TEXT'],
  parameter: ['DEFAULT_PARAMETER', 'DEFAULT_IDENTIFIER', 'TEXT'],
  property: ['DEFAULT_INSTANCE_FIELD'],
  'property.readonly': ['DEFAULT_INSTANCE_FIELD'],
  'property.static': ['DEFAULT_STATIC_FIELD', 'DEFAULT_INSTANCE_FIELD'],
  'property:python': ['DEFAULT_IDENTIFIER', 'TEXT'],
  'selfKeyword:rust': ['org.rust.SELF_PARAMETER'],
  selfParameter: ['PY.SELF_PARAMETER', 'DEFAULT_KEYWORD'],
  typeParameter: ['TYPE_PARAMETER_NAME_ATTRIBUTES'],
  'variable.defaultLibrary:javascript': JS_GLOBAL_VARIABLE,
  'variable.defaultLibrary:javascriptreact': JS_GLOBAL_VARIABLE,
  'variable.defaultLibrary:typescript': JS_GLOBAL_VARIABLE,
  'variable.defaultLibrary:typescriptreact': JS_GLOBAL_VARIABLE,
  'variable:python': ['PY.LOCAL_VARIABLE', 'DEFAULT_LOCAL_VARIABLE', 'DEFAULT_IDENTIFIER', 'TEXT'],
};
