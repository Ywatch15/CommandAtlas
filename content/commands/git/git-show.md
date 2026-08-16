---
slug: git-show
name: git show
aliases: []
category: git
tags:
  - version-control
  - commits
  - inspection
  - diff
  - objects
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
  - view commit details
  - see changes in a commit
  - inspect git object
  - show file at specific commit
  - view raw file from another branch
relatedCommands:
  - git-blame
  - git-diff
  - git-log
alternatives:
  - git-diff
  - git-log
status: draft
---

## What is it?

`git show` is a versatile inspection command that displays the metadata and textual content of Git objects—most commonly commits, but also tags, trees, and blobs. When applied to a commit, it outputs the commit message, author information, timestamp, and a unified diff representing the exact changes introduced by that commit relative to its parent. It acts as the primary lens for developers to quickly audit the precise payload of any historical point in the repository.

## Why does it exist?

While `git log` is excellent for traversing timeline history and `git diff` is perfect for comparing two disparate state pointers, neither is ergonomically optimized for answering the simple question: "What exactly did _this specific commit_ do?" `git show` exists to provide a human-readable, unified view of a single Git object. It bridges the gap between low-level plumbing commands (like `git cat-file`) and high-level porcelain, formatting raw zlib-compressed blobs and tree structures into legible patches and metadata summaries.

## Syntax

```bash
git show [options] [<object>...]
git show [options] <commit>:<path>
```

## Flags

| Flag                       | Description                                                                                                           | Example                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `--stat`                   | Suppresses the full patch output, generating only a high-level summary of modified files and line counts.             | `git show --stat HEAD~1`           |
| `--name-only`              | Outputs only the names of the files that were changed in the commit, omitting patch data and stats.                   | `git show --name-only 9f8e7d6`     |
| `--name-status`            | Outputs the file names along with their modification status (e.g., `A` for added, `M` for modified, `D` for deleted). | `git show --name-status HEAD`      |
| `--format=<fmt>`           | Pretty-prints the commit metadata according to a format string (e.g., `%H` for hash, `%an` for author name).          | `git show --format="%h - %an: %s"` |
| `--oneline`                | Condenses the commit metadata to a single line containing the abbreviated hash and subject.                           | `git show --oneline HEAD`          |
| `-w`, `--ignore-all-space` | Instructs the diff engine to ignore whitespace entirely when rendering the patch, highlighting only logical changes.  | `git show -w a1b2c3d`              |
| `--word-diff`              | Displays inline word-level differences instead of line-level replacements, enclosing changes in `[- -]` and `{+ +}`.  | `git show --word-diff HEAD`        |
| `--color-words`            | Functions like `--word-diff` but uses ANSI color codes exclusively to highlight changed words, omitting markers.      | `git show --color-words HEAD`      |
| `-m`                       | Forces diff output for merge commits, displaying the diff relative to _each_ parent rather than a combined diff.      | `git show -m <merge-commit>`       |
| `--first-parent`           | When inspecting a merge commit, it only compares the commit against its first parent, ignoring the merged-in branch.  | `git show --first-parent HEAD`     |

## Examples

```bash
git show
```

> Without arguments, it defaults to showing `HEAD`. It prints the commit author, date, message, and the full line-by-line diff of what changed in the most recent commit.

```bash
git show v2.1.0
```

> Inspects a specific tag object. It first outputs the tagger's metadata and the tag annotation message, and then proceeds to display the underlying commit object that the tag points to.

```bash
git show HEAD~3 --stat
```

> Inspects the commit exactly 3 generations behind the current `HEAD`. The `--stat` flag suppresses the overwhelming patch output, displaying a clean list of files modified and the net insertions/deletions.

```bash
git show main:src/config.json
```

> Uses the tree-ish colon syntax (`<commit>:<path>`) to target a specific file (blob) as it exists on the `main` branch. Instead of generating a diff, it outputs the raw contents of that file directly to standard output.

```bash
git show 45a9b2c --name-status
```

> Identifies exactly which files were added, modified, or deleted in the commit `45a9b2c`, completely ignoring the actual code changes. Extremely useful for auditing massive architectural refactors.

## Real-World Scenarios

**Extracting Historical File States**

```bash
git show origin/main:config/database.yml > old_db_config.yml
```

