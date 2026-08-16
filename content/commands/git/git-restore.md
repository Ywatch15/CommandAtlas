---
slug: git-restore
name: git restore
aliases: []
category: git
tags:
  - version-control
  - workspace-management
  - undo
  - index
  - staging
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
  - discard local changes in git
  - unstage a file
  - revert file to last commit
  - undo git add
  - restore deleted file in git
relatedCommands:
  - git-add
  - git-checkout
  - git-clean
  - git-reset
  - git-switch
alternatives:
  - git-checkout
  - git-reset
status: draft
---

## What is it?

`git restore` is a precise version control utility dedicated entirely to discarding uncommitted changes or un-staging files. It extracts a specific version of a file (or multiple files) from a designated source—typically the Git index (staging area) or a historical commit—and overwrites the active working directory or the index with that content. It provides a safe, declarative mechanism to undo local modifications without altering the repository's commit history or branch pointers.

## Why does it exist?

Prior to Git version 2.23, the `git checkout` command was dangerously overloaded. It was used both for context switching (changing branches) and for destructive file operations (discarding uncommitted work). Similarly, `git reset` was the primary, often confusing way to unstage files. This overlapping functionality caused significant cognitive load and frequent data loss for developers. `git restore` was introduced alongside `git switch` to explicitly separate these duties. It exists to provide a semantically clear, dedicated command exclusively for manipulating the state of files in the working tree and staging area.

## Syntax

```bash
git restore [<options>] [--source=<tree-ish>] [--staged] [--worktree] [--] <pathspec>...
```

## Flags

| Flag                           | Description                                                                                                                             | Example                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `-W`, `--worktree`             | Restores the files in the physical working directory. This is the default behavior if neither `--staged` nor `--worktree` is specified. | `git restore --worktree main.js`                      |
| `-S`, `--staged`               | Restores the files in the Git index (un-staging them). If used without `--worktree`, physical file modifications remain intact.         | `git restore --staged config.yml`                     |
| `-s <tree>`, `--source=<tree>` | Specifies the source tree to restore the file from (e.g., a commit hash or branch name). Defaults to the index.                         | `git restore --source=HEAD~1 app.py`                  |
| `-p`, `--patch`                | Opens an interactive text prompt allowing you to selectively restore specific hunks of code rather than the entire file.                | `git restore -p src/`                                 |
| `-q`, `--quiet`                | Suppresses standard feedback messages, operating silently unless a critical error or conflict occurs.                                   | `git restore -q --staged .`                           |
| `--ours`                       | During a merge conflict, restores the file to the state of the current branch, ignoring the incoming changes.                           | `git restore --ours package.json`                     |
| `--theirs`                     | During a merge conflict, restores the file to the state of the incoming (merged) branch, discarding local changes.                      | `git restore --theirs package.json`                   |
| `-m`, `--merge`                | Recreates the conflicted merge state for a file, re-inserting the conflict markers if they were accidentally resolved or deleted.       | `git restore -m index.html`                           |
| `--conflict=<style>`           | Defines how conflict markers are rendered when using `--merge` (e.g., `merge`, `diff3`, `zdiff3`).                                      | `git restore -m --conflict=diff3 file.txt`            |
| `--ignore-unmerged`            | Prevents the command from failing if it encounters unmerged files, simply skipping them during the restore operation.                   | `git restore --ignore-unmerged .`                     |
| `--ignore-skip-worktree-bits`  | Forces the restoration of a file even if it is currently hidden by Git's sparse-checkout rules.                                         | `git restore --ignore-skip-worktree-bits -- file.txt` |

## Examples

```bash
git restore src/utils.js
```

> Discards any uncommitted changes to `src/utils.js` in the working directory, reverting the file to exactly how it currently looks in the Git index (staging area). If the file hasn't been staged, it reverts to the `HEAD` commit.

```bash
git restore --staged .env
```

> Unstages the `.env` file (removes it from the Git index) but deliberately leaves your modifications intact in the physical working directory. This is the modern, exact equivalent of the legacy `git reset HEAD .env` command.

```bash
git restore --source=main -- src/components/Header.jsx
```

> Extracts `Header.jsx` as it currently exists on the `main` branch and overwrites your local working directory copy. This allows you to cherry-pick the state of a specific file from another branch without merging or rebasing.

```bash
git restore --staged --worktree database.sql
```

