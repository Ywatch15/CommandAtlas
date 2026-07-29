---
slug: git-commit
name: commit
aliases: []
category: git
tags: [git, version-control, commit, history]
difficulty: beginner
supportedOS: [linux, macos, windows]
supportedShells: [bash, zsh, sh, powershell]
intentPhrases:
  - 'save changes to git'
  - 'record a snapshot in git'
  - 'commit staged files'
  - 'write a commit message'
  - 'amend last commit'
relatedCommands: [grep, cp]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-21
author: commandatlas
---

## What is it?

`git commit` creates a new commit object that records the current state of the
staging area (index) as a permanent snapshot in the repository's history.

## Why does it exist?

Git's value is its history — the ability to see every previous state of a project,
understand why each change was made, and revert to any point. None of that is possible
without a mechanism to explicitly checkpoint work. `git commit` is that mechanism:
it is the operation that transforms a transient set of staged changes into a durable,
identified, reviewable record.

The design choice to make committing explicit (rather than automatic) is deliberate:
it forces the author to think about what constitutes a logical unit of work before
recording it, producing a history that tells a story rather than a stream of
unstructured saves.

## Syntax

```bash
git commit [options]
git commit -m "message"
git commit --amend
git commit -a -m "message"
git commit --allow-empty -m "message"
```

## Flags

| Flag                      | Description                                                             | Example                                                                 |
| ------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `-m "message"`            | Set the commit message inline, bypassing the editor                     | `git commit -m "feat: add login page"`                                  |
| `--amend`                 | Replace the most recent commit with a new one (message and/or content)  | `git commit --amend -m "corrected message"`                             |
| `-a` / `--all`            | Automatically stage all tracked, modified files before committing       | `git commit -a -m "fix: correct typo"`                                  |
| `--no-edit`               | Use the existing commit message (with `--amend`) without opening editor | `git commit --amend --no-edit`                                          |
| `-v` / `--verbose`        | Show a diff of what is being committed in the editor                    | `git commit -v`                                                         |
| `--allow-empty`           | Create a commit even if there are no staged changes                     | `git commit --allow-empty -m "chore: trigger CI"`                       |
| `--allow-empty-message`   | Commit with an empty message (discouraged)                              | `git commit --allow-empty-message`                                      |
| `--dry-run`               | Show what would be committed without actually committing                | `git commit --dry-run`                                                  |
| `--signoff` / `-s`        | Add a `Signed-off-by` trailer line to the commit message                | `git commit -s -m "feat: add feature"`                                  |
| `--author "Name <email>"` | Override the author of the commit                                       | `git commit --author="CI Bot <ci@example.com>" -m "chore: auto-format"` |
| `--date "date"`           | Override the author date                                                | `git commit --date="2026-01-01T00:00:00" -m "backdate"`                 |
| `-p` / `--patch`          | Interactively select hunks to stage, then commit                        | `git commit -p`                                                         |

## Examples

```bash
git add README.md
git commit -m "docs: update installation instructions"
```

> The canonical two-step: stage the file, then commit with a message. The `-m` flag
> provides the message inline; without it, Git opens the default editor.

```bash
git commit --amend -m "feat: add user authentication"
```

> Replaces the most recent commit with a new one with the corrected message. The
> staged files at the time of `--amend` become the new commit's content. Use this
> only before pushing — amending a commit that others have already pulled rewrites
> history and causes divergence.

```bash
git commit -a -m "fix: correct off-by-one in loop"
```

> Stages all tracked modified files and commits in a single step. Equivalent to
> `git add -u && git commit -m "..."`. Does NOT stage new, untracked files — those
> still require an explicit `git add`.

```bash
git commit -v
```

> Opens the editor with a diff of what is being committed shown below the message
> template. Useful for reviewing changes one more time while writing the message.

```bash
git commit --allow-empty -m "chore: trigger CI pipeline"
```

> Creates a commit with no file changes. The primary legitimate use case is
> triggering a CI/CD pipeline manually when the codebase itself hasn't changed.

