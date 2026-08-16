---
slug: git-rebase
name: git rebase
aliases: []
category: git
tags:
  - version-control
  - history-rewriting
  - commits
  - branching
  - interactive
difficulty: advanced
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
  - squash commits together
  - update branch with main
  - rewrite git history
  - move branch to another base
  - resolve rebase conflicts
relatedCommands:
  - git-cherry-pick
  - git-commit
  - git-merge
  - git-push
  - git-revert
alternatives:
  - git-cherry-pick
  - git-merge
  - git-reset
status: draft
---

## What is it?

`git rebase` is a powerful version control command that integrates changes from one branch into another by modifying the foundational commit (the "base") of the current branch. Instead of generating a new merge commit that ties two divergent histories together, rebase extracts the individual commits from your current branch and reapplies them sequentially on top of the specified target branch. This process rewrites the commit history, generating entirely new cryptographic SHA-1 hashes for the reapplied commits, resulting in a perfectly linear, sequential project timeline.

## Why does it exist?

In highly active, distributed repositories, frequent `git merge` operations create a convoluted, diamond-patterned DAG (Directed Acyclic Graph) of commits, often cluttered with extraneous "Merge branch 'X' into 'Y'" messages. This non-linear history is notoriously difficult to read, audit, or traverse using tools like `git bisect`. `git rebase` exists to solve this by allowing developers to port their local, unpushed work on top of the latest upstream changes, pretending as if their feature was authored consecutively after the upstream code, thereby preserving a clean, mathematically linear, and easily bisectable project history.

## Syntax

```bash
git rebase [options] [<upstream> [<branch>]]
git rebase [-i | --interactive] [options] [--exec <cmd>] [--onto <newbase>] [<upstream> [<branch>]]
git rebase --continue | --skip | --abort | --quit
```

## Flags

