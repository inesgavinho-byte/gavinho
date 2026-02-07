// =====================================================
// SYNTAX HIGHLIGHTER
// Lightweight code syntax highlighting without dependencies
// Supports: JavaScript, TypeScript, Python, HTML, CSS, JSON, SQL, Bash, Go, Rust
// =====================================================

// Token types for styling
const TOKEN_TYPES = {
  KEYWORD: 'sh-keyword',
  STRING: 'sh-string',
  NUMBER: 'sh-number',
  COMMENT: 'sh-comment',
  FUNCTION: 'sh-function',
  OPERATOR: 'sh-operator',
  PUNCTUATION: 'sh-punctuation',
  PROPERTY: 'sh-property',
  CLASS: 'sh-class',
  BUILTIN: 'sh-builtin',
  VARIABLE: 'sh-variable',
  TAG: 'sh-tag',
  ATTRIBUTE: 'sh-attribute',
  SELECTOR: 'sh-selector',
  REGEX: 'sh-regex'
}

// Language definitions
const LANGUAGES = {
  javascript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|delete|typeof|instanceof|in|of|class|extends|constructor|super|static|get|set|async|await|yield|import|export|default|from|as|null|undefined|true|false|this|void)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-f]+|0b[01]+|0o[0-7]+)\b/gi,
    functions: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
    operators: /([+\-*/%=<>!&|^~?:]+|\.{3})/g,
    regex: /\/(?![*/])(?:[^\\/\n]|\\.)+\/[gimsuy]*/g
  },
  typescript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|delete|typeof|instanceof|in|of|class|extends|constructor|super|static|get|set|async|await|yield|import|export|default|from|as|null|undefined|true|false|this|void|type|interface|enum|namespace|module|declare|readonly|public|private|protected|abstract|implements|keyof|infer|never|unknown|any)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-f]+)\b/gi,
    functions: /\b([a-zA-Z_$][\w$]*)\s*(?=\(|<)/g,
    operators: /([+\-*/%=<>!&|^~?:]+|\.{3})/g,
    types: /\b([A-Z][a-zA-Z0-9]*)\b/g
  },
  python: {
    keywords: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None)\b/g,
    strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(#.*$)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-f]+|0b[01]+|0o[0-7]+)\b/gi,
    functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
    decorators: /(@[\w.]+)/g,
    builtins: /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|open|input|type|isinstance|hasattr|getattr|setattr|super|property|staticmethod|classmethod|abs|all|any|bin|chr|dir|divmod|enumerate|eval|exec|filter|format|frozenset|globals|hash|help|hex|id|iter|locals|map|max|min|next|object|oct|ord|pow|repr|reversed|round|slice|sorted|sum|vars|zip)\b/g
  },
  html: {
    tags: /(<\/?[\w-]+)/g,
    attributes: /\s([\w-]+)(?==)/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(<!--[\s\S]*?-->)/g
  },
  css: {
    selectors: /([.#]?[\w-]+)(?=\s*\{)|(@[\w-]+)/g,
    properties: /([\w-]+)(?=\s*:)/g,
    values: /:\s*([^;{}]+)/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?)\b/g,
    colors: /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi
  },
  json: {
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    numbers: /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
    keywords: /\b(true|false|null)\b/g,
    punctuation: /([{}[\]:,])/g
  },
  sql: {
    keywords: /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MAX|MIN|BETWEEN|LIKE|IN|IS|NULL|NOT|EXISTS|UNION|ALL|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|AUTO_INCREMENT|CASCADE|CONSTRAINT)\b/gi,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(--.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*)\b/g,
    operators: /([=<>!]+|AND|OR|NOT)/gi
  },
  bash: {
    keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|local|export|source|alias|unalias|set|unset|readonly|declare|typeset|trap|exit|break|continue|shift|echo|printf|read|cd|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|xargs|chmod|chown|sudo|apt|yum|npm|yarn|git|docker|curl|wget)\b/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(#.*$)/gm,
    variables: /(\$[\w{][^}\s]*}?|\$\w+)/g,
    operators: /([|&;><]+|&&|\|\|)/g
  },
  go: {
    keywords: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|true|false|nil|iota)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-f]+)\b/gi,
    functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
    types: /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|complex64|complex128|byte|rune|string|bool|error|any)\b/g
  },
  rust: {
    keywords: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-f]+|0b[01]+|0o[0-7]+)\b/gi,
    functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
    macros: /\b([a-zA-Z_][\w]*!)/g,
    types: /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Result|Box|Rc|Arc|Cell|RefCell)\b/g,
    lifetimes: /'[a-z]+/g
  }
}

// Language aliases
const LANGUAGE_ALIASES = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'json',
  yaml: 'json',
  htm: 'html',
  xml: 'html',
  scss: 'css',
  sass: 'css',
  less: 'css',
  golang: 'go',
  rs: 'rust',
  mysql: 'sql',
  postgresql: 'sql',
  psql: 'sql'
}

/**
 * Escape HTML characters
 */
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Wrap text in a span with the given class
 */
const wrap = (text, className) => `<span class="${className}">${text}</span>`

