---
slug: git-rm
name: git rm
aliases: []
category: git
tags: [version-control, file-management, index, tracking, deletion]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'stop tracking a file in git'
  - 'remove a file from the repository'
  - 'delete tracked files'
  - 'untrack a directory but keep it locally'
  - 'remove files from git index'
relatedCommands: [git-add, git-status]
alternatives: [git-reset]
status: draft
---

## What is it?

`git rm` is a command-line utility used to remove files from a Git repository's tracking index and, by default, from the local working directory simultaneously. It formally stages the deletion so that the removal is permanently recorded in the next commit snapshot. It acts as a version-control-aware wrapper around standard filesystem deletion, ensuring that the Git index and the physical working tree remain perfectly synchronized.

## Why does it exist?

If a developer deletes a tracked file using the standard operating system `rm` command, the file disappears from the disk, but Git still records it in the index as an unstaged deletion (a "changed but not updated" state). The developer is then forced to manually run `git add <file>` or `git add -u` to explicitly stage the removal. `git rm` exists to collapse this two-step process into a single, atomic operation. Furthermore, it implements critical safety checks to prevent the accidental deletion of files that contain uncommitted local modifications, a protection the raw OS `rm` command lacks.

## Syntax

```bash
git rm [options] [--] <pathspec>...
```

## Flags

| Flag                          | Description                                                                                                                                   | Example                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `-f`, `--force`               | Overrides the up-to-date check, forcing the removal of files even if they have uncommitted modifications in the working tree or staging area. | `git rm -f modified_script.sh`                         |
| `--cached`                    | Removes the file from the Git tracking index but leaves it completely intact on the local filesystem. Crucial for untracking files.           | `git rm --cached .env`                                 |
| `-r`                          | Recursively removes directories and all their tracked contents. Refuses to operate on directories without this flag.                          | `git rm -r src/legacy_module/`                         |
| `-n`, `--dry-run`             | Simulates the command without actually deleting any files or updating the index, showing what _would_ be removed.                             | `git rm -n '*.log'`                                    |
| `--ignore-unmatch`            | Exits with a 0 (success) status code even if no files matched the provided pathspec, preventing scripts from halting on non-existent files.   | `git rm --ignore-unmatch build.out`                    |
| `-q`, `--quiet`               | Suppresses the standard output summary of the removed files, operating silently unless an error occurs.                                       | `git rm -q old_config.json`                            |
| `--sparse`                    | Allows `git rm` to update index entries for files that are currently hidden outside the active sparse-checkout cone.                          | `git rm --sparse hidden_file.txt`                      |
| `--pathspec-from-file=<file>` | Reads the list of files to remove from a specified text file instead of from standard command-line arguments.                                 | `git rm --pathspec-from-file=to_delete.txt`            |
| `--pathspec-file-nul`         | Instructs Git that the paths in the `--pathspec-from-file` are separated by NUL (`\0`) characters, allowing spaces/newlines in filenames.     | `git rm --pathspec-file-nul --pathspec-from-file=list` |
| `--`                          | Positional separator used to explicitly denote that subsequent arguments are file paths, not command flags or branch names.                   | `git rm -f -- -f`                                      |

## Examples

```bash
git rm deprecated_logic.js
```

> Deletes `deprecated_logic.js` from the physical working directory and immediately stages the deletion in the Git index. When `git commit` is run next, the file will be removed from the repository's tracked snapshot.

```bash
git rm --cached config/database.yml
```

> Removes `config/database.yml` from Git's tracking index so it is no longer versioned, but physically leaves the file untouched on your local hard drive. This is the standard method for retroactively untracking files that should have been in `.gitignore`.

```bash
git rm -r old_frontend/
```

> Recursively removes the `old_frontend` directory and all tracked files contained within it. If the directory contains untracked files, Git will leave the directory and the untracked files alone, deleting only what was tracked.

```bash
git rm -n '*.tmp'
```

> Performs a dry run to delete all files matching the `.tmp` extension. Git outputs the list of files it intends to delete without actually touching the disk or the index, allowing you to verify the wildcard won't destroy unintended files.

```bash
git rm -f active_development.py
```

