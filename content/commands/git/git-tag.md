---
slug: git-tag
name: git tag
aliases: []
category: git
tags:
  - version-control
  - tags
  - release
  - repository
  - scm
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - create git tag
  - list git tags
  - tag a software release
  - delete a git tag
  - sign git tag with gpg
relatedCommands:
  - git-checkout
  - git-commit
  - git-log
  - git-push
alternatives:
  - git-branch
status: draft
---

## What is it?

`git tag` is a version control command used to create, list, delete, or verify permanent reference markers that point to specific points in a repository's commit history. It is most commonly used to capture immutable software release milestones (e.g., `v1.0.0`).

## Why does it exist?

Branches in Git are fluid, movable pointers that shift continuously as new commits are added. While this is ideal for active development, it creates a major hazard for tracking software releases, which require static, unmoving anchors that will never drift. `git tag` exists to fill this architectural gap, providing a mechanism to freeze a specific commit hash with a human-readable identifier.

## Syntax

```bash
git tag [-a | -s | -u <key-id>] [-m <msg>] [-f] <tagname> [<commit>]
git tag -d <tagname>...
git tag [-n[<num>]] -l [--contains <commit>] [--no-contains <commit>] [<pattern>]
git tag -v <tagname>...
```

## Flags

| Flag                          | Description                                                                                                   | Example                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-a`, `--annotate`            | Creates an annotated tag, storing a full tag object in the database with metadata, author, date, and message. | `git tag -a v1.0.0 -m "Release version 1.0.0"` |
| `-s`, `--sign`                | GPG-signs the annotated tag using the default user identity configured in Git.                                | `git tag -s v1.0.0 -m "Signed release"`        |
| `-u`, `--local-user=<key-id>` | GPG-signs the tag using a specific cryptographic GPG key ID.                                                  | `git tag -u 5EE30809 v1.0.0 -m "Secure tag"`   |
| `-m`, `--message=<msg>`       | Specifies a descriptive message to attach to an annotated or signed tag.                                      | `git tag -a v1.1.0 -m "Bug fix release"`       |
| `-d`, `--delete`              | Deletes the specified tag or tags from the local repository database.                                         | `git tag -d v0.9.0`                            |
| `-l`, `--list`                | Lists all tags matching an optional shell glob pattern (default if no arguments are provided).                | `git tag -l "v1.*"`                            |
| `-f`, `--force`               | Overwrites an existing tag with the same name instead of failing when a duplicate is encountered.             | `git tag -f v1.0.0 HEAD`                       |
| `--contains=<commit>`         | Filters the tag list to show only tags that contain or point to the specified commit.                         | `git tag --contains a1b2c3d`                   |
| `--no-contains=<commit>`      | Filters the tag list to show only tags that do _not_ contain the specified commit.                            | `git tag --no-contains main`                   |
| `-v`, `--verify`              | Verifies the cryptographic GPG signature of specified signed tags.                                            | `git tag -v v1.0.0`                            |
| `--merged=<commit>`           | Filters the tag list to show only tags whose commits are fully merged into the target commit.                 | `git tag --merged feature-branch`              |

## Examples

```bash
git tag v1.0.0
```

> This creates a lightweight tag named `v1.0.0` pointing directly at the commit currently referenced by `HEAD`. A lightweight tag is simply a static pointer file containing a raw commit hash.

```bash
git tag -a v1.1.0 -m "Production release with payment gateway fix"
```

> This creates an annotated tag. Unlike lightweight tags, annotated tags store their own distinct object in the Git database containing the tagger's name, email, timestamp, and message, making them ideal for official releases.

```bash
git tag -l "v1.2.*"
```

> This lists all local tags matching the glob pattern `v1.2.*`, allowing developers to rapidly filter through dozens of release iterations to find specific patch versions.

```bash
git tag -d v0.5.0
```

> This deletes the local tag named `v0.5.0`. Note that deleting a tag locally does not remove it from remote servers like GitHub if it was previously pushed; that requires a separate push deletion command.

```bash
git tag -s v2.0.0 -m "Cryptographically signed enterprise release"
```

> This creates a GPG-signed tag. It uses your private GPG key to sign the tag object, providing cryptographic proof to consumers that the release genuinely originated from your verified identity.

## Real-World Scenarios

**Tagging Production Releases for CI/CD Pipelines**

```bash
git tag -a v1.4.2 -m "Hotfix for authentication timeout" && git push origin v1.4.2
```

> When deploying code to production, release managers create an annotated tag and push it explicitly to the remote server. CI/CD systems like GitHub Actions or GitLab CI are configured to trigger automated deployment workflows the exact moment a new tag matching `v*` is detected on the repository.

**Auditing Code History via Cryptographic Verification**

```bash
git tag -v v1.0.0
```

> Security teams and open-source maintainers run this command before consuming third-party code or dependencies packaged via Git tags. It evaluates the GPG signature against trusted local keyrings, confirming the tag has not been tampered with or forged.

**Locating the Tag Associated with a Bug Fix**

```bash
git tag --contains a1b2c3d
```

> When investigating regression bugs in production, an engineer takes the commit hash of a problematic patch and queries `git tag --contains` to see which subsequent release versions officially include that fix.

## When should it NOT be used?

- **Tracking fluid, ongoing feature development:** Using tags to mark work-in-progress code. **Reason:** Tags are designed to be immutable, permanent markers; constantly creating, deleting, and moving tags creates immense confusion across a team. **Use instead:** `git branch` or `git commit`.
- **Moving an existing official release tag:** Running `git tag -f v1.0.0` to reassign a public release tag to a new commit. **Reason:** Changing a published tag breaks downstream builds, checksums, and dependency managers for everyone who has already cloned it. **Use instead:** Create a new patch tag (e.g., `v1.0.1`).
- **Storing massive binary assets:** Attaching large release binaries directly to tag objects. **Reason:** Git tags are small metadata pointers; bloating them with binary data degrades repository performance. **Use instead:** GitHub/GitLab Release Attachments or Git LFS.

## Alternatives

- **`git branch`:** The movable reference pointer. **Tradeoff:** Branches are explicitly designed to move forward as new commits arrive, whereas tags are built to remain frozen. Use branches for development lines and tags for static milestones.

## How it works internally

A Git tag falls into one of two internal categories: **lightweight** or **annotated**.

A **lightweight tag** is the simplest object in Git. It is literally just a 41-byte text file stored inside the `.git/refs/tags/` directory, containing the 40-character SHA-1 hash of the commit it points to, followed by a newline. It requires zero database overhead beyond creating that file.

An **annotated tag**, by contrast, creates a distinct **tag object** within the `.git/objects` database. This tag object contains the target commit's hash, the tag name, the author's name, email, timestamp, and the user message. The file inside `.git/refs/tags/` then points to this new tag object rather than directly to the commit.

If the tag is **signed** (`-s`), Git invokes GPG (GNU Privacy Guard) to generate a cryptographic signature block, appending it to the tag object before writing it to the database. When deleting a tag (`git tag -d`), Git simply unlinks (deletes) the reference file from `.git/refs/tags/` (though annotated tag objects in the database become dangling objects until garbage collection runs). The command returns an exit code of `0` on success, or `1` if a tag already exists or is malformed.

## Performance Notes

- Listing or creating tags is an instantaneous, lightweight file operation because lightweight tags are just small text files and annotated tags require writing a single database object.
- Traversing large tag lists using complex filters like `--contains` across repositories with tens of thousands of commits requires Git to run graph reachability analysis, which can introduce minor execution latency.

## Security Notes

- **Tag Spoofing via Unsigned Tags:** Anyone with write access to a repository can push an unsigned lightweight or annotated tag with a duplicate name to override or mimic official releases. Production systems should be configured to accept only GPG-signed tags.
- **GPG Key Compromise:** If an administrator's private GPG key used for signing release tags is compromised, attackers can forge cryptographically valid signed tags for malicious payloads, requiring immediate key revocation.

## Common Mistakes

- **Assuming `git push` automatically pushes tags:** Running `git push origin main` and assuming `v1.0.0` went to the server. **Why it's wrong:** By design, standard `git push` commands do not transfer tags to remote servers automatically to prevent accidental leakage of local experimental tags. You must explicitly run `git push origin --tags`.
- **Modifying a pushed tag:** Deleting a tag locally, moving it to a new commit, and pushing again. **Why it's wrong:** If teammates have already fetched the original tag, their local history will conflict with the server's new tag hash, causing errors. Always issue a new tag version instead.
- **Creating annotated tags without a message:** Running `git tag -a v1.0.0` without `-m`. **Why it's wrong:** Git will forcefully interrupt your terminal, opening a text editor (like Vim) to demand a release message before completing the tag creation.

## Best Practices

- Always prefer annotated tags (`-a`) over lightweight tags for software releases, as they capture vital metadata (who tagged it and when) and support cryptographic signing.
- Adopt Semantic Versioning (`MAJOR.MINOR.PATCH`, e.g., `v2.1.4`) for your tag naming conventions to maintain clear, predictable API compatibility signals for your users and automated tools.
- Configure your global Git settings or CI pipelines to enforce GPG signing for all release tags to ensure supply chain integrity.

## Interview Questions

**Q:** What is the fundamental structural difference between a lightweight tag and an annotated tag in Git?
**A:** A lightweight tag is merely a static file in `.git/refs/tags/` containing a raw 40-character commit hash, functioning like a disposable branch pointer. An annotated tag creates a separate, permanent tag object in the `.git/objects` database that records its own metadata—including the tagger's name, email, date, and message—pointing ultimately to the target commit.

**Q:** Why doesn't a standard `git push origin main` upload your local tags to the remote repository?
**A:** Git deliberately separates branch pushing from tag pushing to prevent developers from accidentally polluting shared remote repositories with local, experimental, or incomplete tags. You must explicitly push tags using either `git push origin <tagname>` or `git push origin --tags`.

**Q:** If a developer force-pushes a modified tag to a shared remote repository, what kind of problems does it cause for other contributors?
**A:** It causes "tag divergence." When other contributors pull, their local Git client detects that the remote tag points to a different commit hash than their local copy, resulting in rejection errors and broken downstream dependency resolutions or build verification checks.

## Practice Problems

**Problem:** Create an annotated release tag named `v1.2.0` with the message "Initial public beta release", pointing explicitly to the commit hash `9f8e7d6`.
**Hint:** Use the annotation flag combined with the message flag and provide the target commit hash at the end of the command.
**Solution:** `git tag -a v1.2.0 -m "Initial public beta release" 9f8e7d6` (This constructs a full annotated tag object referencing the specified historical commit).

**Problem:** You have pushed several commits and tags to your local repository, but you realize you need to push _only_ the new tags to the remote server `origin` without pushing any branch changes.
**Hint:** Look for the specific push modifier designed exclusively for tag transfer.
**Solution:** `git push origin --tags` (This command scans all local refs in `.git/refs/tags/` and pushes them to the remote server).

## References

- [Git - git-tag Documentation](https://git-scm.com/docs/git-tag)
- [Pro Git Book: Git Basics - Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
  === END FILE ===
