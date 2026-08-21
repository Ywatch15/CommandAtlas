---
slug: regex-alternation
name: Regex Alternation
aliases:
  - regex or
  - boolean or regex
  - pipe operator
category: regex
tags:
  - regex
  - pattern-matching
  - alternation
  - boolean-logic
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
  - sh
intentPhrases:
  - match one string or another regex
  - regex boolean OR condition
  - match multiple words in grep
  - regex pipe symbol meaning
  - find this or that pattern
relatedCommands:
  - grep
  - sed
  - awk
  - regex-shorthand-classes
alternatives: []
status: draft
---

## What is it?

Regex alternation relies on the pipe symbol (`|`) to function as a boolean OR operator within a regular expression. It evaluates multiple, distinct pattern sequences left-to-right, instructing the regex engine to return a successful match if the target text satisfies _any_ of the explicitly delimited options.

## Why does it exist?

When searching text streams for a diverse set of expected values—such as multiple HTTP status codes, various spelling localizations, or distinct error levels—executing separate, sequential scans for every variation is computationally expensive and logically tedious. Alternation exists to consolidate divergent pattern criteria into a single, unified execution pass, allowing a single regex engine invocation to catch multiple disparate states simultaneously.

## Syntax

```regex
PatternA|PatternB|PatternC
(SubPatternA|SubPatternB)SharedSuffix
```

## Flags

| Modifier         | Description                                                                                                                                                    | Example Impact                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `(?i)`           | **Case-insensitivity:** Forces the engine to ignore case across all alternated branches.                                                                       | `(?i)cat                         | dog`matches`CaT`and`DOG`           |
| `Extended Regex` | **Syntax Support:** In basic POSIX (e.g., standard `grep` or `sed`), the pipe must be escaped (`\|`). Extended regex (`grep -E`, `sed -E`) natively supports ` | `.                               | `grep 'cat\|dog'` vs `grep -E 'cat | dog'` |
| `(?J)`           | **Duplicate Group Names (PCRE):** Allows multiple branches of an alternation to use the exact same named capture group identifier.                             | `(?J)(?<name>foo)\|(?<name>bar)` |

## Examples

```bash
grep -E 'ERROR|CRITICAL|FATAL' /var/log/syslog
```

> This invokes `grep` using Extended Regular Expressions (`-E`) to parse a system log, returning any line that contains the exact string `ERROR`, `CRITICAL`, or `FATAL`.

```bash
sed -E 's/col(o|ou)r/color/g' article.txt
```

> This uses alternation inside a capturing group `(o|ou)` to locate both American ("color") and British ("colour") spellings, homogenizing the text to a single spelling using `sed`.

```python
re.search(r'^(http|https|ftp)://', url_string)
```

> This uses alternation wrapped in parentheses to anchor a network protocol check to the very beginning of a string (`^`), ensuring the URL starts with one of the three permitted schemes.

```bash
rg 'login_(success|failure|timeout)_count' metrics.log
```

> This leverages `ripgrep` (`rg`) to match a specific set of operational metric variables sharing an identical prefix (`login_`) and suffix (`_count`), utilizing alternation for the mutable middle segment.

```bash
grep -P '(?i)\b(jpg|jpeg|png|gif)\b' access.log
```

> This utilizes PCRE (`-P`) to match image file extensions regardless of case (`(?i)`), bounding the alternation with word boundaries (`\b`) to prevent matching substrings like "png" inside a longer, unrelated word.

## Real-World Scenarios

**Parsing Mixed Application Log Levels**

```bash
tail -f app.log | grep -E --color=always '\b(WARN|ERROR)\b'
```

> Systems administrators tailing aggressive application logs use alternation paired with word boundaries to visually highlight only the specific severity levels indicating degraded health, filtering out noisy `INFO` and `DEBUG` events in real-time.

**Scraping Configuration Arrays for Specific Identifiers**

```bash
awk '/^(DB_HOST|REDIS_HOST|CACHE_IP)=/ {print $0}' .env
```