## Real-World Scenarios

**Feature branch workflow**: in a team using feature branches and pull requests, every
commit on a branch should represent one logical, reviewable unit. Before opening a PR,
`git rebase -i` is often used to reorganize commits so each one is atomic and its
message explains why it exists — making the reviewer's job tractable.

**Fixing a typo in the last commit message before pushing**:
`git commit --amend -m "correct message"` — safe because the commit hasn't been shared.
If it has been pushed, use with `git push --force-with-lease` and coordinate with
teammates who may have pulled.

**Emergency hotfix audit trail**: `git commit -S -m "fix: patch CVE-2026-XXXX"` — the
`-S` flag GPG-signs the commit, providing a verifiable audit trail for security-
critical changes.

**Automated commit in CI**: `git commit --author="CI Bot <ci@corp.com>" -m "chore: auto-generate API docs"` — the `--author` override prevents CI commits from appearing under
a human's identity.

## When should it NOT be used?

- **To checkpoint work-in-progress for the sake of saving**: use `git stash` or a
  WIP branch instead. A commit on a shared branch that says "WIP" or "savepoint"
  pollutes history and adds noise to blame and log output.
- **To commit without reviewing what is staged**: always run `git diff --staged`
  (or `git commit -v`) before committing to confirm you are committing exactly what
  you intend. Committing accidentally staged files (e.g. a `.env` file) is a common
  and sometimes severe mistake.
- **To squash multiple independent changes into one commit**: if you have five unrelated
  changes staged, commit them separately. A commit should answer "what one thing
  changed and why," not "what was I working on today."

## Alternatives

- **`git stash`**: for saving uncommitted work without creating a commit — appropriate
  when you need to switch context temporarily.
- **`git commit --fixup <hash>` + `git rebase -i --autosquash`**: for a discipline
  where fixup commits are created during development and then squashed before merge,
  keeping history clean without manual rebase editing.
- No direct alternative for committing — `git commit` is the fundamental operation;
  the alternatives above address adjacent use cases, not the same one.

## How it works internally

A Git commit is an object in Git's content-addressable object store. When you run
`git commit`, Git:

1. Takes a snapshot of the index (staging area), writing a **tree object** that
   represents the current directory structure and file blobs.
2. Creates a **commit object** containing: the SHA-1 of the tree, the SHA-1 of the
   parent commit(s), author metadata (name, email, timestamp), committer metadata,
   and the commit message.
3. Updates the current branch reference (e.g. `refs/heads/main`) to point at the new
   commit object's SHA-1.

The SHA-1 of a commit is derived from all of the above — changing any field (including
the parent, timestamp, or message) produces a different SHA-1. This is what makes
commits immutable: `--amend` does not modify the old commit, it creates a new one.

Git stores objects in `.git/objects/`, first as loose objects and later packed into
`.git/objects/pack/` to save space. The branch reference is a tiny file under
`.git/refs/` containing the SHA-1 of the tip commit.

## Performance Notes

`git commit` is O(staged files) — it only processes what is in the index, not the
entire working tree. Committing 5 files in a 50,000-file repository takes the same
time as committing 5 files in a 5-file repository.

`git commit -a` is slightly slower because it must scan all tracked files for
modifications before staging them, which is O(tracked files).

## Security Notes

- Never commit secrets (passwords, API keys, tokens, private keys) to any repository,
  public or private. Use environment variables, a secrets manager, or `.env` files
  (gitignored). Git history is permanent — a secret committed and then deleted in a
  later commit is still visible in the earlier commit.
- Consider signing commits with GPG (`git commit -S`) for repositories where
  integrity verification matters (e.g. open source projects, security-critical
  codebases). GPG-signed commits are verifiable on GitHub.
- `git commit --amend` and `git rebase` rewrite history. On branches shared with
  others, this creates divergence that requires `--force` to resolve and can cause
  data loss for colleagues who have based work on the original commits.

## Common Mistakes

