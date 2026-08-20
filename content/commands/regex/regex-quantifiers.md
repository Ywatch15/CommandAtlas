---
slug: regex-quantifiers
name: Regex Quantifiers
aliases:
  - regex repetition
  - greedy lazy quantifiers
category: regex
tags:
  - regex
  - pattern-matching
  - repetition
  - text-processing
  - performance
difficulty: intermediate
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
  - regex match multiple times
  - regex optional character
  - regex match one or more
  - regex greedy vs lazy
  - regex match specific length
relatedCommands:
  - grep
  - sed
  - awk
  - regex-groups
  - regex-character-classes
  - regex-anchors
alternatives: []
status: draft
---

## What is it?

Regex quantifiers are operators that immediately follow a token (a literal character, a character class, or a group) and define how many consecutive times that specific token must appear in the input string for the match to succeed. They range from zero-or-more (`*`), one-or-more (`+`), exactly zero-or-one (`?`), to explicit, mathematically bounded repetition ranges (`{min,max}`).

## Why does it exist?

Text patterns are rarely a fixed length. An IP address might have 1, 2, or 3 digits per octet. An HTML document contains arbitrary amounts of whitespace. Without quantifiers, attempting to match a 10-digit phone number would require explicitly typing `\d\d\d\d\d\d\d\d\d\d`, and matching a variable-length log payload would be mathematically impossible. Quantifiers exist to introduce dynamic elasticity into regular expressions, allowing a single, concise pattern to seamlessly absorb and validate data structures of completely unknown lengths.

## Syntax

```text
a*          Matches 'a' ZERO or more times. (e.g., matches "", "a", "aaa")
a+          Matches 'a' ONE or more times. (e.g., matches "a", "aaa". Fails on "")
a?          Matches 'a' ZERO or ONE time. Makes the token optional.
a{3}        Matches 'a' exactly 3 times.
a{3,}       Matches 'a' at least 3 times, up to infinity.
a{3,5}      Matches 'a' between 3 and 5 times, inclusive.
a*?         Lazy evaluation. Matches ZERO or more times, but consumes as FEW characters as possible.
a+?         Lazy evaluation. Matches ONE or more times, consuming as FEW characters as possible.
```

## Flags

| Modifier       | Description                                                                                                                                                                                                              | Example Impact         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `s` (Dotall)   | Alters the behavior of the `.` metacharacter. By default, `.*` stops at a newline. With `s` enabled, `.*` becomes a true wildcard, allowing a single quantifier to consume massive blocks of text across multiple lines. | `/<data>.*?<\/data>/s` |
| `U` (Ungreedy) | (PCRE specific). Inverts the engine's default evaluation mode. All standard quantifiers (`*`, `+`) become lazy by default, and appending a `?` (e.g., `*?`) makes them greedy.                                           | `/".*"/U`              |

## Examples

```bash
grep -E 'colou?r' text.txt
```

> The optional character. The `?` applies strictly to the `u` preceding it. This commands the engine to match both the American spelling ("color") and the British spelling ("colour"), making the `u` entirely optional for a successful match.

```bash
sed -E 's/ +/ /g' messy_document.txt
```

> Normalizing whitespace. A literal space is followed by the `+` (one-or-more) quantifier. This matches sequences of 1, 2, or 100 spaces and instructs `sed` to replace the entire massive sequence with a single, clean space character.

```bash
grep -E '^[0-9]{3}-[0-9]{3}-[0-9]{4}$' contacts.csv
```

> Enforcing strict bounds. Using curly brace quantifiers `{n}`, this pattern mathematically guarantees that a phone number string conforms perfectly to the standard US formatting (3 digits, a dash, 3 digits, a dash, 4 digits).

```bash
grep -E '^A.*Z$' alphabet.txt
```

> The greedy wildcard. The `.` (any character) combined with `*` (zero or more times) tells the engine to match the letter A, consume absolutely everything it possibly can across the entire line, and anchor the end of the match to the final letter Z.

```bash
python -c "import re; print(re.findall(r'<.*?>', '<b>bold</b><i>italic</i>'))"
```

