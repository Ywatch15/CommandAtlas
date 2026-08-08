---
slug: git-status
name: git status
aliases: []
category: git
tags:
  - git-status
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
  - check git state
  - show modified files
  - view untracked files
  - check staged changes
  - see what to commit
relatedCommands: [git-diff, git-log, git-rm]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git status` is a command-line utility that displays the state of the working directory and the staging area (index). It reveals which changes have been staged for the next commit, which modifications remain unstaged, and which files are currently entirely untracked by the version control system.

## Why does it exist?

Unlike older version control systems that directly commit working directory changes, Git introduces an intermediate layer called the "index" or "staging area." `git status` exists to visualize the complex deltas between three distinct states: the current working tree, the index, and the current `HEAD` commit. Without this tool, developers would lack a unified interface to audit their pending changes, resolve merge conflicts, and prevent accidental or incomplete commits.

## Syntax

```bash
git status [OPTIONS] [--] [<pathspec>...]
```

## Flags

| Flag                                       | Description                                                                                                   | Example                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `-s`, `--short`                            | Outputs the status in a highly condensed, color-coded, two-column format.                                     | `git status -s`                      |
| `-b`, `--branch`                           | Displays the current branch and tracking information even when using the short format.                        | `git status -sb`                     |
| `--show-stash`                             | Displays the number of entries currently shelved in the Git stash at the bottom of the output.                | `git status --show-stash`            |
| `--porcelain[=<version>]`                  | Outputs status in an absolutely stable, machine-readable format guaranteed not to change across Git versions. | `git status --porcelain=v1`          |
| `--long`                                   | Outputs the status in the default, verbose text format (the implicit default if no flags are given).          | `git status --long`                  |
| `-v`, `--verbose`                          | Appends a unified text diff showing exactly what changes are currently staged to be committed.                | `git status -v`                      |
| `-vv`                                      | Appends a unified text diff showing both staged changes AND unstaged working directory changes.               | `git status -vv`                     |
| `-u[<mode>]`, `--untracked-files[=<mode>]` | Controls how untracked files are shown. Modes include `all`, `normal` (default), or `no`.                     | `git status -uno`                    |
| `--ignored[=<mode>]`                       | Forces the command to also display files that are actively ignored by `.gitignore` rules.                     | `git status --ignored=traditional`   |
| `--ignore-submodules[=<when>]`             | Ignores changes to nested submodules. Valid options include `none`, `untracked`, `dirty`, or `all`.           | `git status --ignore-submodules=all` |
| `--ahead-behind`                           | Computes and displays how many commits the local branch is ahead or behind its remote upstream counterpart.   | `git status --ahead-behind`          |

## Examples

```bash
git status
```

> This runs the default inspection, printing verbose instructions on how to stage or unstage files, listing all modified, deleted, and untracked files relative to the current active branch.

```bash
git status -sb
```

> This outputs a severely condensed summary. The `-s` flag condenses file states to two-letter codes (e.g., `M ` for staged, ` M` for unstaged), while `-b` ensures the active branch name and upstream divergence (e.g., `## main...origin/main [ahead 1]`) remains visible at the top.

```bash
git status --porcelain
```

> This executes the command in machine-readable mode. Unlike standard output, the porcelain format disables terminal color codes, removes instructional text, and strictly aligns status columns, making it safe to parse in Bash or Python scripts.

```bash
git status -v
```

> This displays the standard file list but appends the actual line-by-line patch diff of the staging area at the bottom. It allows you to definitively review exactly what code will be bundled into the next commit without running a separate `git diff --cached` command.

```bash
git status -- src/components/
```

> This restricts the status check strictly to the specified pathspec. It is highly useful in massive monorepos when you only care about modifications within a specific subdirectory, filtering out thousands of irrelevant changes elsewhere.

## Real-World Scenarios

**Automating custom shell prompts**

```bash
if [ -n "$(git status --porcelain)" ]; then echo "Dirty!"; fi
```