- **Committing without staging**: `git commit` commits what is in the index (staging
  area), not the working tree. If you edit a file but don't `git add` it, the commit
  won't include those changes. Run `git diff --staged` to see exactly what will be
  committed.
- **Amending a pushed commit**: `--amend` rewrites history. If the commit is already
  on a remote branch others have pulled, amending requires a force push and causes
  divergence. Coordinate with your team before doing this.
- **Vague commit messages**: "fix bug," "update," or "changes" are nearly worthless
  in a long-lived project's `git log`. A good commit message says what changed and why,
  not just that something changed.
- **Committing `.env` or credential files**: if this happens, the file must be removed
  from history with `git filter-branch` or `git filter-repo` (not just deleted in a
  new commit), and any exposed credentials rotated immediately.

## Best Practices

- Write commit messages in the **imperative mood**, present tense: "Add login page,"
  not "Added login page" or "Adding login page." This matches Git's own generated
  messages ("Merge pull request...") and keeps history readable as a changelog.
- Keep the **subject line under 72 characters** so it displays cleanly in `git log`,
  GitHub, and most other interfaces.
- Use a **blank line between subject and body** when the commit needs further
  explanation. The body should explain _why_, not _what_ (the diff shows what).
- Follow a commit convention like **Conventional Commits** (`feat:`, `fix:`, `docs:`,
  `chore:`) for machine-readable changelogs and CI automation that reacts to commit types.
- Commit often during development (small, focused commits) and rebase/squash before
  merging, rather than committing infrequently and producing giant diffs.

## Interview Questions

**Q:** What exactly does `git commit` save?
**A:** It saves a snapshot of the staging area (index) as a commit object, which
contains: a pointer to a tree object (the full directory snapshot), a pointer to
the parent commit(s), author and committer metadata, and the commit message.
It does NOT save the working tree — only what was explicitly staged with `git add`.

**Q:** What is the difference between author and committer in a Git commit?
**A:** The author is the person who originally wrote the change. The committer is the
person who applied the commit to the repository. They differ when you apply a patch
from someone else (`git am`), when CI creates a commit, or when an interactive rebase
is used. Both have separate name, email, and timestamp fields in the commit object.

**Q:** Why does `git commit --amend` change the commit's SHA-1?
**A:** Because the SHA-1 is derived from all of the commit's content: the tree,
parent pointer, author, committer, timestamp, and message. Even if only the message
changes, the SHA-1 changes, producing a new commit object. The old object still exists
in `.git/objects/` until it is garbage-collected.

**Q:** How would you recover if you accidentally committed a secret API key?
**A:** First, rotate the key immediately — treat it as compromised. Then remove it
from history using `git filter-repo --path-glob '*.env' --invert-paths` or the
equivalent BFG Repo Cleaner command. Force-push all affected branches, and have all
collaborators re-clone. Note: GitHub and other hosts may have already cached the
content; contact support and check their secret-scanning notifications.

## Practice Problems

**Problem:** You have staged two files, `feature.js` and an accidentally staged
`debug.log`. Commit only `feature.js` without committing `debug.log`.
**Hint:** You need to unstage one file before committing.
**Solution:** `git restore --staged debug.log && git commit -m "feat: add feature"`
(or `git reset HEAD debug.log` on older Git versions)

**Problem:** You just pushed a commit with the message "fix bug" to a feature branch
that no one else has pulled yet. Correct the message to follow Conventional Commits.
**Hint:** `--amend` is appropriate since the branch is not shared, but you need to
force-push after.
**Solution:** `git commit --amend -m "fix: correct off-by-one in pagination logic"`
then `git push --force-with-lease origin feature/my-branch`

**Problem:** Create an empty commit to manually trigger a CI pipeline re-run on a
branch where no code has changed.
**Hint:** A normal commit fails if there is nothing staged.
**Solution:** `git commit --allow-empty -m "chore: trigger CI pipeline re-run"`

## References

- [git-commit documentation](https://git-scm.com/docs/git-commit)
- [Pro Git Book — Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/)
