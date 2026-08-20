---
slug: regex-character-classes
name: Regex Character Classes
aliases:
  - regex sets
  - bracket expressions
category: regex
tags:
  - regex
  - pattern-matching
  - sets
  - text-processing
  - filtering
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - cmd
intentPhrases:
  - regex match one of several characters
  - regex exclude characters
  - regex match a to z
  - regex match numbers only
  - regex negated set
relatedCommands:
  - grep
  - sed
  - awk
  - regex-quantifiers
  - regex-groups
  - regex-anchors
alternatives: []
status: draft
---

## What is it?

A Character Class (often called a Set) is a regular expression construct enclosed in square brackets `[]` that instructs the engine to match exactly _one_ character out of a specifically defined list or range of characters. By prepending a caret `^` inside the opening bracket (`[^]`), it becomes a Negated Character Class, instructing the engine to match exactly one character that is _not_ present in the defined list.

## Why does it exist?

Text parsing frequently requires flexibility at specific positions—such as allowing both uppercase and lowercase letters, accepting various punctuation marks, or matching any hexadecimal digit. Using logical alternation to match a hex character `(a|b|c|d|e|f|0|1|2|3|4|5|6|7|8|9)` is brutally verbose and computationally expensive. Character classes exist to provide a concise, highly optimized syntax (`[a-f0-9]`) that abstracts these variations into a flat, single-character lookup table, drastically simplifying code readability and engine execution speed.

## Syntax

```text
[abc]           Matches exactly one character: 'a', 'b', or 'c'.
[a-z]           Matches exactly one character in the ASCII range from 'a' to 'z'.
[a-zA-Z0-9]     Matches exactly one alphanumeric character (multiple ranges combined).
[^abc]          Matches exactly one character that is NOT 'a', 'b', or 'c'.
[^0-9]          Matches exactly one character that is NOT a digit.
[[:alpha:]]     POSIX bracket expression matching any alphabetic character.
```

## Flags

| Modifier               | Description                                                                                                                                           | Example Impact                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `i` (Case-Insensitive) | Forces the character class to match regardless of casing.                                                                                             | `/[a-z]/i` behaves identically to `/[a-zA-Z]/`.    |
| `u` (Unicode)          | Upgrades the evaluation logic. Instead of reading raw ASCII bytes, the class understands complex Unicode code points and astral planes (like emojis). | `/[\u{1F600}-\u{1F64F}]/u` matches an emoji range. |

## Examples

```bash
grep -E 'gr[ae]y' document.txt
```

> Matches spelling variations. The engine will match "grey" (British spelling) and "gray" (American spelling) simultaneously, by allowing the third character to be exactly 'a' or 'e'.

```bash
sed -E 's/[0-9]+/[REDACTED]/g' file.txt
```

> Sanitizes numeric data. The `[0-9]` character class defines the range of all decimal digits. Combined with the `+` quantifier, this `sed` command aggressively isolates any numerical sequence (like a phone number or ID) and replaces it with a redaction string.

```bash
grep -E '^[^#]' config.ini
```

> Negated line filtering. The first `^` anchors the match to the start of the line. The `[^#]` is a negated character class that matches exactly one character that is _not_ a hash symbol. This cleanly prints all active configuration lines while ignoring comments and empty lines.

```bash
python -c "import re; print(re.sub(r'[^\w\s]', '', 'Hello! World?'))"
```

> Aggressive punctuation stripping. This leverages built-in shorthand character classes. `\w` is shorthand for `[a-zA-Z0-9_]`, and `\s` is whitespace. The negated class `[^\w\s]` targets any character that is NOT alphanumeric or whitespace (like `!` and `?`), deleting them to clean the string.

```bash
grep -E '[[:xdigit:]]{4}' mac_addresses.txt
```

> Utilizing POSIX classes. Instead of writing `[a-fA-F0-9]`, `grep` and `awk` support strictly defined POSIX character classes. `[:xdigit:]` inherently understands the definition of a hexadecimal character, mapping perfectly to system locale definitions.

## Real-World Scenarios

**Log File Error Extraction**

> When tailing a web server log, HTTP status codes ranging from 400 to 599 indicate client or server errors. A DevOps engineer uses the regex `HTTP/1\.1 [45][0-9][0-9]` to cleanly capture any 4xx or 5xx error code, explicitly ignoring successful 200 or 300 series responses.

**Parsing HTML/XML Attributes**

> While regex should generally not parse HTML, extracting a specific attribute safely is possible using negated classes. To extract the `href` value without greedily consuming the rest of the file, developers use `href="([^"]+)"`. The negated class `[^"]` matches everything _until_ it hits the closing quotation mark, guaranteeing a clean capture.

## When should it NOT be used?

- **Matching whole words:** **Do not use `[cat]` expecting to match the word "cat".** A character class matches exactly _one_ character. `[cat]` means "match the letter c, OR the letter a, OR the letter t". To match a sequence of characters, you must use a capture group or raw text: `(cat)`.
- **Replacing Lookarounds:** If you want to match "a" but only if it's not followed by "b", `a[^b]` is often incorrect. `[^b]` actually _consumes_ the next character. If the string is just "a", the regex fails because there is no character to match the class. You must use negative lookaheads `a(?!b)` instead.

## Alternatives