> DevOps engineers use `git status --porcelain` inside their `~/.bashrc` or `~/.zshrc` to dynamically determine if the current repository has uncommitted changes. By parsing this silent, stable output, they can append a red `*` or `!` to their terminal prompt.

**Debugging aggressive .gitignore rules**

```bash
git status --ignored
```

> When a new configuration file refuses to be tracked by Git despite existing in the directory, developers run this command to reveal hidden ignored files. It confirms if a wildcard rule in a global or local `.gitignore` is unintentionally blacklisting the file.

**Speeding up checks on massive network-mounted repositories**

```bash
git status -uno
```

> When working on a codebase containing hundreds of thousands of files across an NFS mount, a standard status check can hang for several seconds while crawling for untracked files. Passing `-uno` skips the untracked directory crawl entirely, returning the status of already-tracked files instantly.

## When should it NOT be used?

- **Reviewing specific line-by-line changes:** Running `git status` tells you a file was modified, but not _how_. **Reason:** It is a high-level file state viewer, not a content inspector. **Use instead:** `git diff` for unstaged changes or `git diff --cached` for staged changes.
- **Checking if remote teammates pushed new code:** Running `git status` expecting it to warn you about incoming commits. **Reason:** `git status` only compares your local `HEAD` against your local cache of the remote tracking branch. It does not actively query the remote server. **Use instead:** Run `git fetch` first to update your local cache, _then_ run `git status`.
- **Searching historical repository states:** Attempting to see what the repository status was three days ago. **Reason:** `git status` is strictly bound to the immediate present state of the filesystem and index. **Use instead:** `git log --stat` or `git diff HEAD@{3.days.ago}`.

## Alternatives

- **`git diff`:** The primary content inspection tool. **Tradeoff:** `git diff` shows the actual code changes but omits untracked files entirely and can be overwhelmingly verbose if you only want to know _which_ files changed.
- **`git ls-files`:** A low-level "plumbing" command. **Tradeoff:** `git ls-files -m` lists modified files much faster than `git status` because it avoids formatting user-friendly output, making it superior for internal Git hook scripting, but it lacks the contextual branch tracking information human users rely on.

## How it works internally

`git status` does not simply read a static database; it aggressively calculates differences on the fly. When invoked, it reads the `.git/index` binary file into memory to retrieve the list of currently tracked files and their cached filesystem metadata (such as size and modification timestamps).

It then executes a rapid series of `stat()` system calls against the active working directory. If a file's timestamp or size differs from the cached index value, Git opens the file, hashes its contents using SHA-1 (or SHA-256), and compares the new hash against the hash stored in the index. A mismatch flags the file as "modified" (unstaged). Any file found in the working directory that is not present in the index (and not matching a `.gitignore` pattern) is flagged as "untracked".

Simultaneously, Git resolves the `HEAD` reference to determine the commit currently checked out. It compares the tree object of the `HEAD` commit against the contents of the index. Any mismatch here indicates that changes have been added to the staging area, flagging the file as "staged". The command exits with `0` on success, or `128` if executed outside a valid Git repository.

## Performance Notes

- On massive repositories (e.g., Linux kernel or Chromium), the sheer volume of `stat()` system calls required to check the working directory can cause `git status` to execute very slowly (seconds instead of milliseconds).
- You can drastically mitigate this latency by enabling the untracked cache (`git config core.untrackedCache true`) and the filesystem monitor (`git config core.fsmonitor true`), which allows Git to rely on background OS filesystem daemons rather than manually polling the entire disk every time.
- The `--ahead-behind` calculation can be extremely slow if the local branch and remote upstream have diverged significantly. Setting `git config status.aheadBehind false` skips this calculation, improving response times.

## Security Notes