> Forces the deletion of a tracked file that has local, uncommitted modifications. Normally, `git rm` blocks this action to prevent accidental data loss. The `-f` flag bypasses the safety check and aggressively deletes the file.

## Real-World Scenarios

**Untracking Accidentally Committed Secrets**

```bash
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "Stop tracking environment variables"
```

> A developer mistakenly commits their `.env` file containing database passwords. They must immediately stop Git from tracking it without deleting the file from their local machine so their app continues to run. They use `--cached`, add it to `.gitignore`, and commit the removal. _(Note: This does not erase the secret from historical commits)._

**Scrubbing Autogenerated Build Artifacts**

```bash
git rm -r --cached bin/ obj/
```

> A C# or Java project was initialized without a proper `.gitignore`, causing compiled binary folders to be tracked. The engineer uses recursive cached removal to strip these heavy, auto-generated directories out of the Git index while keeping the compiled files available for the current local build step.

**Scripted Cleanup Operations**

```bash
git ls-files --deleted -z | xargs -0 git rm --ignore-unmatch
```

> In a complex build pipeline where a third-party tool deletes files directly via the OS, Git is left with hundreds of unstaged deletions. This script safely pipes all locally deleted files to `git rm`, using null terminators (`-z`, `-0`) to safely handle files with spaces, immediately staging them for the next commit.

## When should it NOT be used?

- **Discarding changes to a tracked file:** **Do not use `git rm` to undo modifications.** If you accidentally broke a file and want to revert it to its last committed state, `git rm` will delete the file entirely. Use `git restore <file>` or `git checkout -- <file>` instead.
- **Cleaning up untracked files:** **Do not use `git rm` to delete files that Git doesn't know about.** `git rm` only operates on the index. If you have generated dozens of untracked log files, `git rm` will fail. Use the OS `rm` command or `git clean -fd`.
- **Purging sensitive data permanently:** **Do not rely on `git rm` to fix a leaked password.** `git rm` only removes the file from the _next_ commit onward. The file and its contents remain fully accessible in the repository's historical graph. You must use `git filter-repo` or BFG Repo-Cleaner to rewrite history.

## Alternatives

- **`rm` + `git add -u`:** **Best for sweeping manual changes.** If you use a GUI file explorer or an IDE to delete multiple files, running `git add -u` (update) stages all those deletions in one command, bypassing the need to use `git rm` explicitly.
- **`git clean`:** **Best for untracked debris.** Removes untracked files and directories from the working tree. It is the direct complement to `git rm`, targeting the files Git specifically ignores or doesn't know about.
- **`git filter-repo`:** **Best for historical eradication.** When a large binary file or API key needs to be completely annihilated from every commit in the repository's history, not just the active branch.

## How it works internally

When `git rm` is invoked, it performs a strict three-way validation check before executing any filesystem operations. It compares the `HEAD` commit version of the file, the index (staging area) version, and the physical working tree version. If all three match, the command proceeds. If there is a mismatch (e.g., the file has uncommitted local edits), `git rm` aborts with an error, protecting the user from irrecoverable data loss since uncommitted changes cannot be restored via Git.

Once validated, `git rm` invokes standard operating system system calls (like `unlink()` on Unix) to delete the physical file from the working directory. It then reads the binary `.git/index` file, locates the path entry for the deleted file, and removes it from the data structure, writing the updated index back to disk.

Because Git's architecture is object-based, `git rm` does _not_ delete the actual file content (the blob) from the `.git/objects/` directory. The blob object remains safely stored on disk. It will only be permanently deleted if it becomes entirely orphaned (no commits or branches point to it) during a subsequent garbage collection (`git gc`) run.

## Performance Notes

- **I/O Bound Deletions:** When running `git rm -r` on massive directories (like `node_modules/` if it was accidentally tracked), the performance bottleneck is entirely bound by the OS's ability to issue `unlink()` calls on thousands of small files, not Git's index update.
- **Instantaneous Cached Removals:** Using `git rm --cached` operates near-instantaneously, even on massive directories, because it completely skips filesystem I/O operations and only modifies the relatively small, in-memory representation of the Git index.

## Security Notes