- **Alternation `(a|b|c)`:** **Best for multi-character sequences.** If your options are full strings (e.g., `(cat|dog)`), you must use alternation.
- **Shorthand Character Classes:** **Best for standard sets.** Engines provide `\d` (digits), `\w` (word characters), and `\s` (whitespace) to replace `[0-9]`, `[a-zA-Z0-9_]`, and `[ \t\r\n\f]`, drastically improving readability.

## How it works internally

Character classes are the most highly optimized constructs in a regular expression engine. During compilation, the regex engine evaluates the bracket expression and creates a flat lookup structure—often a simple 256-bit bitset (for ASCII/UTF-8 single-byte matches).

If the pattern is `[aeiou]`, the engine flips the bits corresponding to the ASCII values of those 5 vowels to `1`. When the engine evaluates a string, it takes the current character, checks its ASCII integer value, and performs a direct `O(1)` array lookup against the bitset.

This is why `[a-d]` is radically faster than `(a|b|c|d)`. Alternation `(|)` forces the engine's Non-deterministic Finite Automaton (NFA) to create separate execution branches, saving state and performing heavy backtracking if a branch fails. A character class creates zero execution branches; it is a single, atomic boolean check against a memory map.

## Performance Notes

- **Negated Class Efficiency:** Using `[^"]*` instead of `.*` is one of the most critical performance optimizations in regex. `.*` (greedy dot) consumes the entire string and then slowly backtracks. `[^"]*` blindly consumes characters at lightning speed until it hits a quote, generating zero backtracking states.

## Security Notes

- **The Negated Class Trap:** A massive security vulnerability in input sanitization is using a negated class incorrectly. If a developer uses `[^a-z]` to ban illegal characters, they accidentally _allow_ null bytes (`\x00`), control characters, and Unicode invisible spaces through the filter. For absolute security, always use a strict positive whitelist (`^[a-zA-Z0-9]+$`) rather than attempting to blacklist evil characters.

## Common Mistakes

- **Escaping metacharacters inside brackets**
  - _Mistake:_ Writing `[\.\*\?]` to match a literal dot, asterisk, or question mark.
  - _Why:_ Inside a character class, standard regex metacharacters completely lose their magic power. `.` does not mean "any character"; it literally means a dot. Over-escaping inside brackets makes the regex unreadable and can sometimes cause errors depending on the engine. `[.*?]+` works perfectly without escapes.
- **Misplacing the hyphen (`-`)**
  - _Mistake:_ Writing `[a-z-A-Z]` to match a letter or a hyphen.
  - _Why:_ The hyphen indicates a range. If placed between two characters, the engine treats it mathematically based on ASCII values. To include a literal hyphen in a character class, it must be the absolute first or absolute last character in the brackets: `[-a-zA-Z]` or `[a-zA-Z-]`.
- **Misplacing the caret (`^`)**
  - _Mistake:_ Writing `[a-z^0-9]` to match letters, numbers, or a caret.
  - _Why:_ The caret only acts as a negation operator if it is the absolute first character after the opening bracket `[^`. If placed anywhere else in the class, it loses its magic power and is treated as a literal caret character.

## Best Practices

- **Prioritize POSIX Classes in Bash:** When writing `grep` or `sed` scripts intended to run globally, use `[[:lower:]]` instead of `[a-z]`. Depending on the server's locale variables (`LC_ALL=et_EE.UTF-8`), the range `[a-z]` might unexpectedly match uppercase letters or specific accented characters due to foreign language collation rules. POSIX classes enforce strict behavior.
- **Combine Shorthands:** Modern engines allow combining shorthand classes inside brackets. `[\w\-]` is a clean, modern way to say "match any alphanumeric character, underscore, or a literal hyphen."

## Interview Questions

**Q: You need to match a literal hyphen `-`, a literal caret `^`, and a literal right bracket `]` using a single character class. How do you write this bracket expression without using any backslash escapes?**
**A:** The regex is `[]^-]`. To avoid escapes, the right bracket `]` must be the absolute first character in the class. The caret `^` must NOT be the first character (to avoid negating the class). The hyphen `-` must be the absolute last character to prevent it from establishing a range.

**Q: A developer writes `grep -E '[error|warning]' log.txt`. They expect this to return lines containing either the word "error" or the word "warning". Why does this fail to achieve the intended result, and what does it actually match?**
**A:** Square brackets define a character class, which matches exactly one single character from the provided pool. The engine interprets `[error|warning]` as a pool of distinct characters: `e, r, o, |, w, a, n, i, g`. It will match any single instance of those letters or the pipe symbol anywhere in the text. To match full words using alternation, they must use a capture or non-capturing group with parentheses: `grep -E '(error|warning)' log.txt`.

## Practice Problems

**Problem:** You are parsing a configuration file. You need to write a character class that matches exactly one hexadecimal digit (a number from 0 to 9, or a letter from A to F, case-insensitive).
**Hint:** Combine the numeric range and alphabetical ranges inside a single bracket.
**Solution:**

```bash
grep -E '[0-9a-fA-F]' config.txt
```

**Problem:** You need to extract data enclosed in single quotes (e.g., `'secret_data'`). Write a regex using a negated character class that matches a single quote, followed by any number of characters that are NOT a single quote, followed by a closing single quote.
**Hint:** Use the caret symbol immediately inside the brackets to invert the match.
**Solution:**

```bash
grep -E "'[^']*'" file.txt
```

## References

- [Character Classes or Character Sets (Regular-Expressions.info)](https://www.regular-expressions.info/charclass.html)
- [PCRE POSIX Character Classes](https://pcre.org/current/doc/html/pcre2syntax.html#SEC10)
