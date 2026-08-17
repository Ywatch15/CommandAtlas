---
slug: git-blame
name: git blame
aliases:
  - git annotate
category: git
tags:
  - version-control
  - history
  - inspection
  - authorship
  - scm
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - who wrote this line of code
  - check line authorship git
  - find commit that changed line
  - inspect file history line by line
  - trace code origins
relatedCommands: [git-bisect, git-diff, git-log, git-shortlog, git-show]
alternatives: [git-bisect, git-log]
status: draft
---

## What is it?

`git blame` is a version control command used to examine the contents of a file line by line, identifying the specific author, commit hash, and timestamp for every line's last modification. It maps every line of code in a file back to the precise historical commit that introduced or last edited it.

## Why does it exist?

In complex codebases, understanding _why_ a particular piece of logic exists or who to contact regarding a bug is critical. While `git log` shows who modified entire files or commits, it lacks fine-grained line-level traceability. `git blame` exists to bridge this gap, utilizing historical diff traversal to annotate every individual line with its exact lineage, transforming opaque source files into transparent historical records.

## Syntax

```bash
git blame [<options>] [<rev-opts>] [<rev>] [--] <file>
```

## Flags

| Flag                 | Description                                                                                        | Example                                |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-L <start>,<end>`   | Restricts annotation output strictly to the specified line range (e.g., `10,50` or regex matches). | `git blame -L 10,25 main.c`            |
| `-e`, `--show-email` | Displays the author's email address instead of their username next to the commit hash.             | `git blame -e app.js`                  |
| `-w`                 | Ignores whitespace-only changes (like tab/space modifications) when tracing line authorship.       | `git blame -w server.py`               |
| `-M`                 | Detects moved or copied lines within the same file, tracing authorship across line shifts.         | `git blame -M utils.js`                |
| `-C`                 | Detects lines moved or copied from other files concurrently modified in the same commit.           | `git blame -C -C component.jsx`        |
| `-S <revs-file>`     | Specifies a revisions file containing a list of commits to ignore when attributing blame.          | `git blame -S ignore_list.txt main.py` |
| `--abbrev=<n>`       | Specifies the length of the abbreviated commit hash displayed in the output (default is 7).        | `git blame --abbrev=10 file.txt`       |
| `--show-number`      | Displays the original line number from the file alongside the annotated output.                    | `git blame --show-number code.py`      |
| `--porcelain`        | Outputs the blame data in a stable, machine-readable format optimized for parsing scripts.         | `git blame --porcelain script.sh`      |
| `--incremental`      | Outputs incremental porcelain data as it is processed, useful for IDE integrations.                | `git blame --incremental module.ts`    |
| `-t`, `--raw`        | Outputs raw timestamp data in standard Unix epoch integer format.                                  | `git blame -t config.json`             |

## Examples

```bash
git blame src/main.rs
```

> This outputs an annotated line-by-line view of `src/main.rs`, displaying the abbreviated commit hash, author name, timestamp, line number, and exact code text for every line in the file.

```bash
git blame -L 40,60 src/server.py
```

> This restricts the execution of `git blame` strictly to lines 40 through 60 of `src/server.py`, filtering out irrelevant code blocks to focus on a specific function or logic segment.

```bash
git blame -w -M api/handler.go
```

> This combines whitespace ignoring (`-w`) with intra-file move detection (`-M`), ensuring that if a developer merely reformatted indentation or shifted code blocks around, the blame points to the actual logic author rather than the reformatting commit.

```bash
git blame --porcelain package.json
```

> This runs the command in machine-readable porcelain format, producing structured metadata blocks for every commit group, allowing automated tools or custom scripts to parse line authorship securely.

```bash
git blame -e --since="6 months ago" config/settings.yaml
```

> This displays line authorship using author email addresses (`-e`), making it easy to cross-reference contact details for configuration lines modified within the last half-year.

## Real-World Scenarios

**Debugging Legacy Code and Locating Domain Experts**

```bash
git blame -L 120,150 payment/gateway.go
```

> When a critical production bug arises in a specific payment routing algorithm, engineers use `git blame` on those exact lines to identify who originally wrote the logic. This allows them to instantly ping the domain expert for context rather than wasting hours deciphering undocumented code.

**Auditing Compliance and Intellectual Property**

```bash
git blame -e proprietary_core.c | grep -v "@company.com"
```

> Security and compliance teams use this pipeline to scan core source files for lines authored by external emails or untrusted domains, verifying that all contributions comply with corporate licensing or contributor agreements.

**Tracking Down Regression Sources**

```bash
git blame -C -C src/auth.rs
```

> When functions are refactored and extracted into separate utility files, standard blame points to the refactoring commit. Using double `-C` forces Git to search across _all_ files in the repository to find where the code originally lived, pinning blame to the true author of the logic.

## When should it NOT be used?

- **Blaming files with massive formatting sweeps:** Running `git blame` on a file that underwent a global auto-formatter (Prettier/Black) run. **Reason:** The entire file's authorship gets overwritten by the formatting commit, rendering blame useless for tracking logic. **Use instead:** `git blame -w` or `git log -S` combined with `git show`.
- **Searching history across complex renames without flags:** Using standard `git blame` on a file that was recently renamed. **Reason:** By default, older revisions before the rename may not be tracked unless explicit move/copy detection flags are passed. **Use instead:** `git log --follow` for deep rename history.
- **Automated production code security scanning:** Using `git blame` to programmatically analyze code quality across an entire codebase. **Reason:** It is a granular annotation tool meant for targeted file inspection, not bulk static analysis. **Use instead:** Dedicated SAST scanners or `git log -p`.

## Alternatives

- **`git log -S` (Pickaxe):** Searches for history by content strings. **Tradeoff:** `git log -S` helps you find _which_ commit introduced or deleted a specific string anywhere in the codebase, whereas `git blame` maps line-by-line authorship inside a _single_ target file.
- **`tig` (Text-mode Interface):** An interactive terminal browser for Git. **Tradeoff:** `tig` provides an interactive, scrollable interface that integrates blame views dynamically, allowing you to jump from line to commit instantly, but it requires installing an external binary.

## How it works internally

`git blame` operates by performing a reverse-chronological graph traversal starting from the current `HEAD` commit and walking backward through the file's lineage.

Unlike `git log`, which tracks commit changes top-down, `git blame` works from the present state of the file backward. For every line in the target file at the latest commit, Git inspects the parent commits to find where that exact line (or its semantic equivalent under `-M`/`-C` heuristics) was last modified.

It constructs an internal data structure mapping line number ranges to commit objects. If a line was untouched in a parent commit, the range is passed further back until it hits the commit that introduced it. The porcelain format outputs these boundary mappings directly from memory. If an invalid path or non-existent revision is provided, Git exits with status `128`.

## Performance Notes

- Running `git blame` on massive source files with hundreds of thousands of lines and deep commit histories can be CPU-intensive, as Git must calculate diffs recursively backward through the commit graph for every line range.
- Enabling advanced move and copy detection flags (`-C -C`) exponentially increases computational overhead because Git must scan the diffs of _every_ file modified across every historical commit in the repository.

## Security Notes

- **Metadata Spoofing Vulnerabilities:** Because Git commit author names and emails are client-side metadata strings, `git blame` will display whatever string was recorded in the commit object. Malicious or careless actors can spoof author identities to misattribute code or evade accountability.
- **Information Disclosure:** In open-source or shared enterprise repositories, running `git blame` exposes personal email addresses and developer usernames in plaintext to anyone with repository read access, which can be scraped for social engineering.

## Common Mistakes

- **Ignoring whitespace modifications:** Running standard `git blame` after a team member runs a tab-to-space refactor. **Why it's wrong:** Every line is marked as authored by the reformatting commit, obscuring the original logic authors. You must use `git blame -w`.
- **Assuming blame works on uncommitted changes:** Running `git blame` on a file with unsaved working tree edits. **Why it's wrong:** `git blame` analyzes committed history in the object database; uncommitted edits are completely ignored and treated as part of the current committed state.
- **Confusing `git blame` with `git log`:** Trying to view full commit messages and branch graphs with `git blame`. **Why it's wrong:** `git blame` is restricted strictly to line-by-line file annotation. Use `git log` for broader graph traversal.

## Best Practices

- Always use the `-w` flag by default when investigating legacy codebases to filter out noise caused by trivial whitespace and indentation adjustments.
- When tracking down code that seems to have materialized out of nowhere, apply the double move-detection flags (`-C -C`) to trace whether the logic was copied or moved from an entirely different file in the repository.
- In automated tooling or IDE plugins, consume the `--incremental` or `--porcelain` output streams rather than scraping human-readable terminal text to ensure stable data parsing.

## Interview Questions

**Q:** How does `git blame` differ fundamentally in its traversal direction compared to `git log`?
**A:** `git log` traverses the commit graph in a forward or backward chronological sequence starting from a reference point (like `HEAD`) across commits. `git blame` works in reverse, starting from the current line state of a target file at the present commit and walking backward through parent commits to discover when each specific line was last modified.

**Q:** What is the performance implication of using the double copy-detection flag (`-C -C`) in `git blame`, and when should it be used?
**A:** The double `-C` flag instructs Git to search for lines moved or copied from _any_ file in the repository, even if those source files were not modified in the same commit. This forces Git to perform intensive cross-file diff calculations across the entire commit graph, which can cause significant CPU latency on large repositories, and should only be used when standard blame fails to find the origin of a moved snippet.

**Q:** Can `git blame` attribute authorship to uncommitted changes currently sitting in your working directory?
**A:** No. `git blame` exclusively inspects recorded commit history stored in the repository's object database. Uncommitted modifications in your working directory or staging area are ignored during the blame annotation process.

## Practice Problems

**Problem:** You need to audit lines 10 through 50 of `src/kernel.c`, but you want to ignore any trivial whitespace or indentation changes that might obscure the true logic author.
**Hint:** Combine the line-range flag with the whitespace-ignoring flag.
**Solution:** `git blame -w -L 10,50 src/kernel.c` (The `-w` flag strips whitespace variations, and `-L` isolates the exact line window).

**Problem:** You suspect a block of code was moved from another file during a recent refactoring sweep. Run blame on `src/new_file.rs` with maximum copy detection enabled to trace the code back to its original file and author.
**Hint:** Use the flag for detecting copied or moved lines across other files, repeated twice for maximum depth.
**Solution:** `git blame -C -C src/new_file.rs` (The double `-C` forces Git to search every file in the repository history to track down the true origin of the copied lines).

## References

- [Git - git-blame Documentation](https://git-scm.com/docs/git-blame)
- [Pro Git Book: Git Tools - Debugging with Git (Blame)](https://git-scm.com/book/en/v2/Git-Tools-Debugging-With-Git)
  === END FILE ===
