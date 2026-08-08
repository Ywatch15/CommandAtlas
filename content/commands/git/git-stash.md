---
slug: git-stash
name: git stash
aliases: []
category: git
tags: [version-control, workspace-management, context-switching, uncommitted-changes]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'save uncommitted changes temporarily'
  - 'shelve working directory'
  - 'switch branches with modified files'
  - 'hide local changes in git'
  - 'reapply saved git stash'
relatedCommands: [git-checkout, git-commit, git-switch]
alternatives: [git-clean, git-commit]
status: draft
---

## What is it?

`git stash` is a version control utility that temporarily shelves (or "stashes") uncommitted local changes—both staged and unstaged—into a localized stack, returning the working directory to match the `HEAD` commit. It allows developers to quickly switch contexts, change branches, or pull upstream updates without being forced to author half-baked "WIP" (Work In Progress) commits or abandon their current modifications. The stashed changes can be reapplied to the same branch, or any other branch, at a later time.

## Why does it exist?

Git strictly prevents operations like branch switching or pulling if local modifications conflict with the target state. Historically, developers facing sudden interruptions (like an urgent hotfix) had to either create messy, temporary commits that polluted the repository's permanent history, or copy-paste their work outside the repository. `git stash` was introduced to provide an ephemeral, local storage mechanism specifically designed for abrupt context switching. It isolates incomplete work from the project's Directed Acyclic Graph (DAG) while preserving it safely within the local `.git` database.

## Syntax

```bash
git stash [push | pop | apply | list | show | drop | clear | branch] [options]
```

_(Note: Running `git stash` without arguments defaults to `git stash push`)_

## Flags

_Because `git stash` operates primarily through subcommands, the following table includes both the critical subcommands and their modifying flags._

| Flag / Subcommand           | Description                                                                                                       | Example                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `push`                      | Explicitly pushes changes onto the stash stack. Allows combining with message and file flags.                     | `git stash push`                     |
| `pop`                       | Removes the most recent stash from the stack and immediately applies it to the working directory.                 | `git stash pop`                      |
| `apply`                     | Applies a stash to the working directory but leaves a copy of it safely on the stash stack.                       | `git stash apply stash@{1}`          |
| `list`                      | Displays all stashes currently saved in the local repository's stack.                                             | `git stash list`                     |
| `show`                      | Outputs a diff summary of the files modified in a stash compared to the commit it was based on.                   | `git stash show -p stash@{0}`        |
| `drop`                      | Permanently deletes a specific stash from the stack without applying it.                                          | `git stash drop stash@{2}`           |
| `clear`                     | Dangerously and permanently deletes _all_ stashes currently stored in the repository.                             | `git stash clear`                    |
| `-m`, `--message`           | Attaches a human-readable description to the stash, essential for identifying it later.                           | `git stash push -m "WIP: Auth API"`  |
| `-u`, `--include-untracked` | Stashes untracked files (newly created files not yet added to Git) alongside modified tracked files.              | `git stash push -u`                  |
| `-a`, `--all`               | Stashes absolutely everything, including untracked files and files explicitly ignored by `.gitignore`.            | `git stash push -a`                  |
| `-k`, `--keep-index`        | Stashes all changes, but leaves any changes already added to the staging area (index) intact in the working tree. | `git stash push -k`                  |
| `-p`, `--patch`             | Opens an interactive prompt allowing you to selectively stash specific hunks of code rather than entire files.    | `git stash push -p`                  |
| `branch`                    | Creates a new branch from the commit the stash was originally based on, applies the stash, and drops it.          | `git stash branch new-fix stash@{1}` |

## Examples

```bash
git stash push -m "Refactoring database connection logic"
```

> Shelves all modified tracked files into a new stash entry at the top of the stack (`stash@{0}`) and attaches a descriptive message. The working directory is immediately reverted to the clean `HEAD` state.

```bash
git stash list
```

> Outputs the current stack of saved changes. The output looks like `stash@{0}: On main: Refactoring database...` and `stash@{1}: WIP on feature: UI tweaks`. The lowest number `0` always represents the most recent stash.

```bash
git stash pop stash@{1}
```

> Takes the _second_ most recent stash, applies its modifications to your current working directory, and if there are no merge conflicts, immediately deletes that stash from the stack.

```bash
git stash show -p stash@{0}
```

> Displays the full patch (line-by-line diff) of the most recent stash. Without the `-p` (patch) flag, `show` only outputs a high-level statistical summary of which files were changed.

