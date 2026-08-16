---
slug: git-revert
name: git revert
aliases: []
category: git
tags:
  - version-control
  - history-management
  - rollback
  - undo
  - commits
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
  - undo a specific commit
  - rollback changes safely
  - revert a merge commit
  - remove bad commit without rewriting history
  - undo git push
relatedCommands:
  - git-cherry-pick
  - git-commit
  - git-rebase
  - git-reset
alternatives:
  - git-reset
status: draft
---

## What is it?

`git revert` is a non-destructive version control command used to undo the changes introduced by a specific commit (or range of commits). Instead of deleting the target commit from the project's history, it calculates the exact inverse of those changes and creates a brand new, forward-moving commit containing that inverted patch. This allows developers to safely roll back buggy code on shared, public branches without corrupting the repository history for other collaborators.

## Why does it exist?

Git's primary design philosophy emphasizes an immutable, append-only history to ensure distributed state consistency. If a developer uses a command like `git reset` to delete a bad commit from a branch that has already been pushed to a remote server, anyone who has pulled that branch will experience catastrophic synchronization errors (divergent histories). `git revert` exists to provide a mathematically safe "undo" button. By appending a new commit that subtracts the faulty code, the repository moves forward in time while logically moving backward in state, perfectly preserving the audit trail and avoiding all distributed sync conflicts.

## Syntax

```bash
git revert [options] <commit>...
git revert --continue | --skip | --abort | --quit
```

## Flags

