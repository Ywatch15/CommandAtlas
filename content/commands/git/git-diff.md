---
slug: git-diff
name: git diff
aliases: []
category: git
tags:
  - version-control
  - comparison
  - diff
  - code-review
  - changes
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - compare files in git
  - see uncommitted changes
  - diff two branches
  - show staged changes
  - compare commits
relatedCommands:
  - git-add
  - git-blame
  - git-log
  - git-show
  - git-status
alternatives:
  - git-show
status: draft
---

## What is it?

`git diff` is a diagnostic version control command used to display the line-by-line differences between various Git data sources. It compares the working directory, the staging area (index), individual commits, or entirely divergent branches to reveal exactly what text or binary content has changed. Developers rely on it to review uncommitted code modifications before staging and to audit the exact payload of past or pending commits.

## Why does it exist?

While `git status` tells a developer _which_ files have changed, it completely abstracts away the actual content modifications. Git's core architecture requires developers to explicitly curate patches (staging) rather than blindly committing the working tree. `git diff` exists to surface the underlying textual delta—using the unified diff format—so engineers can confidently verify that every inserted, modified, or deleted line is intentional before permanently writing it to the repository's cryptographic ledger.

## Syntax

```bash
git diff [options] [<commit>] [--] [<path>...]
git diff [options] --cached [<commit>] [--] [<path>...]
git diff [options] <commit> <commit> [--] [<path>...]
```

## Flags

| Flag                       | Description                                                                                                                  | Example                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `--cached` / `--staged`    | Compares the current staging area (index) against the last commit (`HEAD`).                                                  | `git diff --staged`           |
| `--stat`                   | Suppresses the patch output, generating only a high-level summary of modified files and line counts.                         | `git diff --stat origin/main` |
| `--name-only`              | Outputs only the names of the files that have changed, omitting both patch data and stat summaries.                          | `git diff --name-only HEAD~1` |
| `--name-status`            | Outputs the file names along with their modification status (e.g., `M` for modified, `A` for added, `D` for deleted).        | `git diff --name-status`      |
| `-w`, `--ignore-all-space` | Instructs the diff engine to ignore whitespace entirely when comparing lines. Crucial for reviewing re-indented code.        | `git diff -w`                 |
| `--word-diff`              | Displays inline word-level differences instead of line-level replacements, enclosing changes in `[- -]` and `{+ +}`.         | `git diff --word-diff`        |
| `--color-words`            | Functions like `--word-diff` but uses ANSI color codes exclusively to highlight changed words, omitting the bracket markers. | `git diff --color-words`      |
| `-R`                       | Reverses the diff output, swapping the source and destination inputs so additions appear as deletions and vice versa.        | `git diff -R`                 |
| `--diff-filter=[ACDMRT]`   | Restricts the output to specific change classes (e.g., `A`dded, `C`opied, `D`eleted, `M`odified).                            | `git diff --diff-filter=M`    |
| `-G<regex>`                | The "pickaxe" filter. Only shows diffs for files where the text of added or removed lines matches the provided regex.        | `git diff -G"TODO"`           |
| `--check`                  | Warns if the changes introduce whitespace errors (like trailing spaces or mixed tabs/spaces) based on `core.whitespace`.     | `git diff --check`            |

## Examples

```bash
git diff
```

> Compares the current working directory against the staging area (index). This shows all modifications you have made to tracked files that have _not_ yet been staged with `git add`.

```bash
git diff --staged
```

> Compares the staging area against `HEAD` (the last commit). This is the definitive self-review command: it displays exactly what code will be permanently recorded if you execute `git commit` right now.

```bash
git diff HEAD~1 HEAD
```

> Compares the previous commit (`HEAD~1`) to the current commit (`HEAD`). This allows you to audit the exact patch payload that was introduced by the most recent commit on your active branch.

```bash
git diff main...feature-branch
```

> Compares the _merge base_ (the common ancestor) of `main` and `feature-branch` against the tip of `feature-branch`. This isolates the diff to show _only_ the new work introduced by the feature branch, ignoring any new commits added to `main` in the meantime.

```bash
git diff -G"API_KEY" --stat $(git rev-list --all)
```

> Searches the entire repository history across all commits (`git rev-list --all`) for any patch that added or removed the string "API_KEY", and outputs a summary of which files were modified in those specific commits.

## Real-World Scenarios

**Pre-Commit Code Review**

```bash
git diff --staged -w
```