- **Historical Permanence:** A file removed by `git rm` is still a permanent part of the repository. Anyone who clones the repository can easily retrieve the removed file by running `git checkout HEAD~1 -- <file>`. Never use `git rm` as a security remediation for leaked credentials.
- **Symlink Attacks:** Historically, Git had vulnerabilities (like CVE-2017-1000117) where maliciously crafted repositories could trick commands dealing with pathspecs into traversing symlinks to overwrite or delete files outside the working directory. Modern Git versions heavily restrict pathspec resolution to prevent out-of-bounds deletions.

## Common Mistakes

- **Forgetting `--cached` for `.env` files**
  - _Mistake:_ Realizing you tracked a local database config file, and running `git rm config.local.json` to untrack it.
  - _Why:_ Without `--cached`, `git rm` deletes the physical file from your hard drive. Your local application immediately breaks because its config file is gone. You must use `--cached` to sever the Git tracking link while preserving the local file.
- **Attempting to `git rm` an untracked file**
  - _Mistake:_ Creating `notes.txt`, deciding you don't need it, and running `git rm notes.txt`, resulting in `fatal: pathspec 'notes.txt' did not match any files`.
  - _Why:_ `git rm` only manages the Git index. If a file was never added to the index (`git add`), Git refuses to manage its deletion. Just use the standard `rm` command.
- **Over-relying on `-f`**
  - _Mistake:_ Getting an error that a file has local modifications, and blindly slapping `-f` on the command to force it through.
  - _Why:_ Those local modifications were never committed. By forcing the removal, you have permanently destroyed that work. You cannot `git checkout` or `git reflog` to get uncommitted changes back.

## Best Practices

- **Dry-Run Wildcards:** Before executing a command like `git rm -r *.bak` or `git rm -r src/old_*`, always append `-n` first. This prints the exact list of files Git will destroy, allowing you to catch rogue wildcard expansions before catastrophic deletion.
- **Immediate Gitignore Updates:** The instant you run `git rm --cached <file>`, open your `.gitignore` and add the file path to it. If you don't, the very next time you type `git add .`, Git will happily track the file all over again.
- **Commit Removals Logically:** Treat file removals as distinct logical changes. Instead of bundling the deletion of an entire deprecated subsystem into a commit that also adds a new feature, commit the `git rm` operations separately (e.g., `git commit -m "chore: remove deprecated analytics module"`).

## Interview Questions

**Q: Explain the exact difference between running `rm file.txt` and `git rm file.txt`.**
**A:** `rm` is an OS command that physically deletes the file from the disk, leaving Git's index out of sync (Git sees it as an unstaged deletion). `git rm` physically deletes the file from the disk _and_ simultaneously removes it from Git's internal index, formally staging the deletion for the next commit.

**Q: You need to stop Git from tracking a configuration file, but you absolutely must keep the file on your local machine so your dev server keeps working. What command do you use?**
**A:** You must use `git rm --cached <file>`. The `--cached` flag tells Git to remove the file from the staging index (stopping future tracking) but entirely bypasses the physical filesystem deletion step.

**Q: Why does `git rm` sometimes fail with an error stating "the following file has local modifications," and how does Git know this?**
**A:** `git rm` checks the file's hash in the `HEAD` commit against the hash in the staging index and the actual state of the working directory. If the working directory has uncommitted edits, Git blocks the deletion because those changes are not safely stored in the object database and would be permanently lost. You must use `-f` to override this safety mechanism.

## Practice Problems

**Problem:** You have a directory named `build_output/` that was accidentally added to Git in the last commit. You want to stop tracking this directory and all files inside it, but you want to keep the directory on your local file system.
**Hint:** You need the flag for recursive operation combined with the flag that prevents physical deletion.
**Solution:**

```bash
git rm -r --cached build_output/
```

**Problem:** You want to safely delete all files ending in `.log` in the current directory using `git rm`, but you want to test the command first to see exactly which files will be affected without actually deleting them.
**Hint:** Use the wildcard alongside the flag that explicitly simulates the command's execution.
**Solution:**

```bash
git rm -n *.log
```

## References

- [git-rm(1) Manual Page](https://git-scm.com/docs/git-rm)
- [Pro Git Book: Removing Files](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository#_removing_files)
- [GitHub Documentation: Removing files from a repository's history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