> The lazy wildcard. In HTML parsing, `.*` would greedily consume the entire string from the first `<` to the absolute last `>`. By appending `?` to the quantifier (`.*?`), the engine becomes "lazy". It consumes characters until it sees the _very first_ `>` it can find, cleanly extracting `<b>` and `<i>` as separate matches.

## Real-World Scenarios

**Isolating IP Addresses**

> When extracting IPv4 addresses from an NGINX access log, an administrator uses `[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}`. The `{1,3}` quantifier ensures the engine matches octets ranging from single digits (`10.0.0.1`) up to three digits (`192.168.100.100`), perfectly encapsulating the variable nature of IP assignments.

**Log Truncation and Extraction**

> When dealing with application stack traces where a developer only wants the text residing between double quotes, they rely on lazy quantifiers (`"(.*?)"`) or negated character classes with greedy quantifiers (`"([^"]*)"`) to rapidly extract variable-length payloads without accidentally absorbing the surrounding JSON framework.

## When should it NOT be used?

- **Parsing deeply nested structures:** **Do not use `.*` to parse recursive XML or HTML.** Quantifiers operate linearly; they cannot maintain a state stack to balance deeply nested, recursive `<div>` tags. Attempting to use greedy or lazy quantifiers for this will inevitably match across incorrect tag boundaries. You must use dedicated DOM parsers (like `BeautifulSoup` or `jq`).
- **Exact length limits with alternation:** If you want a string of `a` or `b` that is exactly 3 characters long, doing `(a|b){3}` works. But if you want exactly one `a` and two `b`s in any order, quantifiers cannot enforce mathematical permutations.

## Alternatives

- **Explicit Repetition:** **Best for extremely short sequences.** For parsing exactly two digits, writing `\d\d` is technically faster for the engine to compile and execute than `\d{2}`, though the performance delta is microscopically small.
- **Negated Classes:** **Best for delimited extraction.** Instead of using the lazy `.*?` to stop at a comma, using `[^,]*` is mathematically superior. It consumes text greedily and safely without requiring the engine to constantly backtrack and check for the delimiter.

## How it works internally

Regex engines (specifically Non-deterministic Finite Automata, or NFAs, used by Perl/Python/Java) process quantifiers using a technique called **Backtracking**.

When the engine encounters a **Greedy** quantifier (`.*`), it aggressively consumes _every single character_ until the end of the string. It then looks at the next token in the regex (e.g., `Z`). Because it is at the end of the string and cannot find `Z`, it steps backward (backtracks), yielding one character at a time, repeatedly checking if the remaining string matches `Z`.

When the engine encounters a **Lazy** quantifier (`.*?`), it does the exact opposite. It consumes _zero_ characters, and immediately checks if the next token (`Z`) matches. If it fails, it consumes 1 character, and checks again. It expands its consumption slowly, character by character, until the subsequent token passes.

## Performance Notes

- **Catastrophic Backtracking:** The most dangerous vulnerability in regular expressions. If you nest an unbounded quantifier inside another unbounded quantifier, e.g., `(a+)+b`, and feed it the string `"aaaaaaaaaaaaaaaaaaaaac"`, the engine attempts to match. Because it fails to find `b` at the end, it backtracks. It attempts every single mathematical permutation of grouping the `a`s (e.g., `(aa)(aa)`, `(a)(a)(aa)`) before finally giving up. This results in $O(2^n)$ exponential execution time, completely locking up a CPU core for hours on a 30-character string.

## Security Notes

- **ReDoS (Regular Expression Denial of Service):** Attackers explicitly craft malicious input strings designed to trigger catastrophic backtracking on poorly written backend regex validations. To mitigate ReDoS, developers must strictly avoid nested quantifiers, utilize strict upper bounds (`{1,50}` instead of `+`), and prefer negated character classes over lazy `.*?` wildcards.
- **Possessive Quantifiers (`*+`):** Modern engines (like PCRE and Java) support possessive quantifiers. If you use `.*+`, the engine greedily consumes the entire string, but mathematically refuses to ever give up a character to backtrack. If the next token fails, the entire regex fails instantly. This is a primary defense mechanism against ReDoS.