> An engineer realizes their current local `database.yml` is hopelessly broken. Instead of switching branches or digging through commit histories in a UI, they use `git show` to instantly read the pristine state of the file from the remote `main` branch and redirect it into a new local file for side-by-side comparison.

**Auditing a Specific Pull Request's Payload**

```bash
git show --stat --oneline c8f3a1d
```

> During an incident response, a Site Reliability Engineer spots a suspicious commit hash (`c8f3a1d`) in the deployment logs. They run this command to quickly see a condensed summary of what the commit was meant to do and exactly which files it touched, without scrolling through thousands of lines of diff output.

**Reviewing Prose or Documentation Changes**

```bash
git show --word-diff HEAD
```

> When reviewing a commit that modifies Markdown documentation or a LaTeX manuscript, line-by-line diffs are unreadable if the author re-wrapped a paragraph. Using `--word-diff` allows the editor to instantly spot the single word that was changed amidst a massive block of text.

## When should it NOT be used?

- **Comparing two distinct branches:** **Do not use `git show` to compare `feature` to `main`.** `git show` is inherently designed to look at _one_ object (usually a single commit relative to its immediate parent). If you want to see the difference between two arbitrary points in time, use `git diff`.
- **Searching history for a string:** **Do not pipe `git show` through grep to search for old code.** While you can script this, it is vastly inefficient. If you want to find the commit that introduced or removed the string "API_KEY", use `git log -S"API_KEY"` (the pickaxe search).
- **Restoring files to the working directory:** **Do not use `git show HEAD:file > file` to revert a file.** While it technically works, it bypasses Git's internal index tracking. The correct, idiomatic way to replace your working copy of a file with a historical version is `git restore --source=HEAD <file>` (or `git checkout HEAD -- <file>`).

## Alternatives

- **`git log -p -1 <commit>`:** **Best for timeline context.** This is functionally identical to `git show <commit>` for commits, but `git log` can traverse history, whereas `git show` cannot. `git log -p` cannot inspect raw blobs (files).
- **`git diff <commit>^..<commit>`:** **Best for explicit patch generation.** Generates the exact same unified diff as `git show`, but completely omits the commit metadata (author, date, message).
- **`git cat-file -p <object>`:** **Best for plumbing and internals.** This is the low-level equivalent. While `git show` formats a commit nicely, `git cat-file -p` prints the raw, underlying Git object data structures exactly as they are stored on disk.

## How it works internally

Git's database stores four types of objects: blobs (file contents), trees (directory structures), commits (snapshots over time), and tags (annotated pointers). They are all addressed by SHA-1 hashes. `git show` is a polymorphic command that changes its behavior based on the type of object it resolves.

1.  **Commits:** If the resolved hash is a commit object, `git show` parses the object to extract the author, date, and message. It then reads the commit's `tree` hash and its parent's `tree` hash. It passes these two trees to the internal diff machinery to generate a unified patch.
2.  **Merge Commits:** By default, for a commit with multiple parents, `git show` generates a "combined diff". It only outputs lines that are different from _all_ parents. If a file was modified in branch A but untouched in branch B, the combined diff hides that file to reduce noise. (Use `-m` to override this).
3.  **Blobs:** If the target is a file (e.g., via `HEAD:path/to/file`), `git show` bypasses the diff engine entirely. It locates the blob hash, inflates the zlib-compressed payload from `.git/objects/`, and streams the raw bytes directly to standard output.
4.  **Tags:** If it resolves an annotated tag, it prints the tagger and message, unwraps the object the tag points to, and recursively calls itself on that object (usually a commit).

## Performance Notes

- **Blob Extraction is Instantaneous:** Running `git show HEAD~50:config.json` is incredibly fast. Git does not checkout files or traverse 50 commits; it simply reads the tree of the 50th commit, finds the hash for `config.json`, and inflates that single blob from disk.
- **Combined Diffs on Massive Merges:** Running `git show` on a merge commit that integrates thousands of files across two long-running branches can be computationally expensive. Git must calculate diffs against multiple parent trees simultaneously to render the combined output.

## Security Notes

