---
slug: git-reset
name: git reset
aliases: []
category: git
tags: [version-control, repository, staging, index, reset]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'reset git commit'
  - 'unstage files'
  - 'undo last git commit'
  - 'reset working directory'
  - 'move head pointer'
relatedCommands: [git-checkout, git-commit, git-revert]
alternatives: [git-rebase, git-revert, git-rm]
status: draft
---

## What is it?

`git reset` is a powerful version control command used to reset the current `HEAD` pointer to a specified state, while optionally modifying the staging area (index) and working tree. It serves as Git's primary multi-purpose tool for undoing changes, unstaging files, and rolling back commit history.

## Why does it exist?

Managing changes across Git's three trees—Working Directory, Staging Area (Index), and Commit History (`HEAD`)—requires precise manipulation when mistakes happen. `git reset` was designed to fill the architectural gap of safely restructuring or discarding pending changes across these boundaries. It provides developers with fine-grained control to shift where the current branch points and what code is staged, without necessarily destroying uncommitted work.

## Syntax

```bash
git reset [--soft | --mixed [-N] | --hard | --merge | --keep] [-q] [<commit>]
git reset [<tree-ish>] [--] <pathspec>...
git reset (--patch | -p) [<tree-ish>] [--] [<pathspec>...]
```

## Flags

| Flag                    | Description                                                                                                                      | Example                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `--soft`                | Resets the `HEAD` pointer to the specified commit while leaving both the index and working tree completely untouched.            | `git reset --soft HEAD~1`                  |
| `--mixed`               | Resets the `HEAD` pointer and updates the index to match the commit, but leaves the working tree files untouched (default mode). | `git reset --mixed HEAD~1`                 |
| `--hard`                | Resets `HEAD`, the index, and the working tree, overwriting all local changes and uncommitted work permanently.                  | `git reset --hard origin/main`             |
| `-p`, `--patch`         | Interactively inspects hunks of changes in the index or working tree to selectively reset or unstage them.                       | `git reset -p`                             |
| `-q`, `--quiet`         | Suppresses summary output messages when executing the reset command.                                                             | `git reset -q HEAD~1`                      |
| `--merge`               | Resets the index and updates files in the working tree that differ between `<commit>` and `HEAD`, aborting on conflicts.         | `git reset --merge`                        |
| `--keep`                | Resets index and working tree, but safely preserves any local files that have uncommitted changes which would be overwritten.    | `git reset --keep HEAD~1`                  |
| `-N`, `--intent-to-add` | When used with `--mixed`, records path entries in the index as untracked with no content (useful with pathspecs).                | `git reset -N file.txt`                    |
| `--pathspec-from-file=` | Reads pathspecs from a file instead of command-line arguments.                                                                   | `git reset --pathspec-from-file=paths.txt` |
| `--no-refresh-index`    | Disables refreshing the index after the reset operation completes.                                                               | `git reset --no-refresh-index`             |

## Examples

```bash
git reset HEAD file.txt
```

> This unstages `file.txt`, removing it from the index while leaving the actual modifications intact in your working directory. It acts as the direct inverse of `git add`.

```bash
git reset --soft HEAD~1
```

> This rolls back the most recent commit, moving the `HEAD` pointer back by one position. However, it preserves all committed changes in the staging area, allowing you to rewrite your commit message or combine changes cleanly.

```bash
git reset --mixed HEAD~3
```

> This resets the branch pointer back three commits while clearing the staging area. Your file modifications remain safely preserved in the working directory, allowing you to re-stage and organize them differently.

```bash
git reset --hard origin/main
```

> This forcefully synchronizes your local branch with the remote `main` branch. It overwrites your local working directory and index entirely, wiping out any uncommitted or unpushed local changes permanently.

```bash
git reset -p
```

> This initiates an interactive patching session, prompting you block-by-block to decide which staged changes you want to unstage selectively, rather than resetting entire files at once.

## Real-World Scenarios

**Fixing a premature commit message or missing file**

```bash
git reset --soft HEAD~1 && git add forgotten_file.py && git commit -c ORIG_HEAD
```

> When you realize you committed too early or forgot a file, a soft reset pulls back the commit while keeping files staged, letting you append the missing piece and recommit seamlessly.

**Organizing a messy staging area**

```bash
git reset
```

> When you have carelessly added dozens of unrelated file changes across a massive codebase to the index, running a plain mixed reset clears the slate without destroying your underlying file edits so you can stage them logically by feature.

**Abandoning a failed experimental refactor**

```bash
git reset --hard HEAD
```

> When you spend hours attempting a complex code refactor that completely breaks the application architecture and you want to wipe the slate clean back to your last known good commit.

## When should it NOT be used?

- **Discarding uncommitted work casually:** Running `git hard reset` without checking your status. **Reason:** `--hard` is fully destructive; any uncommitted modifications will be permanently lost with no undo button. **Use instead:** `git stash` to save current changes safely before resetting.
- **Rewriting history on shared public branches:** Running `git reset --hard` on a branch that has already been pushed to `origin/main` shared with a team. **Reason:** It rewrites history divergence, causing severe synchronization failures and forcing coworkers to perform complex recovery steps. **Use instead:** `git revert` to create a new inverse commit instead.