| Flag                    | Description                                                                                                                                         | Example                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-i`, `--interactive`   | Opens a text editor with a list of commits to be rebased, allowing the user to squash, reorder, edit, or drop individual commits.                   | `git rebase -i HEAD~3`                       |
| `--onto <newbase>`      | Specifies a precise new starting point for the rebase, allowing a branch to be transplanted to a completely different lineage.                      | `git rebase --onto main feature-a feature-b` |
| `--continue`            | Resumes the rebase process after the user has manually resolved merge conflicts or finished editing a commit during an interactive rebase.          | `git rebase --continue`                      |
| `--abort`               | Cancels the rebase entirely, discarding any resolved conflicts and resetting the branch and working tree to their pre-rebase state.                 | `git rebase --abort`                         |
| `--skip`                | Bypasses the current commit being applied. Used when the commit's changes are completely overwritten by the new base or no longer relevant.         | `git rebase --skip`                          |
| `-x`, `--exec <cmd>`    | Appends a shell command after each commit in an interactive rebase. If the command fails (non-zero exit), the rebase pauses.                        | `git rebase -x "npm test" main`              |
| `--autostash`           | Automatically stashes uncommitted working directory changes before starting the rebase, and unstashes them when the rebase completes.               | `git rebase --autostash origin/main`         |
| `--autosquash`          | Automatically squashes commits whose messages begin with `fixup!` or `squash!` into their corresponding target commits during `-i`.                 | `git rebase -i --autosquash main`            |
| `-r`, `--rebase-merges` | Preserves branch topology by recreating merge commits during the rebase, rather than flattening them out (replaces deprecated `--preserve-merges`). | `git rebase -r origin/main`                  |
| `--root`                | Rebases all commits reachable from the current branch down to the repository's root (first commit), allowing you to rewrite the initial commit.     | `git rebase -i --root`                       |

## Examples

```bash
git rebase main
```

> Standard rebase. Calculates the common ancestor of the current branch and `main`, detaches the commits unique to the current branch, updates the current branch's base to the tip of `main`, and reapplies the detached commits one by one.

```bash
git rebase -i HEAD~4
```

> Initiates an interactive rebase for the last 4 commits of the current branch. An editor opens presenting the commits in chronological order (oldest first). Changing the prefix from `pick` to `squash` (or `s`) will meld a commit into the one above it.

```bash
git rebase --onto main feature-v1 feature-v2
```

> A surgical transplant. Takes the commits that are in `feature-v2` but _not_ in `feature-v1`, and reapplies them directly onto the tip of `main`. Crucial when `feature-v2` was originally branched off `feature-v1`, but `feature-v1` is no longer needed.

```bash
git rebase -x "pytest tests/" origin/main
```

> Rebases the current branch onto `origin/main`, but halts the rebase after every single commit application to run `pytest tests/`. This guarantees that every individual commit in a PR compiles and passes tests, ensuring `git bisect` will not break in the future.

```bash
git rebase --abort
```

> Aborts an active rebase. If you hit a massive, unresolvable merge conflict during a rebase step and realize you made a mistake, this command instantly destroys the temporary rebase state and restores your branch to exactly how it was before you typed `git rebase`.

## Real-World Scenarios

**Squashing "WIP" Commits Before a Pull Request**

```bash
git rebase -i origin/main
# In editor: change 'pick' to 'squash' for intermediate commits
git push --force-with-lease origin feature-auth
```

> Developers frequently commit rapid, messy snapshots (e.g., "wip", "fix typo", "actually fix bug") to their local branches. Before opening a Pull Request, an engineer runs an interactive rebase against `origin/main` to squash these granular steps into a single, cohesive, atomic commit with a detailed message.

**Updating a Stale Branch with Upstream Changes**

```bash
git fetch origin
git rebase origin/main
```

> If a feature branch has been active for weeks, the upstream `main` branch has likely moved forward significantly. Instead of creating a messy merge commit to pull in the latest architecture changes, the developer fetches the latest upstream data and rebases their feature branch onto it, cleanly placing their isolated work on top of the newest codebase.

**Extracting a PR out of a Monolithic Branch**

```bash
git rebase --onto main HEAD~3 HEAD
```

> An engineer accidentally wrote three commits for a new UI component on top of an unrelated, unmerged backend branch. To separate them for an independent PR, they use `--onto` to take the last three commits (`HEAD~3` to `HEAD`) and replay them directly onto `main`, effectively detaching the UI work from the backend work.

## When should it NOT be used?

- **On Shared/Public Branches:** **The Golden Rule of Rebasing: Never rebase commits that exist outside your repository.** If you rebase a branch that coworkers have already pulled and based their work on, you rewrite the commit hashes. When they try to pull or push, Git will see divergent histories, resulting in catastrophic, duplicate-commit merge conflicts for the entire team.
- **When Historical Context is Critical:** **Do not use rebase if you need an exact audit trail of when code was integrated.** Rebasing lies about history—it changes the commit timestamps and DAG lineage to look perfect. If strict regulatory auditing requires knowing exactly when a feature branch was merged alongside other concurrent work, use `git merge --no-ff`.
- **Massive, Long-Lived Branch Integration:** **Do not rebase a branch that is hundreds of commits behind.** Because rebase applies commits iteratively, a conflict in an early commit may force you to manually resolve that identical conflict repeatedly for every subsequent commit. Use `git merge` to resolve all conflicts exactly once.

## Alternatives

- **`git merge`:** **Best for collaborative branch integration.** Merging preserves the exact historical timeline and commit SHAs, creating a distinct "merge commit" that ties two histories together. It is safe for shared branches and requires resolving conflicts only once.
- **`git cherry-pick`:** **Best for grabbing specific commits.** While `--onto` can transplant a range of commits, `cherry-pick` is vastly simpler if you only need to copy one or two specific bugfix commits from a different branch onto your current branch without moving the branch's base.
- **`git reset --soft`:** **Best for quick, blunt squashing.** If you just want to collapse all your unpushed commits into one without dealing with the interactive text editor, `git reset --soft <target>` leaves all the file modifications staged, allowing you to instantly write a single `git commit`.

## How it works internally

When a standard rebase is executed (e.g., `git rebase main` from a `feature` branch), Git first identifies the merge base (the common ancestor commit) between `feature` and `main`.

Next, Git extracts the diffs introduced by each commit in `feature` that occurred after the merge base. Conceptually, it runs `git format-patch` to generate a patch file for each commit, storing these temporarily in the `.git/rebase-merge/` or `.git/rebase-apply/` directories.

Git then forcefully updates the `HEAD` pointer of the `feature` branch to point to the tip of `main` (the new base).

Finally, Git's sequencer machinery iteratively reads the saved patches and attempts to apply them one by one (`git am`). Because the parent of the first applied commit is now the tip of `main` instead of the original merge base, the cryptographic SHA-1 hash of the commit fundamentally changes. Consequently, every subsequent commit applied on top of it also receives a brand new SHA-1 hash, even if the file diffs and commit messages remain identical to the original commits.

If a patch application fails due to a conflict, the sequencer halts, drops the user into the working directory to resolve the files, and waits for `git add` and `git rebase --continue` to proceed to the next patch.

## Performance Notes

- **Iterative Conflict Resolution:** Unlike `git merge` which compares the branch tips in one pass, `git rebase` applies commits sequentially. If a file was modified 50 times in your branch and conflicts with the new base, you may have to resolve the conflict 50 times.
- **Git Rerere:** To mitigate repetitive conflict resolution overhead during rebases, advanced users enable `git config --global rerere.enabled true`. Git will "reuse recorded resolutions" by memorizing how you resolved a specific conflict hunk and automatically applying that resolution if the exact conflict appears again in subsequent rebase steps.

## Security Notes

- **Arbitrary Code Execution via `-x`:** The `--exec` flag runs arbitrary shell commands directly from the rebase instruction sheet (`git-rebase-todo`). A malicious repository could trick a user into running an interactive rebase equipped with a pre-configured `exec` step that executes payload scripts with the developer's user privileges.
- **Signed Commits Subversion:** Because rebasing generates entirely new commits, any GPG/SSH signatures on the original commits are irrevocably broken and stripped. To re-sign the newly generated commits during the rebase, the user must explicitly pass the `-S` or `--gpg-sign` flag, requiring the private key to be unlocked for the duration of the rebase.

## Common Mistakes

- **Rebasing already-pushed commits**
  - _Mistake:_ Rebasing a branch that is already on GitHub, running standard `git push`, getting a "non-fast-forward" rejection, and blindly running `git pull` to fix it.
  - _Why:_ The `pull` will fetch the old, un-rebased commits from the server and merge them with your newly rebased local commits. You will end up with duplicate commits (same diffs, different SHAs) intertwined in your history. You _must_ use `git push --force-with-lease` after rebasing published branches.
- **Swapping `--onto` arguments**
  - _Mistake:_ Typing `git rebase --onto feature main`.
  - _Why:_ The syntax is `newbase` followed by `oldbase`. Getting this backward instructs Git to calculate the commits in `main` that aren't in `feature` and transplant them. This usually results in a massive, confusing mess of the repository structure.
- **Manually skipping empty commits in `-i`**
  - _Mistake:_ Hitting a conflict where a commit is completely empty (because the upstream branch already implemented the change), and deleting it from the todo list to fix the pause.
  - _Why:_ While deleting it works, standard procedure is to use `git rebase --skip`. Modern Git also supports `git rebase --empty=drop` to automatically handle this scenario without halting.

## Best Practices

- **Pull with Rebase:** Configure Git to automatically rebase your local commits on top of incoming upstream commits when pulling, avoiding merge commit clutter on active branches: `git config --global pull.rebase true`.
- **Use `--force-with-lease`:** When pushing a rewritten branch to a remote, never use `git push -f`. Always use `git push --force-with-lease`, which verifies that the remote branch has not been updated by a coworker since your last fetch, preventing you from silently overwriting their work.
- **Frequent Base Updates:** If working on a long-running feature branch, `git fetch` and `git rebase origin/main` frequently (e.g., daily). Resolving conflicts in small, iterative batches is significantly safer and easier than rebasing a massive, diverged branch after three weeks of isolation.

## Interview Questions

**Q: What is the "Golden Rule of Rebasing"?**
**A:** Never rebase a branch that has been pushed to a shared repository and is actively being used by other developers. Because rebasing rewrites commit hashes, it will diverge your local history from the remote history. When others try to sync, they will encounter severe duplicate-commit merge conflicts.

**Q: In an interactive rebase (`-i`), what is the difference between `squash` and `fixup`?**
**A:** Both commands meld the specified commit into the commit immediately preceding it. However, `squash` halts the rebase to open a text editor, allowing you to combine and edit the commit messages of both commits. `fixup` silently melds the commit but entirely discards its commit message, retaining only the previous commit's message.

**Q: You successfully completed a complex `git rebase`, but immediately realize you rebased onto the wrong branch and broke your code. How do you undo the entire rebase?**
**A:** Because the rebase finished, `--abort` is no longer available. However, `git reflog` records all movements of the `HEAD` pointer. You run `git reflog`, find the SHA-1 hash of the commit just before the rebase started, and run `git reset --hard <hash>` to instantly restore your branch to its pre-rebase state.

## Practice Problems

**Problem:** You have 5 messy commits on your `feature-ui` branch. Write the command to interactively squash the last 3 of those commits, leaving the older commits untouched.
**Hint:** Initiate an interactive rebase referencing the `HEAD` pointer, looking back exactly the number of commits you want to modify.
**Solution:**

```bash
git rebase -i HEAD~3
```

_(In the editor, you would leave the first commit as `pick` and change the subsequent two to `squash` or `s`.)_

**Problem:** You created a branch `feature-b` originating from `feature-a`. You now realize `feature-b` doesn't actually depend on `feature-a`, and you want to move `feature-b` so it branches directly off `main`. Write the command to perform this transplant.
**Hint:** Use the flag designed for explicitly defining a new base, specifying the target base, the old base, and the branch to move.
**Solution:**

```bash
git rebase --onto main feature-a feature-b
```

## References

- [git-rebase(1) Manual Page](https://git-scm.com/docs/git-rebase)
- [Pro Git Book: Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
- [Atlassian Git Tutorial: Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