- **Exposing Leaked Secrets:** If a developer accidentally commits an AWS key and then "fixes" it by deleting the key in the very next commit, the key is still permanently stored in the Git database. Anyone with access to the repository can run `git show <bad-commit-hash>` and instantly see the plaintext secret in the patch output.
- **Terminal Escape Injection:** When using `git show` to output raw blobs of arbitrary files (e.g., `git show HEAD:compiled_binary.bin`), if the output is not piped into a secure pager like `less`, raw binary data containing malicious terminal escape sequences can corrupt the terminal emulator state or, in older terminals, execute arbitrary commands.

## Common Mistakes

- **Misunderstanding `git show file.txt`**
  - _Mistake:_ Typing `git show my_script.js` expecting to see the history of the script or its contents at `HEAD`.
  - _Why:_ Without the `<commit>:` prefix, `git show` assumes the argument is a branch name or commit hash. It will fail with `fatal: ambiguous argument 'my_script.js'`. You must explicitly provide the tree-ish context: `git show HEAD:my_script.js`.
- **Wondering why a merge commit shows no diff**
  - _Mistake:_ Running `git show <merge-commit-hash>` and seeing only the commit message and no code changes.
  - _Why:_ Git's default "combined diff" for merges only shows conflicts or changes that don't match _any_ parent. If the merge was a clean resolution where code was simply brought in from branch B, it suppresses the diff. You must append `-m` to see the diff against each parent.
- **Piping without `--no-patch`**
  - _Mistake:_ Attempting to parse the commit message in a bash script by running `git show HEAD | grep "ticket"`.
  - _Why:_ You are piping the entire multi-thousand-line patch output into `grep`, which is slow and error-prone. Use `git show -s --format=%B HEAD` to output _only_ the commit message.

## Best Practices

- **Leverage Custom Formats for Scripting:** Never parse the default human-readable output of `git show` in automated scripts. Always use `--format=` to enforce a strict, machine-readable output. For example, `git show -s --format="%H,%an,%at" HEAD` safely outputs `Hash,AuthorName,UnixTimestamp`.
- **Use `HEAD:path` for Quick Reference:** Instead of constantly context-switching branches or stashing work just to look at how a function was written on `main`, use `git show main:src/utils.js`. It gives you the information instantly without touching your working directory.
- **Combine `--stat` with Code Review:** When asked to review a monolithic PR with 50 commits, standard `git show` is overwhelming. Loop through the commits using `git show --stat <commit>` first to build a mental model of which architectural components each commit touches before diving into the line-by-line patches.

## Interview Questions

**Q: What is the fundamental difference between `git show HEAD:file.txt` and `git checkout HEAD -- file.txt`?**
**A:** `git show HEAD:file.txt` extracts the file's contents from the object database and prints them to standard output (the terminal); it does not alter the disk. `git checkout HEAD -- file.txt` extracts the file and physically overwrites the version currently residing in your working directory on the disk, discarding uncommitted local changes.

**Q: You run `git show` on a specific commit hash, but the patch output is completely blank, even though `git log` proves the commit exists. Why might this happen?**
**A:** The most likely reason is that the commit is a merge commit. By default, `git show` uses a "combined diff" format for merges, which suppresses the output of files that identically match at least one of the parent commits. To see the actual diff of a merge commit against its parents, you must provide the `-m` flag.

**Q: How can you use `git show` to view the commit message of `HEAD` without printing the potentially massive diff payload?**
**A:** You use the `-s` (or `--no-patch`) flag. Running `git show -s HEAD` instructs Git to suppress the diff engine output, displaying only the commit metadata (author, date, message).

## Practice Problems

**Problem:** You need to retrieve the exact contents of `nginx.conf` as it existed two commits ago, and you want to save that output into a new file on your desktop called `nginx.conf.bak`.
**Hint:** Use the tree-ish syntax with the relative `HEAD` pointer, and standard bash redirection.
**Solution:**

```bash
git show HEAD~2:nginx.conf > ~/Desktop/nginx.conf.bak
```

**Problem:** You want to see the commit metadata and a high-level summary of the files modified (lines added/removed) in the last commit, but you do not want to see the actual line-by-line code patch.
**Hint:** There is a specific flag that replaces the patch output with statistical file data.
**Solution:**

```bash
git show --stat HEAD
```

## References

- [git-show(1) Manual Page](https://git-scm.com/docs/git-show)
- [Pro Git Book: Revision Selection](https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection)
- [Git Internals - Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