> DevOps deployment pipelines scanning `.env` configuration manifests use alternation mapped to the start of the line (`^`) to extract exclusively the infrastructure routing variables required for a specific CI/CD build step.

**Filtering Hardware Architectures**

```bash
grep -E '(x86_64|aarch64|armv7l)' architectures.list
```

> Build automation scripts sorting compiled container manifests use alternation to isolate software packages built strictly for modern 64-bit and ARM server architectures.

## When should it NOT be used?

- **Matching single characters:** **Reason:** Using `a|b|c|d` is unnecessarily verbose and processes slower than a character class. **Use instead:** Character classes like `[abcd]` or ranges like `[a-d]`.
- **Matching simple optional characters:** **Reason:** Using `http|https` involves branching logic which is heavier than evaluating a single optional character. **Use instead:** The optional quantifier `?` (e.g., `https?`).
- **Complex, heavily nested branching logic on massive files:** **Reason:** Massive, unoptimized alternations (e.g., matching thousands of individual words via `word1|word2|...|word999`) cause severe performance bottlenecks in standard regex engines. **Use instead:** Pre-compiled dictionary structures or tools like `fgrep`/`grep -F` with a newline-separated patterns file (`-f`).

## Alternatives

- **Character Classes (`[aeiou]`):** The standard. **Tradeoff:** Perfect and significantly faster for single-character OR logic, but structurally incapable of matching multi-character sequences or words.
- **Optional Quantifiers (`s?`):** Simple omission. **Tradeoff:** Cleanest way to express "X with or without Y" (like `cars?`), but cannot express "X or completely different Y" (like `car|truck`).

## How it works internally

The behavior of the alternation operator depends heavily on the underlying regex engine architecture: Non-Deterministic Finite Automata (NFA) versus Deterministic Finite Automata (DFA).

In an **NFA engine** (used by PCRE, Python, Perl, Node.js), alternation is evaluated strictly left-to-right. The engine tests the first branch; if it matches, the engine accepts it and immediately stops evaluating the remaining branches. This is called "eager matching." Consequently, if your pattern is `foo|foobar` and the target text is `foobar`, the NFA engine matches `foo` and stops.

In a **DFA/POSIX engine** (used by standard `awk`, `grep -E`), the engine evaluates all potential branches simultaneously and always returns the longest possible match. In the `foo|foobar` example against the text `foobar`, a DFA engine will correctly identify and match the full `foobar` string.

Regardless of the engine, alternation possesses the lowest precedence of all regex operators. `^cat|dog$` means "Start with cat OR end with dog", not "Start and end with cat or dog". Parentheses `^(cat|dog)$` are required to scope the alternation boundary correctly.

## Performance Notes

- **Catastrophic Backtracking:** In NFA engines, nesting alternations inside quantifiers (e.g., `(a|b|c)+`) forces the engine to maintain massive state trees. If a match fails late in the string, the engine backtracks and attempts every permutation of the alternation, freezing the CPU for hours.
- **Prefix Factorization:** Modern PCRE engines attempt to optimize alternations by factoring out common prefixes using a Trie data structure. However, writing `pre_cat|pre_dog` is generally evaluated slower than explicitly factoring the regex yourself: `pre_(cat|dog)`.
- **Order Matters in NFA:** Because NFA evaluates left-to-right, always place the most statistically likely match at the very beginning of the alternation (e.g., `common_word|rare_word`) to force early short-circuiting and save CPU cycles.

## Security Notes

- **ReDoS (Regular Expression Denial of Service):** Poorly structured, unanchored alternations exposed to user input can be exploited to lock up web servers. Attackers submit carefully crafted strings that force the server's regex engine into extreme backtracking loops. Always enforce strict match lengths and avoid nested optional alternations.

## Common Mistakes