## Common Mistakes

- **Greedy HTML Matching**
  - _Mistake:_ Using `<.*>` to extract an HTML tag from `<h1>Title</h1>`.
  - _Why:_ `*` is greedy. It matches the first `<`, consumes the entire string including the inner text, and matches the absolute final `>` at the end of the string. The output will be the entire `<h1>Title</h1>` string, not just `<h1>`. You must use the lazy `*?` quantifier or a negated class `[^>]*`.
- **Misunderstanding `?` Context**
  - _Mistake:_ Confusing `a?` with `*?`.
  - _Why:_ The `?` symbol is overloaded. If it follows a standard character or group (`colou?r`), it means "Zero or One time" (optional). If it immediately follows another quantifier (`.*?`, `.+?`), it completely changes meaning to become the "Lazy" modifier.
- **Applying quantifiers to strings instead of groups**
  - _Mistake:_ Writing `cat{3}` expecting to match "catcatcat".
  - _Why:_ A quantifier strictly applies to the _single immediately preceding token_. `cat{3}` maps to `c`, `a`, `t{3}`, which matches "cattt". To repeat the whole word, you must use a group: `(cat){3}`.

## Best Practices

- **Favor Negated Classes over Lazy Quantifiers:** If extracting a string enclosed in double quotes, `"[^"]*"` is exponentially faster and safer than `".*?"`. The negated class never backtracks, resulting in $O(N)$ linear time execution.
- **Use Strict Boundaries:** Never use `+` or `*` if the business logic dictates a limit. If a username must be between 3 and 16 characters, explicitly use `^[a-zA-Z0-9]{3,16}$`. Bounding quantifiers prevents the engine from parsing infinitely long malicious payloads.

## Interview Questions

**Q: Explain the execution difference between a greedy quantifier (`.*`) and a lazy quantifier (`.*?`) when attempting to match the pattern `".*"` against the string `"apple" and "orange"`.**
**A:** A greedy quantifier attempts to match as much text as mathematically possible. It will find the first quote before `apple`, consume the entire string up to the final quote after `orange`, and return the entire string `"apple" and "orange"` as a single match. A lazy quantifier attempts to match as little text as possible. It finds the first quote, consumes characters one by one until it hits the very next quote, stops, and returns `"apple"`.

**Q: A junior developer writes a regex `^([0-9]+)*$` to validate a string of numbers. You reject the pull request citing security concerns. What specific vulnerability does this regex introduce?**
**A:** This regex introduces a catastrophic backtracking vulnerability (ReDoS). By nesting a greedy one-or-more quantifier (`+`) immediately inside a zero-or-more quantifier (`*`), the engine has infinite paths to evaluate the same string. If an attacker submits a string of 50 numbers followed by an invalid letter (e.g., `12345...6789X`), the engine will attempt every possible mathematical permutation of grouping the 50 numbers before determining the match failed, spiking CPU usage to 100% and crashing the application.

## Practice Problems

**Problem:** You are parsing an old document and need to find the word "success", but it might be misspelled with either one 'c' or two 'c's, and one 's' or two 's's at the end. Write a single regex using quantifiers to match all variations (e.g., sucess, success, succes).
**Hint:** Make the second 'c' and the final 's' optional.
**Solution:**

```bash
grep -E 'suc?ces?s' document.txt
```

**Problem:** You need to validate a highly specific product code. The code must start with exactly four uppercase letters, followed by a dash, and then followed by at least two, but no more than six digits. Write the regex to validate this entire string.
**Hint:** Use the curly brace range quantifiers for both the letters and the numbers.
**Solution:**

```bash
grep -E '^[A-Z]{4}-[0-9]{2,6}$' codes.txt
```

## References

- [Quantifiers in Regular Expressions (Regular-Expressions.info)](https://www.regular-expressions.info/repeat.html)
- [Catastrophic Backtracking](https://www.regular-expressions.info/catastrophic.html)