/**
 * Highlight code with syntax highlighting
 * @param {string} code - The code to highlight
 * @param {string} language - The programming language
 * @returns {string} HTML string with highlighted code
 */
export const highlightCode = (code, language = '') => {
  if (!code) return ''

  // Normalize language name
  const normalizedLang = (language || '').toLowerCase().trim()
  const langKey = LANGUAGE_ALIASES[normalizedLang] || normalizedLang

  // Get language definition
  const langDef = LANGUAGES[langKey]

  // If no language definition, return escaped code
  if (!langDef) {
    return escapeHtml(code)
  }

  // Escape HTML first
  let result = escapeHtml(code)

  // Store strings and comments to protect them
  const protectedStrings = []
  const protectedComments = []

  // 1. Protect and highlight comments first
  if (langDef.comments) {
    result = result.replace(langDef.comments, (match) => {
      const index = protectedComments.length
      protectedComments.push(wrap(match, TOKEN_TYPES.COMMENT))
      return `__COMMENT_${index}__`
    })
  }

  // 2. Protect and highlight strings
  if (langDef.strings) {
    result = result.replace(langDef.strings, (match) => {
      const index = protectedStrings.length
      protectedStrings.push(wrap(match, TOKEN_TYPES.STRING))
      return `__STRING_${index}__`
    })
  }

  // 3. Highlight regex (JavaScript)
  if (langDef.regex) {
    result = result.replace(langDef.regex, match => wrap(match, TOKEN_TYPES.REGEX))
  }

  // 4. Highlight decorators (Python)
  if (langDef.decorators) {
    result = result.replace(langDef.decorators, match => wrap(match, TOKEN_TYPES.BUILTIN))
  }

  // 5. Highlight macros (Rust)
  if (langDef.macros) {
    result = result.replace(langDef.macros, match => wrap(match, TOKEN_TYPES.BUILTIN))
  }

  // 6. Highlight lifetimes (Rust)
  if (langDef.lifetimes) {
    result = result.replace(langDef.lifetimes, match => wrap(match, TOKEN_TYPES.VARIABLE))
  }

  // 7. Highlight variables (Bash)
  if (langDef.variables) {
    result = result.replace(langDef.variables, match => wrap(match, TOKEN_TYPES.VARIABLE))
  }

  // 8. Highlight colors (CSS)
  if (langDef.colors) {
    result = result.replace(langDef.colors, match => wrap(match, TOKEN_TYPES.NUMBER))
  }

  // 9. Highlight HTML tags
  if (langDef.tags) {
    result = result.replace(langDef.tags, match => wrap(match, TOKEN_TYPES.TAG))
  }

  // 10. Highlight HTML attributes
  if (langDef.attributes) {
    result = result.replace(langDef.attributes, (match, attr) => ' ' + wrap(attr, TOKEN_TYPES.ATTRIBUTE))
  }

  // 11. Highlight CSS selectors
  if (langDef.selectors) {
    result = result.replace(langDef.selectors, match => wrap(match, TOKEN_TYPES.SELECTOR))
  }

  // 12. Highlight CSS properties
  if (langDef.properties) {
    result = result.replace(langDef.properties, match => wrap(match, TOKEN_TYPES.PROPERTY))
  }

  // 13. Highlight types
  if (langDef.types) {
    result = result.replace(langDef.types, match => wrap(match, TOKEN_TYPES.CLASS))
  }

  // 14. Highlight builtins
  if (langDef.builtins) {
    result = result.replace(langDef.builtins, match => wrap(match, TOKEN_TYPES.BUILTIN))
  }

  // 15. Highlight functions (before keywords to avoid conflicts)
  if (langDef.functions) {
    result = result.replace(langDef.functions, match => wrap(match, TOKEN_TYPES.FUNCTION))
  }

  // 16. Highlight keywords
  if (langDef.keywords) {
    result = result.replace(langDef.keywords, match => wrap(match, TOKEN_TYPES.KEYWORD))
  }

  // 17. Highlight numbers
  if (langDef.numbers) {
    result = result.replace(langDef.numbers, match => wrap(match, TOKEN_TYPES.NUMBER))
  }

  // 18. Highlight punctuation (JSON)
  if (langDef.punctuation) {
    result = result.replace(langDef.punctuation, match => wrap(match, TOKEN_TYPES.PUNCTUATION))
  }

  // Restore strings
  protectedStrings.forEach((str, index) => {
    result = result.replace(`__STRING_${index}__`, str)
  })

  // Restore comments
  protectedComments.forEach((comment, index) => {
    result = result.replace(`__COMMENT_${index}__`, comment)
  })

  return result
}

/**
 * Get list of supported languages
 */
export const getSupportedLanguages = () => {
  const languages = Object.keys(LANGUAGES)
  const aliases = Object.keys(LANGUAGE_ALIASES)
  return [...new Set([...languages, ...aliases])].sort()
}

/**
 * Check if a language is supported
 */
export const isLanguageSupported = (language) => {
  const normalizedLang = (language || '').toLowerCase().trim()
  const langKey = LANGUAGE_ALIASES[normalizedLang] || normalizedLang
  return langKey in LANGUAGES
}

export default highlightCode