- **Omitting grouping parentheses:** Writing `grep -E 'start_foo|bar_end'`. **Why it's wrong:** The pipe operator splits the entire regex into two halves. This matches the string `start_foo` anywhere, OR `bar_end` anywhere. To match `start_foo_end` or `start_bar_end`, you must group the alternation: `grep -E 'start_(foo|bar)_end'`.
- **NFA Ordering Shadowing:** Writing `re.search(r'car|carpet', 'carpet')` in Python. **Why it's wrong:** Python is an NFA engine. It evaluates `car` first, sees a valid match at the beginning of `carpet`, and exits successfully, returning `car` instead of the full word `carpet`. In NFA engines, longer branches must precede shorter branches that share the same prefix: `carpet|car`.
- **Using basic POSIX without escaping:** Running `grep 'cat|dog' file.txt`. **Why it's wrong:** Standard `grep` uses Basic Regular Expressions (BRE), which treats the pipe as a literal pipe character. It will strictly search for the literal string `cat|dog`. You must use `-E` or escape it (`cat\|dog`).

## Best Practices

- Universally wrap your alternations in non-capturing groups `(?:cat|dog)` instead of standard capturing groups `(cat|dog)` unless you explicitly need to extract the matched value later. Capturing incurs unnecessary memory allocation overhead.
- Sort alternations by length (longest to shortest) when using NFA engines (PCRE/Python/JS) to prevent shorter substrings from shadowing legitimate, longer multi-word matches.
- Combine alternation with word boundaries (`\b(cat|dog)\b`) when parsing natural language to prevent false-positive substring matches (e.g., preventing `cat` from accidentally matching inside `concatenate`).

## Interview Questions

**Q:** In a Python script evaluating the text `superman`, the regex `super|superman` is applied. What string does the regex engine return as the match, and why?
**A:** The engine returns `super`. Python utilizes a traditional NFA regex engine, which evaluates alternations strictly left-to-right. It tests `super`, finds a valid match, accepts it, and stops processing immediately, completely ignoring the longer `superman` branch.
**Q:** Why does `grep 'error|warn' log.txt` fail to find lines containing the word "error", and how do you resolve it?
**A:** Standard `grep` defaults to Basic Regular Expressions (BRE), where the pipe symbol is treated as a literal character. The command is literally looking for the exact string "error|warn". To resolve this, you must either escape the pipe (`error\|warn`) or invoke Extended Regular Expressions using `grep -E` (or `egrep`).
**Q:** You want to find files containing the extension `.jpg`, `.png`, or `.gif`. Is `.[jpg|png|gif]` a valid regular expression to achieve this? Why or why not?
**A:** No, it is completely invalid. The square brackets denote a Character Class, which evaluates individual characters, not multi-character sequences. Inside a character class, the pipe `|` loses its special alternation meaning and becomes a literal pipe character. That regex would match any single character followed by one of the letters `j,p,g,n,i,f` or a literal `|`. The correct syntax uses parentheses: `\.(jpg|png|gif)`.

## Practice Problems

**Problem:** Use `grep -E` to find all lines in `/var/log/auth.log` that contain either the string `Failed password` or the string `Invalid user`.
**Hint:** Utilize the extended regex flag, enclose the two target strings inside quotes, and separate them with the boolean OR operator.
**Solution:** `grep -E 'Failed password|Invalid user' /var/log/auth.log`
**Problem:** Write a regex pattern that matches either an IPv4 localhost address (`127.0.0.1`) or the IPv6 localhost address (`::1`). Ensure the alternation is properly grouped so it doesn't accidentally bind to surrounding text anchors.
**Hint:** Enclose the two options inside parentheses, escape the literal dots in the IPv4 address, and use the pipe separator.
**Solution:** `(127\.0\.0\.1|::1)`

## References

- [Regular-Expressions.info: Alternation with The Vertical Bar or Pipe Symbol](https://www.regular-expressions.info/alternation.html)
- [GNU Grep Manual - Basic vs Extended Regular Expressions](https://www.gnu.org/software/grep/manual/html_node/Basic-vs-Extended.html)
