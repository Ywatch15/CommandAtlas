---
slug: git-archive
name: git archive
aliases: []
category: git
tags:
  - version-control
  - export
  - packaging
  - deployment
  - distribution
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
  - export git repository without .git folder
  - create zip file from git branch
  - download tarball of git commit
  - package git source code for release
  - extract specific folder from git history
relatedCommands:
  - git-checkout
  - git-clone
alternatives: []
status: draft
---

## What is it?

`git archive` is a version control utility that extracts a specific snapshot of a Git repository (a commit, branch, or tag) and compiles it into a standard archive file format, such as tar or zip. It explicitly omits the `.git` directory, untracked files, and ignored files, providing a pristine copy of the project's source code exactly as it exists in the Git object database at that specific revision. Developers use it to package clean deployment artifacts, distribute source code to clients, or generate downloadable release tarballs without exposing internal version control metadata.

## Why does it exist?

Before `git archive`, developers attempting to share or deploy a Git project's source code had to manually copy the working directory and painstakingly scrub the `.git` folder and `.gitignore`d artifacts (like local `.env` files or compiled binaries) using complex `rsync` or `tar --exclude` commands. Failing to remove the `.git` directory before deploying to a web server could lead to severe security breaches, as attackers could download the entire repository history. `git archive` was built to solve this by generating archives natively from Git's internal tree objects, completely bypassing the physical working directory and guaranteeing a mathematically perfect, secure snapshot of the tracked code.

## Syntax

```bash
git archive [options] <tree-ish> [<path>...]
```

## Flags