> A complete nuclear option for a specific file. This un-stages `database.sql` AND immediately overwrites the physical file in the working directory, permanently reverting it to the state of the `HEAD` commit in one atomic step.

```bash
git restore -p src/auth/
```

> Enters interactive patch mode for the `src/auth/` directory. Git iterates through every contiguous block of modified code, prompting you (`y/n`) whether to discard that specific block. Essential for surgically removing debug prints while keeping legitimate code modifications.

## Real-World Scenarios

**Untangling an Accidental "Add All"**

```bash
git restore --staged .
```

> A developer types `git add .` in the repository root, instantly staging hundreds of autogenerated log files and build artifacts alongside their actual code. Instead of committing the mess or trying to parse `git reset`, they run `git restore --staged .` to instantly clear the staging area, allowing them to selectively re-add only the necessary files.

**Recovering a Deleted File**

```bash
git restore --source=HEAD~1 -- docker-compose.yml
```

> An engineer accidentally deletes a crucial configuration file and creates a commit. To get it back, they don't need to revert the entire commit. They simply target the previous commit (`HEAD~1`) as the source, point to the deleted file path, and `git restore` flawlessly extracts it back into their active working directory.

**Resolving Autogenerated File Conflicts**

```bash
git restore --theirs yarn.lock
git add yarn.lock
```

> During a complex branch rebase, massive merge conflicts appear in package lockfiles (`yarn.lock` or `package-lock.json`). Because manually resolving these files is impossible, the developer uses `--theirs` to entirely accept the incoming branch's lockfile state, instantly resolving the conflict.

## When should it NOT be used?

- **Switching Branches:** **Do not use `git restore` to change your active branch.** While the legacy `git checkout` command handled both files and branches, `git restore` strictly operates on files. Use `git switch <branch>` to navigate between branches.
- **Cleaning Untracked Files:** **Do not use `git restore` to delete files Git doesn't know about.** If you generated temporary build artifacts or new files that have never been committed, `git restore` ignores them entirely. Use `git clean -fd` to remove untracked working tree debris.
- **Rewriting Commit History:** **Do not use `git restore` to undo a published commit.** `git restore` only modifies the active working directory and index. If you need to erase a commit from the repository's permanent timeline, use `git reset` (locally) or `git revert` (for shared branches).

## Alternatives

- **`git checkout -- <file>`:** **The legacy equivalent for working trees.** Before Git 2.23, this was the standard command to discard local changes. It is heavily discouraged in modern workflows because forgetting the `--` can accidentally trigger a branch context switch.
- **`git reset HEAD <file>`:** **The legacy equivalent for the index.** Used historically to unstage a file. `git restore --staged` is significantly more intuitive, as "restore" semantically describes the action of fixing the index state better than "reset."
- **`git stash`:** **Best for temporary shelving.** If you want to clear your working directory but aren't certain you want to permanently destroy your uncommitted modifications, use `git stash` to save them safely to a local stack instead of irreversibly restoring the file.

## How it works internally

Git maintains three distinct state trees: the `HEAD` commit (history), the Index (staging area), and the Working Tree (physical files). `git restore` manipulates the Index and the Working Tree by pulling data from a specified source tree.

When you run `git restore file.txt`, Git defaults the source to the Index. It looks up the SHA-1 blob hash for `file.txt` in the `.git/index` binary file, extracts that compressed blob from the `.git/objects/` database, inflates it via zlib, and physically overwrites the file on your hard drive.

If you append `--staged`, the operation changes. Git defaults the source to the `HEAD` commit. It reads the `HEAD` tree object to find the blob hash for `file.txt`. It then updates the `.git/index` file, replacing the staged blob hash with the `HEAD` blob hash, effectively un-staging the file. The physical file on the disk remains completely untouched.

If you specify a custom source using `--source=feature-branch`, Git bypasses `HEAD` and the Index entirely. It resolves the tree object for the tip of `feature-branch`, locates the blob hash for the requested file within that tree, and extracts it directly into the target destination (the working tree, the index, or both).

## Performance Notes

- **Instantaneous Index Updates:** Using `--staged` without `--worktree` is a purely in-memory/metadata operation. It only requires writing to the `.git/index` file. It is functionally instantaneous, even when un-staging thousands of files simultaneously.
- **I/O Bound Working Tree Restores:** Restoring physical files (`--worktree`) requires Git to parse blobs, inflate them, and write them to the disk filesystem. On massive monorepos, running `git restore .` can incur significant disk I/O penalties and take several seconds to overwrite tens of thousands of files.