```bash
git stash push -k -m "Stashing unstaged to test staged only"
```

> Stashes all unstaged changes while preserving everything currently in the Git index (staged changes). This is highly useful when you want to run a test suite against _only_ the code you are about to commit, hiding the rest of your messy working directory.

## Real-World Scenarios

**The Urgent Hotfix Interruption**

```bash
git stash push -u -m "WIP: Checkout cart redesign"
git checkout main
# ... perform and commit hotfix ...
git checkout feature/cart
git stash pop
```

> A developer is midway through building a feature when a critical production bug is reported. They stash their uncommitted work (including untracked files via `-u`), switch to `main` to author the fix, and then return to their feature branch to seamlessly pop their saved work and resume.

**Transferring Uncommitted Work to a New Branch**

```bash
# Realize you are typing code on the 'main' branch
git stash
git checkout -b feature/new-login
git stash pop
```

> An engineer accidentally starts writing feature code directly on the `main` branch. Instead of losing the work or creating a mess, they stash the changes, create and switch to the correct feature branch, and pop the stash, effectively migrating their uncommitted work to the proper context.

**Untangling a Messy Stash via Branching**

```bash
git stash branch recovered-work stash@{2}
```

> If a developer attempts to `git stash pop` and encounters massive, unresolvable merge conflicts because their current branch has diverged significantly from when the stash was created, they abort. Instead, they use `git stash branch`. Git creates a new branch starting from the exact historical commit where `stash@{2}` was originally created, applies the stash perfectly without conflicts, and drops it.

## When should it NOT be used?

- **Long-Term Storage:** **Do not use `git stash` to archive work you might need next month.** The stash stack is ephemeral, local, and easily cleared by mistake. If work needs to be paused for days or weeks, use `git commit -m "WIP"` and push it to a remote branch.
- **Code Transfer Between Machines:** **Do not rely on `git stash` to move code to another computer.** Stashes are stored strictly in your local `.git` directory and are never transferred via `git push` or `git fetch`. You must commit code to share it.
- **Heavy Multi-Tasking:** **Do not juggle 10 different features using `git stash`.** Remembering what is in `stash@{7}` is an administrative nightmare. If you frequently jump between multiple active tasks, use `git worktree` to check out multiple branches into separate physical directories simultaneously.

## Alternatives

- **`git worktree`:** **Best for parallel development.** Allows you to attach multiple working directories to a single Git repository. You can have `main` checked out in one folder and `feature-A` in another, allowing instant context switching without ever needing to stash or pause your work.
- **WIP Commits:** **Best for persistence and CI/CD.** Running `git commit -am "WIP"` securely writes your changes to the permanent Git database and allows pushing to a remote for backup. The messy commit can easily be squashed later using `git rebase -i` before merging.
- **`git diff > patch.diff`:** **Best for cross-repository sharing.** If you need to temporarily save changes and apply them to a completely different clone of the repository, exporting a raw diff patch is more portable than a local stash.

## How it works internally

Despite its temporary nature, `git stash` is built on top of Git's standard commit machinery. When you execute `git stash push`, Git creates two (or three) dangling commits that are not attached to any branch reference.

1.  **The Index Commit:** Git creates a tree object representing the current state of your staging area (index) and creates a commit for it.
2.  **The Untracked Commit (Optional):** If `-u` or `-a` is used, Git creates a commit encapsulating your untracked/ignored files.
3.  **The Working Tree Commit:** Git creates a final merge commit. The parents of this merge commit are the `HEAD` commit where you initiated the stash, the Index Commit, and (if applicable) the Untracked Commit.

Git then writes the SHA-1 hash of this final merge commit into the `refs/stash` reference. The stack mechanism (`stash@{0}`, `stash@{1}`) is actually just the standard Git reflog for the `refs/stash` pointer. When you run `git stash pop`, Git reads the reflog, extracts the file states from these dangling merge commits, attempts to apply the diffs to your working directory, and if successful, drops the reflog entry.

## Performance Notes

- **The `-a` (All) Trap:** Running `git stash -a` can be devastatingly slow and bloat your local `.git` folder. Because it includes files ignored by `.gitignore`, it will hash and compress your entire `node_modules/`, `vendor/`, or compiled binary `build/` directories into the stash commit.
- **Fast Execution:** Standard `git stash push` (without `-a`) is exceptionally fast, as it only processes currently tracked files and operates entirely via in-memory data structures and local disk I/O, requiring zero network interaction.

## Security Notes