| Flag                                           | Description                                                                                                                     | Example                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `-n`, `--no-commit`                            | Applies the inverse changes to the working tree and the index, but pauses before automatically creating the commit.             | `git revert -n HEAD~1`                |
| `-m parent-number`, `--mainline parent-number` | Required when reverting a merge commit. Specifies which parent (usually `1`) represents the mainline branch to revert back to.  | `git revert -m 1 <merge-commit-hash>` |
| `-e`, `--edit`                                 | Prompts the user to edit the auto-generated revert commit message before finalizing it (this is the default behavior).          | `git revert -e HEAD`                  |
| `--no-edit`                                    | Bypasses the text editor prompt and automatically commits using Git's default "Revert '...'" message.                           | `git revert --no-edit <commit>`       |
| `--continue`                                   | Resumes the revert process after the user has manually resolved any merge conflicts that occurred during application.           | `git revert --continue`               |
| `--abort`                                      | Cancels an ongoing revert operation, discarding conflict resolutions and returning the working tree to its previous state.      | `git revert --abort`                  |
| `--skip`                                       | Skips the current commit being reverted (useful when reverting a range and one commit's changes are no longer relevant).        | `git revert --skip`                   |
| `--quit`                                       | Forgets that the revert operation is in progress, leaving the working tree and index in their current, potentially messy state. | `git revert --quit`                   |
| `-S[<keyid>]`, `--gpg-sign[=<keyid>]`          | Cryptographically signs the resulting revert commit using GPG.                                                                  | `git revert -S HEAD`                  |
| `-s`, `--signoff`                              | Appends a `Signed-off-by` trailer to the end of the commit message, often required by open-source contribution guidelines.      | `git revert --signoff <commit>`       |
| `--strategy=<strategy>`                        | Uses a specific merge strategy (e.g., `resolve`, `recursive`, `ort`) when applying the reverse patch.                           | `git revert --strategy=ort HEAD`      |
| `-X<option>`, `--strategy-option=<option>`     | Passes a strategy-specific option to the merge machinery, such as prioritizing "ours" or "theirs" during conflicts.             | `git revert -Xtheirs <commit>`        |

## Examples

```bash
git revert HEAD
```

> Reverts the exact changes introduced by the very last commit on the current branch. Git opens the default text editor allowing you to modify the commit message before saving the new inverse commit.

```bash
git revert --no-edit a1b2c3d
```

> Calculates the reverse patch for the specific commit `a1b2c3d`, applies it, and immediately commits it without launching the text editor, using the default message format: "Revert 'Original commit message'".

```bash
git revert -n HEAD~3..HEAD
```

> Reverts the last three commits (from `HEAD~3` up to `HEAD`), but the `-n` (no-commit) flag prevents Git from creating three separate revert commits. Instead, it places the combined inverse modifications into the staging area, allowing you to review them and author a single, unified rollback commit.

```bash
git revert -m 1 9f8e7d6
```

> Reverts the merge commit `9f8e7d6`. Because a merge commit has two parents, Git does not know which side of the merge you want to keep. The `-m 1` flag explicitly tells Git to treat parent 1 (the branch you were on when you ran `git merge`) as the mainline, thereby stripping away all changes brought in by parent 2 (the branch that was merged in).

```bash
git revert --continue
```

> If a `git revert` operation halts due to a merge conflict (e.g., the code you are trying to revert has been heavily modified by subsequent commits), you must manually resolve the conflicts in your editor, run `git add` on the fixed files, and then execute this command to finalize the revert commit.

## Real-World Scenarios

**Emergency Rollback of a Production Deployment**

```bash
git revert --no-edit main
git push origin main
```

> A critical regression is discovered five minutes after a CI/CD pipeline deploys the latest `main` branch to production. The on-call engineer immediately reverts the tip of the branch and pushes. Because `revert` adds a new commit, the remote server accepts the push without requiring `--force`, and the CI/CD pipeline instantly kicks off a new build containing the restored, stable code.

**Surgical Removal of an Old Bug**

```bash
git revert 45a9b2c
```

> A developer uses `git bisect` and discovers that a specific commit from three months ago introduced a subtle memory leak. Instead of manually trying to untangle the old code, they run `git revert` on that exact SHA-1. Git intelligently applies the inverse patch to the current codebase, even though dozens of other commits have occurred since then.

**Consolidated Feature Removal**

```bash
git revert -n feature-branch~5..feature-branch
git commit -m "Revert: Experimental UI implementation (Failed A/B test)"
```

> A product manager decides to pull an experimental feature that was built across 5 distinct commits. The engineer uses the `-n` flag to revert the entire range at once, staging the inverse of all 5 commits, and packages the rollback into a single, clean commit to keep the project history tidy.

## When should it NOT be used?

- **Rewriting Local, Unpushed History:** **Do not use `git revert` to fix a typo in a commit you just made locally.** If the bad commit has not been pushed to a shared remote, use `git commit --amend` or `git reset` to completely erase the mistake from history. `revert` clutters local history unnecessarily.
- **Discarding Uncommitted Working Tree Changes:** **Do not use `git revert` to throw away modifications you haven't committed yet.** `revert` acts strictly on historical commit objects. To discard active working directory changes, use `git restore <file>` or `git checkout -- <file>`.
- **Erasing Sensitive Data:** **Do not use `git revert` to hide leaked passwords or API keys.** Reverting a commit that contains a secret merely adds a new commit deleting the text. The original commit, along with the plaintext secret, remains permanently accessible in the repository's history. Use `git filter-repo` or BFG Repo-Cleaner to cryptographically purge the object.

## Alternatives

- **`git reset`:** **Best for local-only undo operations.** Moves the branch pointer backward in time, completely erasing commits from the project's chronological history. It is highly dangerous on shared branches but produces a much cleaner history for unpushed local work.
- **`git restore`:** **Best for manipulating the working tree.** Changes the state of files in your active directory or staging area without interacting with the commit graph or creating new commits.
- **`git rebase -i` (Interactive):** **Best for surgical history rewriting.** Allows a developer to "drop" a specific commit from the middle of their local history. Like `reset`, it fundamentally alters commit SHAs and should not be used on pushed branches.

## How it works internally

Despite its conceptual simplicity as an "undo" command, `git revert` is implemented internally using Git's three-way merge machinery (the sequencer).

When you revert a commit (let's call it commit `C`), Git looks at `C` and its immediate parent (`B`). It calculates the diff required to go from `B` to `C`. It then reverses this diff.

Git takes this reversed diff and attempts to apply it to your current `HEAD` (the active tip of your branch, let's call it `F`). It performs a three-way merge using `C` as the merge base, `B` as "theirs" (the state we want to achieve regarding this specific delta), and `F` as "ours" (the current state of the project).

If the lines modified in `C` have not been touched by any commits between `C` and `F`, the reversed diff applies cleanly, and the sequencer automatically creates a new commit object. If subsequent commits _have_ modified those same lines, the three-way merge fails, and Git halts the operation, dropping conflict markers into the working directory for manual resolution.

This internal reliance on parents is why reverting a merge commit requires the `-m` flag. A merge commit has two parents. Git's sequencer cannot guess which parent's history you consider the "mainline" to revert to; you must explicitly provide the integer index of the parent.

## Performance Notes

- **Sequential Overhead on Ranges:** When reverting a range of commits (e.g., `git revert HEAD~10..HEAD`), Git's sequencer applies the reverts iteratively, one by one. If a conflict occurs on the first revert, you must resolve it and `continue` before Git processes the next, which can be computationally and manually tedious compared to a blunt `git reset`.
- **Index and Working Tree I/O:** `git revert` requires expanding the involved tree objects into the index and writing them to the filesystem to perform the three-way merge. On massive monorepos, reverting a commit that touches thousands of files will incur significant disk I/O penalties.

## Security Notes

- **Illusion of Deletion:** As emphasized, `git revert` is an additive operation. If malicious code, malware, or proprietary data is committed and pushed, a `git revert` restores the working state of the application but leaves the payload fully intact in the `.git/objects` database, where any attacker cloning the repo can extract it.
- **Signature Preservation:** The new commit generated by `git revert` is authored by the user running the command, not the original author of the faulty code. If your repository enforces signed commits, you must use the `-S` flag to sign the revert commit with your own GPG/SSH key to pass branch protection rules.

## Common Mistakes

- **Reverting a merge, then trying to merge the same branch again later**
  - _Mistake:_ You merge `feature-branch` into `main`, realize it's broken, and run `git revert -m 1 <merge-commit>`. Two weeks later, the bug is fixed, and you try to `git merge feature-branch` again. Git says "Already up to date" but the code is missing.
  - _Why:_ The `revert` commit explicitly declared to Git's DAG: "We do not want the changes introduced by these commits." The commits from `feature-branch` are still technically part of `main`'s history. To reintegrate the branch, you must actually revert the revert commit itself (`git revert <the-revert-commit-hash>`), which restores the code, and _then_ merge the new fixes.
- **Using `revert` to discard local uncommitted changes**
  - _Mistake:_ Typing `git revert file.txt` to try and throw away messy code you just wrote.
  - _Why:_ `git revert` strictly expects a commit hash (or a reference like `HEAD`), not a file path. It operates on repository history, not the working tree. Use `git checkout -- file.txt` or `git restore file.txt` instead.
- **Forgetting the `-m` flag on merges**
  - _Mistake:_ Running `git revert <merge-commit-hash>` and hitting a `fatal: commit is a merge but no -m option was given` error.
  - _Why:_ A merge commit is a convergence point. Git mathematically cannot calculate the inverse diff without you declaring which historical timeline (parent 1 or parent 2) is the baseline you wish to return to.

## Best Practices

- **Use `-n` for Batch Reverts:** If a deployment completely fails and was comprised of 4 distinct commits, do not generate 4 separate revert commits. Run `git revert -n HEAD~4..HEAD` to stage all the inverse changes, then author a single `git commit -m "Rollback: Reverting release v2.4 due to memory leak"` to keep the history readable.
- **Explain the _Why_ in the Commit Message:** By default, Git populates the revert message with "Revert 'Original message'". Always use the editor prompt to add a paragraph explaining _why_ the commit is being reverted (e.g., "This broke the payment gateway API"). Context is crucial for future auditors.
- **Adopt Revert for Shared Branches:** Make it a strict team policy: if a commit has been pushed to a remote branch that other developers fetch from (like `main`, `develop`, or a shared `epic` branch), `git reset` is banned, and `git revert` is the only permissible way to undo changes.

## Interview Questions

**Q: What is the fundamental architectural difference between `git revert` and `git reset`?**
**A:** `git revert` is an additive operation; it creates a new commit that applies the inverse of the target commit's changes, moving the repository history forward. `git reset` is a subtractive/rewriting operation; it physically moves the branch pointer backward to an older commit, permanently erasing subsequent commits from the chronological history (and causing conflicts if the branch was already pushed).

**Q: You reverted a merge commit on Monday using `git revert -m 1`. On Friday, the feature is fixed on its original branch, but when you run `git merge feature-branch`, Git refuses to bring in the original code. Why?**
**A:** When you reverted the merge, you added a commit to `main` that specifically un-did the file changes from `feature-branch`. However, from a graph perspective, the commits from `feature-branch` are still in `main`'s history. A new merge only brings in commits that aren't in `main` yet (the new fixes). To get the original code back, you must `git revert` the actual revert commit you made on Monday, and then merge the new fixes.

**Q: Can you run `git revert` on a commit that is 50 commits deep in the project's history? What might happen?**
**A:** Yes, you can. Git will attempt to calculate the reverse patch for that specific 50-commit-old delta and apply it to the current `HEAD`. However, if any of the 50 intervening commits modified the exact same lines of code as the target commit, the 3-way merge will fail, and you will have to manually resolve complex merge conflicts before the revert can be finalized.

## Practice Problems

**Problem:** You just realized the last two commits on your branch contain bugs, but you don't want to clutter the repository history with two separate "Revert" commits. Write the commands to apply the inverse of the last two commits into your staging area without committing, and then author a single commit with the message "Rollback faulty database migrations".
**Hint:** Use the flag that suppresses automatic commit generation and provide a range.
**Solution:**

```bash
git revert -n HEAD~2..HEAD
git commit -m "Rollback faulty database migrations"
```

**Problem:** You merged a branch into `main` using a standard merge commit, but it broke the build. The merge commit's hash is `a1b2c3d`. Write the command to revert this merge, keeping the history of the branch you were originally on (`main`).
**Hint:** Merge commits require a specific flag to dictate which parent's history should be considered the mainline. Usually, the branch you merged _into_ is parent 1.
**Solution:**

```bash
git revert -m 1 a1b2c3d
```

## References

- [git-revert(1) Manual Page](https://git-scm.com/docs/git-revert)
- [Pro Git Book: Undoing Things](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things)
- [How to revert a faulty merge (Linus Torvalds)](https://github.com/git/git/blob/master/Documentation/howto/revert-a-faulty-merge.txt)