| Flag                           | Description                                                                                                                                         | Example                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `--format=<fmt>`               | Specifies the output format of the archive. Supported formats typically include `tar`, `zip`, `tar.gz`, and `tgz`.                                  | `git archive --format=zip HEAD`                                       |
| `-o <file>`, `--output=<file>` | Writes the generated archive directly to the specified file path instead of streaming it to standard output (stdout).                               | `git archive -o release.tar.gz HEAD`                                  |
| `--prefix=<prefix>/`           | Prepends a specified directory path to every file inside the archive, preventing "tarbombs" that extract files directly into the current directory. | `git archive --prefix=project-v1/ HEAD`                               |
| `--remote=<repo>`              | Instructs Git to connect to a remote repository and generate the archive from the server's history, rather than the local database.                 | `git archive --remote=git@github.com:org/repo.git main`               |
| `--exec=<cmd>`                 | Specifies the path to the `git-upload-archive` program on the remote server when using the `--remote` flag over SSH.                                | `git archive --remote=server --exec=/opt/git/git-upload-archive main` |
| `--add-file=<file>`            | Injects an untracked local file into the generated archive (e.g., adding a dynamic build metadata file that isn't in version control).              | `git archive --add-file=build-info.txt HEAD`                          |
| `--worktree-attributes`        | Forces `git archive` to read `.gitattributes` rules from the working directory rather than exclusively from the specified commit's tree.            | `git archive --worktree-attributes HEAD`                              |
| `-v`, `--verbose`              | Outputs the path of every file and directory to standard error (stderr) as they are processed and added to the archive.                             | `git archive -v -o out.zip HEAD`                                      |
| `-l`, `--list`                 | Displays a list of all archive formats supported by your specific Git installation and immediately exits.                                           | `git archive --list`                                                  |
| `-0` to `-9`                   | Specifies the compression level when generating a `zip` archive (where `-0` stores uncompressed and `-9` provides maximum compression).             | `git archive -9 -o source.zip HEAD`                                   |

## Examples

```bash
git archive --format=tar HEAD > project.tar
```

> Extracts the current `HEAD` commit, formats the files into an uncompressed tar stream, and redirects the standard output into a local file named `project.tar`.

```bash
git archive -o latest.zip --prefix=myapp-1.0/ main
```

> Generates a zip archive of the `main` branch. The `--prefix` flag ensures that when a user unzips the file, all contents are neatly contained within a root folder named `myapp-1.0/`, rather than scattering files across their current directory.

```bash
git archive -o docs.tar.gz HEAD:src/ docs/
```

> Archives only a specific subset of the repository. By appending paths (`docs/`) and utilizing the tree-ish colon syntax (`HEAD:src/`), this command creates a targeted archive containing only the documentation and source directory from the latest commit, ignoring the rest of the repository.

```bash
git archive --remote=ssh://[server.com/repo.git](https://server.com/repo.git) -o backup.tar HEAD
```

> Connects to a remote repository via SSH and instructs the remote Git server to generate the archive on the fly. The server streams the resulting tarball back to the client, where it is saved as `backup.tar`, completely bypassing the need to perform a `git clone`.

```bash
git archive --format=tar.gz -o release.tar.gz v2.1.4
```

> Packages the exact state of the repository corresponding to the annotated tag `v2.1.4`. This is the standard mechanism build systems use to generate the "Source code (tar.gz)" artifacts attached to GitHub/GitLab releases.

## Real-World Scenarios

**Packaging Clean Deployment Artifacts**

```bash
git archive -o deploy.zip HEAD
scp deploy.zip user@production-server:/var/www/html/
```

> When deploying PHP, Python, or Node.js applications to a production server over SSH, copying the `.git` folder is a massive security vulnerability. Engineers use `git archive` to generate a sterile zip file of the application, transfer it via SCP, and extract it on the server, guaranteeing no local `.env` files or Git history are exposed to the public internet.

**Omitting Development Tooling from Releases**

```bash
# In .gitattributes: tests/ export-ignore
# In .gitattributes: .eslintrc export-ignore
git archive -o library-v1.tar.gz main
```

> Open-source library maintainers use the `export-ignore` attribute in `.gitattributes` to define internal testing harnesses, linting configurations, and CI pipelines that are irrelevant to end-users. When `git archive` runs, it dynamically respects these attributes, stripping the internal files out and producing a lightweight, consumer-ready release tarball.

**Embedding Commit Metadata into Source Code**

```bash
# In .gitattributes: version.txt export-subst
# In version.txt: Commit: $Format:%H$
git archive -o release.zip HEAD
```

> To ensure traceablity of deployed artifacts, developers use the `export-subst` attribute. When `git archive` processes `version.txt`, it intercepts the `$Format:\%H$` placeholder and physically injects the full SHA-1 hash of the commit directly into the text file within the resulting zip, creating an immutable record of the deployment's origin.

## When should it NOT be used?

- **Backing up a Git Repository:** **Do not use `git archive` for Git backups.** `git archive` destroys version control history, branches, and commit authorship. If you need to backup or transfer a repository while maintaining Git functionality, use `git clone --mirror` or `git bundle`.
- **Including untracked working files:** **Do not use `git archive` to zip up your current uncommitted work.** Because `git archive` reads directly from the internal object database (the tree-ish), it is completely blind to any modifications sitting unstaged in your working directory. Use standard OS `tar` or `zip` for this.
- **Packaging Submodules:** **Do not rely on `git archive` to package complex projects with submodules.** By default, `git archive` does not recursively process Git submodules; it will merely output an empty directory where the submodule should be. You must use external bash scripts or CI pipeline steps to independently archive and merge submodules.

## Alternatives

- **`tar --exclude='.git'`:** **Best for archiving uncommitted changes.** If you absolutely need to include uncommitted modifications and untracked files in your artifact, standard `tar` is required, though it forces you to manually manage exclusion lists.
- **`git bundle`:** **Best for offline history transfer.** Unlike `git archive` which exports raw files, `git bundle` exports the actual Git database objects (commits, trees, blobs) into a single binary file, allowing a complete repository to be restored on an air-gapped machine.
- **`rsync -a --exclude=.git`:** **Best for continuous deployment.** If you are repeatedly deploying code to a server, `git archive` is inefficient because it transfers the entire project every time. `rsync` calculates diffs and only transfers files that have changed since the last deployment.

## How it works internally

When `git archive` is executed, it completely bypasses the physical working directory and the staging area (index). Instead, Git looks up the specified `<tree-ish>` (e.g., resolving the `main` branch pointer to a commit hash, and then to that commit's root tree object).

Git initiates a recursive tree walk through the internal object database (`.git/objects/`). For every tree (directory) and blob (file) it encounters, it consults the rules defined in `.gitattributes`. If a path matches an `export-ignore` rule, the walker prunes that branch and skips adding it to the archive stream. If a blob matches `export-subst`, Git streams the blob into memory, parses it for `$Format:...$` placeholders, expands them using the target commit's metadata (using the same interpolation logic as `git log --format`), and writes the substituted byte stream to the archive.

Because Git stores blobs internally in a zlib-compressed format, creating a `tar` archive requires Git to inflate every blob to raw text/binary, construct the POSIX tar header blocks, and stream them to stdout. If a compressed format like `zip` or `tar.gz` is requested, Git pipes the uncompressed stream directly into the respective compression library (like `zlib` or the system's `gzip` executable) before writing to the output file.

For the `--remote` flag, the local Git client establishes an SSH or TCP connection and triggers the `git-upload-archive` daemon on the server. The server performs the tree walk and archiving process entirely in memory, streaming the finalized binary archive file back over the network to the local client, meaning the client needs zero local storage of the repository objects.

## Performance Notes

- **CPU vs. I/O Bounding:** Generating an uncompressed `tar` archive is extremely fast and heavily I/O bound, as Git simply streams deflated objects. Generating a `zip` or `tar.gz` archive shifts the bottleneck to the CPU, as the entire repository must be re-compressed on the fly.
- **Memory Efficiency:** `git archive` streams objects one by one. It does not require loading the entire repository into RAM, making it perfectly capable of generating 50GB tarballs on machines with less than 1GB of memory.

## Security Notes

- **Denial of Service via `git-upload-archive`:** Exposing the `git-upload-archive` daemon to anonymous users over the git protocol (`git://`) allows attackers to repeatedly request heavily compressed zip archives of massive commits. This forces the server's CPU to peg at 100% performing infinite compression cycles. Server administrators must explicitly enable or disable this daemon based on trust boundaries.
- **Malicious `export-subst` Payloads:** In multi-tenant CI/CD systems, if a malicious developer commits a gigabyte-sized file consisting entirely of `$Format:\%H$` placeholders and marks it with `export-subst`, `git archive` will attempt to parse and expand every token. This can exhaust CI runner memory or severely delay artifact generation.

## Common Mistakes

- **Forgetting the `--prefix` trailing slash**
  - _Mistake:_ Running `git archive -o out.zip --prefix=my-project HEAD`.
  - _Why:_ Without the trailing slash, Git treats `my-project` as a string prefix attached to the filename itself. A file named `readme.md` becomes `my-projectreadme.md`. You must use `--prefix=my-project/` to force the files into a subdirectory.
- **Expecting unstaged files to be included**
  - _Mistake:_ Editing `config.json`, forgetting to commit it, running `git archive -o update.zip HEAD`, and deploying broken code.
  - _Why:_ `git archive HEAD` explicitly targets the exact state of the `HEAD` commit. It is entirely blind to the active working directory. To archive uncommitted work, you must commit it, or use `git stash create` to generate a dangling commit to archive.
- **Assuming `.gitignore` rules apply to `--add-file`**
  - _Mistake:_ Using `--add-file=secrets.json` assuming Git will block it because `*.json` is in `.gitignore`.
  - _Why:_ The `--add-file` flag is an explicit override that bypasses version control checks. Git will blindly inject whatever local file you specify into the archive, potentially leaking secrets if used in automated scripts.

## Best Practices

- **Enforce `export-ignore` for Clean Releases:** Maintain a rigorous `.gitattributes` file at the root of your project. Explicitly mark `.github/`, `tests/`, `docker-compose.yml`, and `CONTRIBUTING.md` with `export-ignore`. This ensures your published distribution artifacts are as lightweight as possible and don't expose internal infrastructure code.
- **Embed Versions with `export-subst`:** Create a `version.php` or `build.json` file in your repository marked with `export-subst`. Inside, write `{"commit": "$Format:\%H$", "date": "$Format:\%cI$"}`. When `git archive` runs, it perfectly bakes the deployment metadata into the artifact, making production debugging exponentially easier.
- **Use `git archive` for CI/CD Artifacts:** Instead of running `git clone` inside your Dockerfile or CI build step (which downloads megabytes of `.git` history you don't need), use `git archive --format=tar HEAD | docker build -` to pipe exactly the files needed for compilation directly into the container context.

## Interview Questions

**Q: How do you prevent a file that is tracked in Git (like a unit test script) from being included when someone runs `git archive` to generate a release?**
**A:** You use the `.gitattributes` file. By adding the line `tests/ export-ignore` to `.gitattributes` and committing it, `git archive` will dynamically read that rule and exclude the entire `tests` directory from the generated tarball or zip file, even though it remains fully tracked in the repository.

**Q: You need to download the source code of a specific branch from a remote Git server, but you do not want to download the massive `.git` history directory. How can `git archive` solve this?**
**A:** You can use the `--remote` flag. By executing `git archive --remote=ssh://server/repo.git --format=tar branch_name > source.tar`, you instruct the remote server to construct the archive in memory and stream only the raw files back to you, completely bypassing a `git clone`.

**Q: Can `git archive` generate an artifact that includes your current, uncommitted working directory changes?**
**A:** By default, no. `git archive` operates on tree-ish objects (commits, branches, tags) stored in the Git database. However, as an advanced workaround, you can use `git stash create` to generate a dangling commit object from your current working directory, and then pass that resulting hash directly to `git archive`.

## Practice Problems

**Problem:** You need to generate a zip file of the repository at the tag `v3.0`. The zip file must be named `release-v3.zip`, and when extracted, all files must be contained inside a folder named `source-code/`.
**Hint:** Use the flags for output, prefix formatting (remember the trailing slash), and specify the exact tag as the tree-ish.
**Solution:**

```bash
git archive --format=zip -o release-v3.zip --prefix=source-code/ v3.0
```

**Problem:** You want to generate a tarball of the current `main` branch, but you _only_ want to include files located within the `src/` and `public/` directories.
**Hint:** `git archive` accepts a sequence of file paths at the end of the command to restrict the scope of the tree walk.
**Solution:**

```bash
git archive --format=tar -o frontend.tar main src/ public/
```

## References

- [git-archive(1) Manual Page](https://git-scm.com/docs/git-archive)
- [Pro Git Book: Exporting Your Repository](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_exporting_your_repository)
- [GitAttributes Documentation (export-ignore & export-subst)](https://git-scm.com/docs/gitattributes#_creating_an_archive)