> Before finalizing a commit, a developer runs this to verify their staged changes. By appending `-w`, they filter out massive blocks of code that merely had their indentation changed (e.g., wrapping a block in an `if` statement), allowing them to focus purely on the logical code alterations.

**Cross-Branch Impact Analysis**

```bash
git diff --name-status origin/main...HEAD
```

> When preparing to open a Pull Request, an engineer needs a quick list of all files they created, modified, or deleted in their feature branch relative to the upstream `main` branch. This command outputs a clean list (e.g., `A src/new.js`, `M package.json`) suitable for pasting into PR descriptions.

**Auditing Specific File History**

```bash
git diff v1.0.0 v2.0.0 -- src/auth/login.js
```

> A security engineer investigating an authentication bug needs to see exactly how the login logic evolved between two major releases. By providing two tags and a double-dash `--` followed by a pathspec, the diff engine completely ignores the rest of the repository and focuses only on that file's delta across the specified timeframe.

## When should it NOT be used?

- **Comparing untracked files outside the repository:** **Do not use `git diff` for generic system files.** While `git diff --no-index file1 file2` works, the GNU `diff` utility is specifically built for arbitrary filesystem comparisons without invoking the Git engine overhead.
- **Resolving Merge Conflicts:** **Do not read raw diffs with conflict markers to resolve merges.** The standard `git diff` output during a merge conflict is visually overwhelming. Use `git mergetool` or a GUI-based 3-way merge editor (like VS Code or IntelliJ) to securely resolve conflicts.
- **Finding who wrote a specific line:** **Do not use `git diff` to audit authorship.** If you need to know who introduced a bug on line 42, `git diff` will only show you the raw patch. Use `git blame <file>` to map authorship and commit hashes to every individual line in the file.

## Alternatives

- **`diff` (GNU coreutils):** **Best for non-Git environments.** The standard Unix diff tool is ideal for comparing two raw text files or directories entirely outside the context of version control.
- **`delta` / `difftastic`:** **Best for developer ergonomics.** These are modern, syntax-highlighting terminal pagers. They intercept the raw output of `git diff` and reformat it into beautiful, side-by-side comparisons with structural syntax highlighting.
- **`git show`:** **Best for inspecting a single commit.** While `git diff HEAD~1 HEAD` works, `git show HEAD` accomplishes the same file diff while additionally printing the commit metadata (author, date, commit message).

## How it works internally

Git does not store diffs or deltas for active files; it stores complete, zlib-compressed snapshots (blobs) of file contents. When `git diff` is invoked, it must compute the differences on the fly.

First, Git resolves the two data sources being compared (e.g., extracting the blob hashes from the index and the `HEAD` tree object). It inflates these blobs from `.git/objects/` into memory.

Next, it passes the raw text to its internal diff machinery, which defaults to the Myers diff algorithm. The algorithm treats the two files as sequences of lines and attempts to find the Longest Common Subsequence (LCS). It computes the Shortest Edit Script (SES)—the minimum number of insertions and deletions required to transform the source blob into the destination blob. This requires `O(ND)` time, where `N` is the sum of the lengths of the two files and `D` is the size of the minimal edit script.

Finally, Git formats this edit script into the Unified Diff format. It prepends the output with Git-specific metadata (file modes, blob hashes like `index 83db48f..f9c3140 100644`), generates diff headers (`--- a/file` and `+++ b/file`), and chunks the changes into "hunks" denoted by `@@ -start,count +start,count @@`, surrounding the modified lines with 3 lines of unmodified context for readability.

## Performance Notes

- **Algorithm Swapping:** For large files with repetitive boilerplate (e.g., massive XML files or autogenerated code), the Myers algorithm can become inefficient and produce confusing hunks. Passing `--diff-algorithm=histogram` (or `patience`) uses an alternative algorithm that matches unique lines first, often resulting in much faster execution and more human-readable diffs.
- **Binary File Bottlenecks:** Attempting to diff large binary files (like compiled `.so` libraries or high-res images) wastes massive CPU cycles before Git realizes it's binary. Explicitly mark these paths in `.gitattributes` (e.g., `*.png binary`) so Git instantly skips text computation and simply reports `Binary files differ`.

## Security Notes