## Alternatives

- **`git restore`:** The modern, dedicated file-restoration command. **Tradeoff:** `git restore` safely handles file contents and index staging without the cognitive complexity and danger of moving the `HEAD` pointer that `git reset` entails.
- **`git revert`:** Creates a new commit that undoes previous changes. **Tradeoff:** `git revert` is completely safe for shared public branches because it adds history rather than destroying or rewriting it, though it clutters the commit graph with rollback nodes.

## How it works internally

Git manages state across three internal trees: `HEAD` (the commit graph pointer), the Index (staging area), and the Working Directory. `git reset` operates by selectively rewriting one, two, or all three of these trees based on the flag provided.

When invoked with a commit reference, `git reset` first updates the branch ref pointer in `.git/refs/heads/` (or directly moves `HEAD` if detached) to point to the target commit hash. Next, if `--mixed` or `--hard` is active, it updates the binary index file (`.git/index`) to match the tree object of the target commit, overwriting tracked file paths. Finally, if `--hard` is specified, it overwrites the actual files in the working directory to match the index state. Exit codes return `0` on success and non-zero on syntax errors or invalid references.

## Performance Notes

- `git reset` is an extremely fast local operation because updating ref pointers and index files requires minimal disk I/O.
- Using `--hard` on repositories with millions of tracked files can incur noticeable filesystem latency as Git updates every single file on disk to match the target commit tree.

## Security Notes

- **Permanent Data Loss via Hard Reset:** Executing `git reset --hard` drops uncommitted changes and unreferenced commits from active view. While dangling objects technically remain temporarily in the object database until garbage collection runs, recovering them requires deep plumbing commands like `git fsck`.
- **Force-Push Collateral Damage:** If a local hard reset is subsequently force-pushed (`git push --force`) to a shared remote repository, it can permanently delete team history from the server.

## Common Mistakes

- **Confusing `reset` with `checkout` or `switch`:** Typing `git reset branch-name` expecting to switch branches. **Why it's wrong:** `git reset` moves the _current_ branch pointer to a commit; it does not change your active branch context. Use `git switch` instead.
- **Forgetting that `--mixed` is the default:** Running `git reset HEAD~1` assuming it acts like `--soft`. **Why it's wrong:** Unwittingly running a mixed reset wipes your staging area, forcing you to re-add your files if you wanted them kept ready for a commit.

## Best Practices

- Always run `git status` and `git diff` before executing a reset to ensure you are fully aware of what changes are staged or unstaged.
- Whenever you are unsure about rolling back history, run `git stash` first as an instantaneous safety net.
- Never run `--hard` reset on a branch containing uncommitted work without explicit confirmation.

## Interview Questions

**Q:** What are Git's "Three Trees," and how do the `--soft`, `--mixed`, and `--hard` flags of `git reset` interact with them?
**A:** The Three Trees are `HEAD` (commit history), the Index (staging area), and the Working Directory. `--soft` only updates `HEAD`, leaving the Index and Working Directory intact. `--mixed` updates both `HEAD` and the Index, leaving the Working Directory untouched. `--hard` updates all three trees (`HEAD`, Index, and Working Directory), matching them entirely to the target commit and destroying uncommitted changes.

**Q:** Why is `git reset --hard` dangerous on a shared remote branch?
**A:** `--hard` rewrites local commit history. If you push those changes to a shared remote, you force-overwrite the server's history, destroying commits made by teammates and breaking their local repositories when they attempt to pull.

**Q:** How can you recover uncommitted work or a commit that was accidentally wiped out by a destructive `git reset --hard`?
**A:** You can use `git reflog`, which tracks every movement of the `HEAD` pointer. By locating the SHA-1 hash of the state prior to the destructive reset in the reflog, you can instantly restore your repository via `git reset --hard <hash>`.

## Practice Problems

**Problem:** You have staged three files for a commit, but you realize you only want to commit two of them. Unstage the third file (`unwanted.txt`) without losing your modifications to it.
**Hint:** Use the command that targets a specific file in the index relative to `HEAD`.
**Solution:** `git reset HEAD unwanted.txt` (This removes the file from the staging area index while keeping its edits safe in the working directory).

**Problem:** You have made several experimental commits on your current branch that you want to completely discard, rolling your branch pointer back two commits while wiping out all uncommitted workspace edits.
**Hint:** Use the most destructive reset flag pointing back two commits from `HEAD`.
**Solution:** `git reset --hard HEAD~2` (This forcefully rolls back `HEAD`, clears the index, and overwrites the working tree back to the state of two commits ago).

## References

- [Git - git-reset Documentation](https://git-scm.com/docs/git-reset)
- [Pro Git Book: Git Tools - Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified)
  === END FILE ===