- **Hidden Secret Retention:** If you accidentally type an API key into a file and immediately `git stash` it, that secret is now hashed and stored in `.git/objects/`. Even if you `git stash drop`, the object remains on disk as a dangling commit until Git's garbage collection (`git gc`) runs, meaning forensic tools can still extract the secret from your local machine.
- **Pre-commit Hook Bypass:** Stashing and popping changes bypasses pre-commit hooks (like linters or security scanners like `trufflehog`), as no actual `git commit` command is invoked. Ensure code is scanned properly when the final commit is eventually authored.

## Common Mistakes

- **Forgetting untracked files**
  - _Mistake:_ Creating a new file `utils.js`, running `git stash`, switching branches, and seeing `utils.js` still sitting in your working directory causing conflicts.
  - _Why:_ By default, `git stash` only saves files that Git is already tracking (files that have been previously added). You must explicitly use `git stash push -u` to include newly created, untracked files.
- **Popping with conflicts**
  - _Mistake:_ Running `git stash pop`, encountering merge conflicts, panicking, and running `git reset --hard` assuming the stash is still safely saved.
  - _Why:_ This is a common misconception. If `git stash pop` results in a merge conflict, Git _aborts the drop operation_ and leaves the stash intact in your stack. However, the files in your working directory now contain conflict markers. You can safely `git reset --hard` and your stash will still exist in `git stash list`.
- **Losing context with unnamed stashes**
  - _Mistake:_ Running a naked `git stash` five times a week, resulting in a list of `WIP on main: 3f4a9b...` entries, making it impossible to know which stash contains the database fix.
  - _Why:_ Never use `git stash` without a message for anything longer than a 5-minute context switch. Always use `git stash push -m "brief description"`.

## Best Practices

- **Prefer Apply over Pop:** When pulling down stashed changes, use `git stash apply` instead of `pop`. If something goes wrong with your local environment after applying, the original stash acts as a safe backup. You can manually `git stash drop` it once you are certain the changes are successfully integrated.
- **Use Stash to Split Commits:** Use `git stash push -p` (patch mode) to interactively hide specific hunks of code you don't want to commit right now. Commit the remaining clean working directory, then `git stash pop` to bring back the messy experimental code.
- **Clear the Stack Regularly:** Treat the stash like a temporary clipboard, not a filing cabinet. At the end of every week, review `git stash list` and aggressively run `git stash drop` on old entries to prevent cognitive overload.

## Interview Questions

**Q: What is the exact difference between `git stash pop` and `git stash apply`?**
**A:** `git stash apply` reads the stash and applies the changes to your working directory, leaving the stash entry perfectly intact in the stash stack (e.g., `stash@{0}`). `git stash pop` performs the `apply` operation, and if (and only if) the application is successful with zero merge conflicts, it immediately deletes that stash entry from the stack.

**Q: You ran `git stash`, but `git status` shows that three newly created files are still lingering in your working directory. Why didn't they stash, and how do you fix it?**
**A:** Standard `git stash` only acts upon files currently tracked by Git. Newly created files are untracked. To include them in the stash, you must append the include-untracked flag: `git stash push -u`.

**Q: Is a git stash global to the entire repository, or is it bound to the specific branch you were on when you created it?**
**A:** Stashes are global to the local repository. You can create a stash while on the `main` branch, switch to the `feature` branch, and `pop` the stash there. The stash stack (`refs/stash`) is independent of the `HEAD` branch pointers.

## Practice Problems

**Problem:** You are currently modifying `app.py` and have also created a brand new file `test_app.py`. You need to stash all of these changes, and you want to label the stash as "Auth middleware tests" so you can find it tomorrow. Write the single command to do this.
**Hint:** You need the `push` subcommand, the flag to include untracked files, and the flag to attach a message.
**Solution:**

```bash
git stash push -u -m "Auth middleware tests"
```

**Problem:** You want to view the actual code differences (the patch) of the stash located at `stash@{1}` to see what you wrote before you apply it.
**Hint:** Use the `show` subcommand combined with the patch flag, targeting the specific stash index.
**Solution:**

```bash
git stash show -p stash@{1}
```

## References

- [git-stash(1) Manual Page](https://git-scm.com/docs/git-stash)
- [Pro Git Book: Stashing and Cleaning](https://git-scm.com/book/en/v2/Git-Tools-Stashing-and-Cleaning)
- [Atlassian Git Tutorial: Saving Changes with git stash](https://www.atlassian.com/git/tutorials/saving-changes/git-stash)