- **Arbitrary Code Execution via `textconv`:** Git allows users to define custom diff drivers in `.gitattributes` and `.git/config` (e.g., automatically converting PDFs to text before diffing). If an attacker commits a malicious `.gitattributes` file pointing to a dangerous executable in the repository, running `git diff` could trigger arbitrary code execution on the reviewer's machine.
- **Secret Exposure:** Because `git diff` outputs to standard out, viewing a diff that contains hardcoded credentials, API keys, or private SSH keys immediately writes that sensitive data to your terminal emulator's scrollback buffer, which may be logged or persist after the session ends.

## Common Mistakes

- **Empty output after staging**
  - _Mistake:_ Editing a file, running `git add .`, then running `git diff` to review the work, only to see completely empty output.
  - _Why:_ A naked `git diff` compares the working tree to the staging area. Since you just synchronized them with `git add`, there are no differences. You must run `git diff --staged` to compare the staging area to the last commit.
- **Confusing `..` and `...`**
  - _Mistake:_ Using `git diff main..feature` when trying to see what the feature branch introduced.
  - _Why:_ The two-dot syntax compares the exact tip of `main` to the tip of `feature`. If `main` has progressed with unrelated commits, they will appear as inverted deletions in your diff. The three-dot syntax (`main...feature`) compares the _merge base_ of both branches to the tip of `feature`, showing only the feature's unique additions.
- **Branch/File name collisions**
  - _Mistake:_ Having a branch named `build` and a folder named `build`, and typing `git diff build`.
  - _Why:_ Git will default to treating `build` as a branch reference. To guarantee Git treats the argument as a file path, always use the double-dash separator: `git diff -- build`.

## Best Practices

- **Self-Review with `--staged`:** Cultivate the habit of running `git diff --staged` immediately before typing `git commit`. This final verification step catches stray `console.log()` statements, commented-out code, and unintended whitespace formatting before it enters the permanent ledger.
- **Use Word-Diff for Prose:** When maintaining Markdown documentation, LaTeX papers, or HTML templates where entire paragraphs occupy a single line, standard line-based diffs are unreadable. Always use `git diff --word-diff` or `--color-words` to highlight the exact modified words within the block.
- **Automate Diff Tooling:** Do not suffer through plain monochrome terminal diffs. Configure a robust pager by installing `delta` or `diff-so-fancy` and setting it in your global config (`git config --global core.pager "delta"`). The syntax highlighting and side-by-side rendering dramatically reduce code review fatigue.

## Interview Questions

**Q: What is the fundamental difference between `git diff branchA..branchB` and `git diff branchA...branchB`?**
**A:** `branchA..branchB` compares the exact tip (most recent commit) of `branchA` to the tip of `branchB`. `branchA...branchB` calculates the common ancestor (the merge base) of both branches, and compares that ancestor to the tip of `branchB`. The three-dot syntax is specifically used to isolate and review only the new changes introduced by `branchB` since it diverged from `branchA`.

**Q: You just ran `git commit`, but you forgot to review your changes first. How do you view the exact line-by-line diff of the commit you just created?**
**A:** You can run `git diff HEAD~1 HEAD`. This compares the parent of the current commit to the current commit itself. Alternatively, using `git show HEAD` achieves the same result while also displaying the commit message and author metadata.

**Q: You want to view a diff, but you only want to see the lines of code that were actually added or removed, completely ignoring any lines where only the indentation changed. Which flag do you use?**
**A:** You use the `-w` or `--ignore-all-space` flag. This instructs Git's diff algorithm to treat lines that differ solely by spaces or tabs as identical, filtering out whitespace noise and surfacing only the logical code modifications.

## Practice Problems

**Problem:** You are on the `feature-auth` branch. You need a list of the exact files that have been modified since this branch diverged from the `main` branch. You do not want to see the actual code changes, only the file paths and their status (e.g., Modified, Added).
**Hint:** Use the three-dot syntax to find the merge base, combined with the flag that restricts output to file names and their Git status.
**Solution:**

```bash
git diff --name-status main...feature-auth
```

**Problem:** You have both staged and unstaged changes in your working directory for a file named `server.js`. You want to see the diff of _only_ the staged changes for this specific file.
**Hint:** Combine the flag that targets the index with the syntax that explicitly isolates file paths.
**Solution:**

```bash
git diff --staged -- server.js
```

## References

- [git-diff(1) Manual Page](https://git-scm.com/docs/git-diff)
- [Pro Git Book: Viewing Your Staged and Unstaged Changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository#_viewing_staged_and_unstaged)
- [Myers Diff Algorithm (Interactive Explanation)](https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/)