## Security Notes

- **Irreversible Data Loss:** Unlike operations that modify the commit graph (which can be undone using `git reflog`), `git restore` overwrites uncommitted local changes. Because those changes were never hashed and stored in `.git/objects/`, they cannot be recovered by Git. Once a file is restored, the local modifications are permanently destroyed.
- **Smudge Filter Execution:** If `.gitattributes` defines a `filter` (clean/smudge) for the restored file path, `git restore` will execute the smudge script during the checkout process. In untrusted repositories, this can result in arbitrary code execution simply by restoring a file.

## Common Mistakes

- **Assuming `--staged` implies `--worktree`**
  - _Mistake:_ Running `git restore --staged config.js` expecting the file in your editor to revert to its previous code state.
  - _Why:_ `--staged` _only_ un-stages the file (modifies the index). It leaves your active physical file completely alone. If you want to discard the changes entirely, you must use `git restore --staged --worktree config.js`.
- **Trying to restore a file deleted in a previous commit**
  - _Mistake:_ Running `git restore deleted_script.sh` and getting a "pathspec did not match any files" error.
  - _Why:_ By default, `git restore` looks at the index or `HEAD`. Since the file was deleted in a past commit, it doesn't exist in `HEAD`. You must explicitly tell Git to look at the commit where the file still existed: `git restore --source=HEAD~1 deleted_script.sh`.
- **Using standard wildcards instead of pathspecs**
  - _Mistake:_ Running `git restore *.txt` and missing files in subdirectories.
  - _Why:_ The shell expands `*.txt` before Git sees it, limiting it to the current directory. To leverage Git's recursive pathspec matching, you must quote the wildcard: `git restore '*.txt'`.

## Best Practices

- **Embrace the Separation of Concerns:** Train your muscle memory away from `git checkout` and `git reset` for file manipulation. Adopting `git switch` for branches and `git restore` for files drastically reduces accidental destructive operations.
- **Isolate Source and Destination:** Mentally model every `git restore` command by explicitly asking yourself: "Where am I pulling the file from (`--source`)?" and "Where am I putting it (`--staged`, `--worktree`)?".
- **Use Interactive Patching for Safety:** Never run `git restore .` blindly if you have been working for hours. Always use `git restore -p` to iterate through the diffs interactively. It acts as a final sanity check, ensuring you do not accidentally discard a brilliant line of code buried amidst debug statements.

## Interview Questions

**Q: Why did the Git maintainers introduce `git restore` in version 2.23 when `git checkout` already handled discarding file changes?**
**A:** `git checkout` was severely overloaded. Passing a branch name switched contexts, while passing a file name destroyed local modifications. This dual-purpose design caused rampant confusion, especially if a branch and a file shared the same name. `git restore` (along with `git switch`) was introduced to cleanly separate destructive file manipulation from non-destructive branch navigation.

**Q: You want to completely reset a specific file (`index.html`) to how it looks in the last commit, throwing away both your staged and unstaged changes. What is the precise command?**
**A:** `git restore --staged --worktree index.html`. Using both flags ensures that the file is removed from the staging index and simultaneously overwritten on the physical disk using the `HEAD` commit as the source.

**Q: What happens if you run `git restore file.txt` when you have untracked changes in `file.txt`?**
**A:** If `file.txt` is an untracked file (never added to Git), `git restore` will fail with an error stating that the pathspec did not match any files known to Git. `git restore` only operates on tracked files.

## Practice Problems

**Problem:** You mistakenly staged a massive file called `dataset.csv` using `git add`. Write the command to un-stage this file without deleting it or altering its contents on your hard drive.
**Hint:** You need to target the index (staging area) exclusively without targeting the working tree.
**Solution:**

```bash
git restore --staged dataset.csv
```

**Problem:** You are currently on the `feature-ui` branch. You want to overwrite your local `styles.css` file with the exact version of `styles.css` that currently exists on the `main` branch, without checking out the entire `main` branch.
**Hint:** Use the flag that explicitly defines an alternative tree-ish source.
**Solution:**

```bash
git restore --source=main -- styles.css
```

## References

- [git-restore(1) Manual Page](https://git-scm.com/docs/git-restore)
- [GitHub Blog: Highlights from Git 2.23](https://github.blog/2019-08-16-highlights-from-git-2-23/)
- [Pro Git Book: Undoing Things](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things)