- **Information Disclosure via Output:** Executing `git status` in an exposed terminal, or logging its output in a CI/CD pipeline, can inadvertently leak the filenames and directory structures of sensitive code, API key files, or proprietary configuration files that exist in the working directory as untracked files.
- **Submodule Execution Vectors:** Historically, evaluating the status of nested submodules could trigger arbitrary code execution vulnerabilities in maliciously crafted repositories. While modern Git versions strictly sandbox submodule evaluation, running `git status` on untrusted repositories with recursive submodule checks enabled carries marginal risk.

## Common Mistakes

- **Misinterpreting the Short Format columns:** Assuming `M ` and ` M` mean the same thing in `git status -s`. **Why it's wrong:** The short format uses two strict columns. The first column is the index (staged state), and the second is the working tree (unstaged state). `M ` (green M, space) means staged. ` M` (space, red M) means modified but unstaged. `MM` means the file has staged changes, but has been modified again since staging.
- **Assuming `git status` updates the remote tracking branch:** Wondering why `git status` says "Your branch is up to date" when a coworker just pushed to `main`. **Why it's wrong:** Git is decentralized. `status` only compares against your local `.git/refs/remotes/` cache. You must explicitly run `git fetch` to download the new remote metadata before `git status` can report that you are behind.
- **Piping standard output into scripts:** Using `git status | grep "modified"` in a bash script. **Why it's wrong:** The standard output format is "porcelain" intended for humans, and its exact wording changes based on user configuration, localization (languages), and Git versions. Always use `git status --porcelain` for automation.

## Best Practices

- Run `git status` obsessively. Execute it immediately before `git add` to verify you aren't staging compilation artifacts, and immediately after `git add` to ensure you staged exactly what you intended before committing.
- Set a global alias to map `git status` to `git st` (via `git config --global alias.st status`). Since it is the most frequently typed command in Git, this saves thousands of keystrokes over a year.
- Enable stash visibility by running `git config --global status.showStash true`. This prevents you from forgetting about work-in-progress code shelved weeks ago, as `git status` will persistently remind you of hidden stashes.

## Interview Questions

**Q:** Explain the "Three Trees" architecture of Git and how `git status` interacts with them.
**A:** The Three Trees are `HEAD` (the last commit), the Index (the staging area), and the Working Directory (your actual files). `git status` calculates and displays the differences between these trees. Differences between `HEAD` and the Index are shown as "Changes to be committed". Differences between the Index and the Working Directory are shown as "Changes not staged for commit".

**Q:** What is the specific purpose of the `git status --porcelain` flag, and why is it named that way?
**A:** The `--porcelain` flag forces `git status` to output data in a stable, easily parseable, machine-readable format that will never break across Git updates. The name derives from Git's internal division of commands: "plumbing" commands are low-level internal tools, while "porcelain" commands are user-facing. This flag provides a plumbing-like interface for a porcelain command.

**Q:** If you have an untracked file named `config.json` that is heavily modifying your local environment, but `git status` does not list it at all, what is the most likely cause?
**A:** The file matches a pattern in a `.gitignore` file, or in the repository's `.git/info/exclude` file. You can verify this by running `git status --ignored`, which forces Git to display files it is actively hiding.

## Practice Problems

**Problem:** You are writing a deployment script and need to check if the repository is perfectly clean (no modified, staged, or untracked files). Write the command that outputs a format safe for parsing in an `if` statement.
**Hint:** Standard output changes based on the user's language settings. Use the machine-readable flag.
**Solution:** `git status --porcelain` (If this command returns an empty string, the repository is completely clean).

**Problem:** You have added a file named `debug.log` to your `.gitignore`, but you want to verify that Git is actually ignoring it. Write a command that lists the status of the repository, including files that are actively ignored.
**Hint:** Use the flag that overrides the ignore rules for display purposes.
**Solution:** `git status --ignored` (This will display a separate "Ignored files" section at the bottom of the output, where `debug.log` should appear).

## References

- [Git - git-status Documentation](https://git-scm.com/docs/git-status)
- [Pro Git Book: Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
  === END FILE ===
