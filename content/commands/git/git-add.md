---
slug: git-add
name: git add
aliases: []
category: git
tags:
  - git-add
difficulty: beginner
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
  - stage files for commit
  - add files to git index
  - prepare changes for commit
  - track new file in git
  - stage specific lines of code
relatedCommands:
  - git-diff
  - git-restore
  - git-rm
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git add` is a core version control command that promotes changes from the working directory into Git's staging area, formally known as the "index". It dictates exactly what modifications will be included in the next commit snapshot. By selecting specific files, directories, or even individual lines of code, it allows developers to curate precise, logical commits out of a messy, actively changing working directory.

## Why does it exist?

Unlike older centralized systems (like SVN) where commits blindly capture everything currently modified in the working tree, Git introduced the concept of the "index" as an intermediate buffering layer. This architecture exists to separate the mechanics of writing code from the mechanics of versioning it. It empowers developers to craft atomic, review-friendly commits—such as separating a one-line bug fix from a massive whitespace cleanup—even if all those changes were authored simultaneously within the same file.

## Syntax

```bash
git add [options] [--] <pathspec>...
```

## Flags

| Flag                    | Description                                                                                                                     | Example                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `-A`, `--all`           | Stages all changes (new, modified, and deleted files) across the entire working tree, regardless of the current directory.      | `git add -A`                                                                                        |
| `-u`, `--update`        | Stages modifications and deletions for currently tracked files only, explicitly ignoring entirely new (untracked) files.        | `git add -u`                                                                                        |
| `.`                     | Stages all new, modified, and deleted files within the _current directory_ and its subdirectories.                              | `git add .`                                                                                         |
| `-p`, `--patch`         | Opens an interactive prompt allowing the user to review and selectively stage specific chunks (hunks) of changes within files.  | `git add -p`                                                                                        |
| `-N`, `--intent-to-add` | Records the path of a new file in the index without staging its content, making its future modifications visible to `git diff`. | `git add -N script.sh`                                                                              |
| `-i`, `--interactive`   | Opens a text-based TUI to stage files, revert staged files, or choose hunks interactively.                                      | `git add -i`                                                                                        |
| `-f`, `--force`         | Overrides `.gitignore` rules, forcing Git to stage an otherwise ignored file.                                                   | `git add -f build/binary.out`                                                                       |
| `--chmod=(+             | -)x`                                                                                                                            | Explicitly modifies the executable permission bit of the added files directly within the Git index. | `git add --chmod=+x deploy.sh` |
| `--renormalize`         | Re-stages files based on current `core.autocrlf` or `.gitattributes` text settings to fix line-ending anomalies.                | `git add --renormalize .`                                                                           |
| `--ignore-removal`      | Stages new and modified files, but ignores any files that have been deleted from the working tree.                              | `git add --ignore-removal .`                                                                        |
| `--refresh`             | Updates the file stat information (timestamps, size) in the index without actually reading or staging any new file contents.    | `git add --refresh`                                                                                 |

## Examples

```bash
git add .
```

> Stages all changes (new, modified, deleted) in the current directory downwards. This is the most common, albeit blunt, way to prepare a commit when you are certain every change in your current folder belongs in the next snapshot.

```bash
git add -u
```

> Scans only files that Git is already tracking and stages their modifications or deletions. If you created a temporary scratch file in your working directory, this command safely ignores it while staging your actual work.

```bash
git add -p main.py
```

> Enters patch mode for `main.py`. Git will present each contiguous block of changed code (a "hunk") and ask if you want to stage it (`y`, `n`, `s` to split, etc.). This is essential for splitting a messy file into multiple, atomic commits.

```bash
git add -N config.yml
```

> Tells Git "I intend to add this new file eventually." It adds the file path to the index with an empty content signature. Doing this allows `git diff` (which normally ignores untracked files) to show the contents of `config.yml` as added lines.

```bash
git add --chmod=+x scripts/run.sh
```

> Stages the script while simultaneously setting its executable bit in the Git index. This ensures that when other developers clone the repository, the script will be natively executable on their systems without them needing to run `chmod`.

## Real-World Scenarios

**Crafting Atomic Commits**

```bash
git add -p
```

> Senior developers rely heavily on patch staging. After a long coding session, a file might contain a UI tweak, a backend API fix, and some console logs. By using `git add -p`, the developer can stage _only_ the API fix lines, commit them, and then deal with the UI changes, keeping the repository history modular and easy to revert.

**Bypassing Global Ignores for Edge Cases**

```bash
git add -f node_modules/legacy-lib/dist/index.js
```

> Occasionally, a project requires committing a specific built artifact or dependency that is normally excluded by a broad `*` or `node_modules/` rule in `.gitignore`. Using `-f` allows the engineer to track this specific file without needing to write complex exclusion rules in the ignore file.

**Fixing Cross-Platform Line Endings**

```bash
git add --renormalize .
```

> When a repository's `.gitattributes` is updated to enforce `LF` line endings, existing files in the working directory might still contain `CRLF`. Running this command forces Git to aggressively re-read and convert all tracked files according to the new text rules, staging the carriage-return removals.

## When should it NOT be used?

- **Committing all tracked modifications quickly:** **Do not use `git add -u` followed by `git commit` if you are just saving tracked work.** Instead, use `git commit -a -m "message"`. The `-a` flag automatically stages all modified/deleted tracked files, saving you a keystroke.
- **Discarding working directory changes:** **Do not try to "un-add" or discard changes using `git add`.** If you want to throw away modifications and revert a file to its last committed state, use `git restore <file>` (or `git checkout -- <file>` in older Git versions).
- **Removing deleted files from history explicitly:** **Do not rely solely on `git add .` to handle complex file removals.** If you are deleting files and want to be explicit, `git rm <file>` immediately deletes the file from the working tree and stages the deletion in one step.

## Alternatives

- **`git commit -a`:** **Best for rapid local iterations.** Bypasses the `git add` step entirely for tracked files, wrapping staging and committing into a single command. It sacrifices granular control for speed.
- **`tig`:** **Best for terminal-based power users.** A text-mode interface for Git. It provides a highly efficient, keyboard-driven view for staging individual lines and hunks without navigating the sequential prompts of `git add -p`.
- **`magit`:** **Best for Emacs users.** An Emacs package that provides one of the most powerful, seamless Git staging interfaces available, allowing users to stage chunks directly from their editor buffers.

## How it works internally

When you execute `git add <file>`, Git does not merely create a list of file paths. It physically copies the contents of the file.

First, Git reads the target file's current contents from the working directory. It prepends a header containing the word `blob` and the file's byte size, then compresses the entire package using `zlib`. It calculates the SHA-1 hash of this compressed data. This compressed payload is immediately written to the local Git database inside the `.git/objects/` directory, using the first two characters of the SHA-1 hash as a subdirectory and the remaining 38 as the filename.

After the object is safely stored, Git updates the `.git/index` file. The index is a binary cache that maps file paths to their corresponding SHA-1 blob hashes and stores metadata like file permissions (`mode 100644` or `100755`) and filesystem timestamps.

Because `git add` captures a snapshot of the file's _content_ at that exact millisecond, modifying the file in your working directory _after_ running `git add` causes a divergence. The index still points to the SHA-1 of the older blob, while the working tree contains unhashed, newer modifications.

## Performance Notes

- **Large Binary Bloat:** Because `git add` immediately creates a compressed blob in `.git/objects`, mistakenly adding a 5GB database dump permanently bloats your local repository size, even if you unstage it later (until garbage collection `git gc` runs). Use `.gitignore` or Git LFS _before_ staging binaries.
- **Index Preloading:** On massive repositories (millions of files), `git add .` can be slow as it stats every file. Git automatically mitigates this on multi-core systems by utilizing the `core.preloadIndex` configuration, which checks filesystem stats in parallel threads.

## Security Notes

- **Accidental Secret Leakage:** Staging a file containing an AWS key or a `.env` file is dangerous even if you haven't committed yet. Because `git add` creates the blob in `.git/objects`, if you push the repository (or if a backup script copies the `.git` folder), the unreferenced secret blob can still be extracted by advanced tooling.
- **Malicious `.gitattributes` Execution:** When staging files, Git parses `.gitattributes` to determine how to filter content (e.g., line ending conversions or smudge/clean filters). A malicious repository can define clean filters in `.gitattributes` that execute arbitrary shell commands on the host machine during `git add`.

## Common Mistakes

- **Staging build artifacts blindly**
  - _Mistake:_ Typing `git add .` at the root of a project without a properly configured `.gitignore`, instantly staging the `node_modules/` or `target/` directories.
  - _Why:_ This clutters the repository with thousands of heavy, autogenerated files that cause massive merge conflicts for other developers. Always check `git status` before committing.
- **Misunderstanding what is staged**
  - _Mistake:_ Running `git add script.sh`, then realizing you forgot a semicolon, adding it in the editor, and immediately running `git commit`.
  - _Why:_ The commit will _not_ contain the semicolon. `git add` stages the exact content at the time of execution. You must run `git add script.sh` a second time to stage the new modification.
- **Confusing `-A` and `-u`**
  - _Mistake:_ Creating a new file, running `git add -u`, and wondering why `git status` still shows the file as untracked.
  - _Why:_ `-u` (update) only looks at files already known to the Git index. It explicitly ignores newly created files. You must use `-A` or specify the file directly to track new items.

## Best Practices

- **Rely on Patch Staging:** Make `git add -p` your default staging method. Reviewing every chunk of code before it enters the index serves as a powerful self-code-review step, frequently catching leftover `console.log()` or `print()` statements.
- **Status Sandwich:** Always run `git status` immediately before `git add` to verify what has changed, and run `git status` immediately after to verify exactly what is going into the commit.
- **Stage Logically, Not Temporally:** Do not stage files just because you finished editing them. Stage files together because they represent a single, cohesive logical change to the codebase.

## Interview Questions

**Q: What is the difference between the working directory, the index, and HEAD?**
**A:** The working directory is the active filesystem where you edit files. The index (staging area) is the binary cache that holds the proposed next commit snapshot. HEAD is a pointer to the current active branch and represents the last committed state of the repository. `git add` moves changes from the working directory to the index.

**Q: Why might `git status` show the exact same file in both the "Changes to be committed" and "Changes not staged for commit" sections simultaneously?**
**A:** This happens when you modify a file, run `git add <file>` to stage that specific state into the index, and then modify the file again in your working directory. The index holds the snapshot from the first modification, while the working directory holds the newer un-staged modifications.

**Q: What exactly does `git add -N` (intent-to-add) do, and when is it useful?**
**A:** `git add -N` adds a newly created file's path to the index without actually hashing or staging its content. This is highly useful because `git diff` normally ignores untracked files. By declaring intent-to-add, you can use `git diff` to review the contents of a brand-new file before officially staging it.

## Practice Problems

**Problem:** You have modified three tracked files and created two new untracked files. Write a command to stage _only_ the modifications to the three tracked files, leaving the untracked files completely alone.
**Hint:** There is a specific flag that limits the staging operation to files that Git is already aware of.
**Solution:**

```bash
git add -u
```

**Problem:** You want to stage a file named `deployment.yaml`, but Git refuses, stating that the file is ignored by a `.gitignore` rule. Write a command to stage it anyway without modifying the `.gitignore` file.
**Hint:** You need to override the safety checks preventing ignored files from entering the index.
**Solution:**

```bash
git add -f deployment.yaml
```

## References

- [git-add(1) Manual Page](https://git-scm.com/docs/git-add)
- [Pro Git Book: Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Git Internals - Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
