---
slug: make
name: make
aliases: [gnu make, makefile build]
category: unix
tags: [linux, build, compilation, automation, developer]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'build project with makefile'
  - 'compile C code using make'
  - 'run specific target in makefile'
  - 'clean build artifacts make clean'
  - 'parallel build make'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`make` is a build automation tool that automatically orchestrates the execution of terminal commands based on complex dependency graphs defined in a `Makefile`. By tracking the file modification timestamps (`mtime`) of source files against their compiled output targets, it mathematically determines exactly which artifacts are out of date, ensuring that only the strictly necessary files are recompiled, saving massive amounts of time on large software projects.

## Why does it exist?

Compiling a C/C++ program with 500 source files (`.c`) using raw shell scripts requires recompiling all 500 files every time a single line of code changes, which can take hours. `make`, authored by Stuart Feldman in 1976 at Bell Labs, exists to introduce intelligent state-tracking. By declaring that `app.o` _depends_ on `app.c`, `make` checks if `app.c` has a newer timestamp than `app.o`. If it doesn't, it safely skips the compilation entirely. While originally designed for C compilation, this generalized Directed Acyclic Graph (DAG) logic transformed `make` into the universal task runner for orchestrating Docker builds, CI/CD pipelines, and infrastructure-as-code deployments.

## Syntax

```bash
make [options] [target] ...
```

## Flags

| Flag                            | Description                                                                                                                                                 | Example                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `-j <N>`, `--jobs=N`            | Executes `N` targets (recipes) concurrently. Drastically accelerates builds on multi-core CPUs. If `N` is omitted, spawns infinite jobs (highly dangerous). | `make -j 8`               |
| `-B`, `--always-make`           | Bypasses all timestamp checks and unconditionally executes the targets, forcing a complete rebuild from scratch.                                            | `make -B all`             |
| `-n`, `--dry-run`               | Evaluates the dependency graph and prints the exact shell commands it _would_ execute, without actually running them. Crucial for debugging.                | `make -n install`         |
| `-C <DIR>`, `--directory`       | Changes the working directory to `DIR` before reading the Makefile or doing anything else.                                                                  | `make -C /opt/src/ build` |
| `-f <FILE>`, `--file`           | Reads a specific file as a Makefile, overriding the default behavior of searching for `Makefile` or `makefile`.                                             | `make -f Makefile.prod`   |
| `-k`, `--keep-going`            | Continues executing unrelated targets even if one target fails with a non-zero exit code. Essential for CI test suites.                                     | `make -k test`            |
| `-s`, `--silent`                | Suppresses the default behavior of echoing the raw shell commands to standard output before executing them.                                                 | `make -s clean`           |
| `-e`, `--environment-overrides` | Gives variables inherited from the shell environment precedence over variables explicitly defined inside the Makefile.                                      | `make -e CC=clang`        |
| `-d`                            | Prints highly verbose debugging information, tracing exactly how `make` evaluates the timestamps and dependency graph logic.                                | `make -d`                 |
| `-i`, `--ignore-errors`         | Ignores all errors in commands executed to remake files. It will not halt the build if a bash command throws an exit code of `1`.                           | `make -i`                 |

## Examples

```bash
make
```

> The universal developer invocation. `make` searches the current directory for a file named `Makefile`. It parses the file and executes the absolute _first_ target defined in the file (often conventionally named `all`), calculating dependencies and spawning subshells to run the required bash commands.

```bash
make -j $(nproc)
```

> The heavily optimized compilation pattern. The `$(nproc)` command substitution dynamically returns the number of physical CPU cores on the host machine (e.g., `16`). `make` then spawns exactly 16 parallel worker threads to compile independent source files simultaneously, saturating the CPU and minimizing build times.

```bash
make clean build test
```

> Sequential target execution. The user explicitly requests three distinct targets defined in the Makefile. `make` evaluates and executes `clean` (usually running `rm -rf`), then `build`, and finally `test`, acting as a streamlined task runner.

```bash
make -n deploy
```

> Auditing a dangerous operation. Before running a target that potentially alters production cloud state or copies system files, the developer uses `-n` (dry-run). `make` outputs the exact `kubectl` or `rsync` commands it intends to run to the terminal without executing them, providing a safe visual audit.

```bash
make -C /var/www/project/ update
```

> Cross-directory execution. Without needing to use `cd`, the script instructs `make` to instantly jump into the `/var/www/project/` directory, locate the Makefile there, and execute the `update` target, heavily simplifying automated deployment bash scripts.

## Real-World Scenarios

**Orchestrating Docker and CI Pipelines**

```makefile
# Makefile
.PHONY: build push deploy

build:
	docker build -t myapp:$(COMMIT) .

push: build
	docker push myapp:$(COMMIT)

deploy: push
	kubectl set image deployment/api api=myapp:$(COMMIT)
```

> Modern DevOps engineers rarely write bash scripts for pipelines. They write Makefiles. By executing `make deploy`, `make` reads the dependencies and knows it must run `push` first. But `push` depends on `build`. It securely orchestrates the exact required sequence: building the Docker image, pushing to the registry, and updating Kubernetes, providing a unified `make` interface regardless of the underlying CI provider (Jenkins, GitHub Actions, GitLab).

**Idempotent Infrastructure Generation**

```makefile
certs/tls.key:
	mkdir -p certs
	openssl req -x509 -newkey rsa:4096 -keyout certs/tls.key -out certs/tls.crt -days 365 -nodes
```

> If a developer runs `make certs/tls.key`, `make` checks the physical filesystem. If `certs/tls.key` does not exist, it executes the `openssl` command to generate it. If the developer runs it again 5 minutes later, `make` sees the file physically exists on the hard drive, prints `make: 'certs/tls.key' is up to date`, and completely skips the heavy cryptographic generation.

## When should it NOT be used?

- **Complex Cross-Platform C++ Builds:** **Do not write massive Makefiles for modern C++ projects.** Managing compiler flags across Windows (MSVC), macOS (Clang), and Linux (GCC), and tracking complex header file (`.h`) dependencies manually in a Makefile is excruciating. You must use a meta-build system like `CMake`, which dynamically generates the `Makefile` specifically tailored to the host OS.
- **Strict State Enforcement:** `make` relies exclusively on simple filesystem timestamps (`mtime`). If a clock sync issue causes a file's timestamp to be older than it should be, `make` will silently fail to rebuild a critical application. For absolute cryptographic determinism, systems like Bazel or Nix (which hash the actual file contents instead of trusting timestamps) are superior.

## Alternatives

- **`ninja`:** **Best for pure speed.** A highly specialized, blazingly fast build system. Unlike `make`, it doesn't parse complex logic; it is designed to have its configuration files generated entirely by `CMake`, executing the DAG significantly faster than GNU Make.
- **`just`:** **Best for modern task running.** A modern command runner written in Rust. It utilizes a `justfile` that looks exactly like a Makefile but completely rips out the complex file-timestamp dependency logic, acting purely as a beautiful, modern shell script organizer.
- **`bazel`:** **Best for enterprise monorepos.** Google's build system. Heavyweight, mathematically hermetic, relies on content hashing rather than timestamps, and caches build artifacts globally across networks.

## How it works internally

When you execute `make`, it searches for a file (usually `Makefile`) and parses its syntax, which is rigidly structured into "Rules":

```text
target: prerequisites ...
<TAB>recipe
```

`make` constructs a mathematical **Directed Acyclic Graph (DAG)** in memory.
If you ask it to build `app`, it checks the graph. If `app` depends on `main.o` and `utils.o`, it analyzes those nodes.
For every node, `make` executes the `stat()` system call to extract the Last Modification Time (`st_mtime`) of the physical files on the hard drive.

It performs simple boolean logic: _Is the timestamp of `main.c` strictly newer than the timestamp of `main.o`?_
If true, the source code was edited since the last compile. `make` forks a new child process (specifically invoking `/bin/sh -c`) and passes the `<TAB>recipe` string (e.g., `gcc -c main.c`) to the shell. The shell executes the command.

Crucially, **every single line of a recipe is executed in a completely new, isolated subshell.** If line 1 is `cd /tmp` and line 2 is `rm -rf *`, line 2 executes in the original directory, not `/tmp`, causing catastrophic data loss. To execute commands sequentially in the same shell state, they must be chained with `&&` or `\` on a single logical line.

## Performance Notes

- **The `-j` Speedup:** Building the Linux kernel sequentially (`make`) takes hours. Running `make -j 32` allows `make` to traverse independent, parallel branches of the DAG simultaneously, distributing the compiler load across 32 CPU cores and reducing compilation time to minutes.

## Security Notes

- **Arbitrary Code Execution:** A `Makefile` is just a list of shell scripts wrapper in dependency logic. Downloading a tarball from the internet and blindly running `make install` as root executes arbitrary, un-audited bash code with full system privileges. Always review the `Makefile` before execution.

## Common Mistakes

- **Spaces instead of Tabs**
  - _Mistake:_ Indenting a recipe command using 4 spaces.
  - _Why:_ The `make` parser is infamous for its rigid 1970s syntax. It mathematically requires a literal hard tab (`\t`) character to begin a recipe line. If you use spaces, `make` instantly crashes with the cryptic error: `Makefile:2: *** missing separator.  Stop.`
- **Forgetting `.PHONY`**
  - _Mistake:_ Creating a target named `test:` that runs `pytest`. A developer accidentally creates a physical folder named `test` in the repository. Running `make test` outputs `make: 'test' is up to date`.
  - _Why:_ `make` tracks files. Because a file/folder physically named `test` exists on the disk, and it has no prerequisites, `make` assumes the artifact is perfectly built and skips the command. You must explicitly declare `.PHONY: test` at the top of the Makefile to instruct the engine that `test` is an abstract command, not a physical file.
- **Assuming variables pass down**
  - _Mistake:_ Writing `export VAR=1` on line 1 of a recipe, and `echo $VAR` on line 2.
  - _Why:_ Because every line runs in a brand new subshell, the export on line 1 is instantly destroyed when the subshell dies. Line 2 runs in a new shell where `$VAR` is completely empty.

## Best Practices

- **Silence directories with `-s` in CI:** In automated pipelines, `make` constantly echoes `make[1]: Entering directory '/app'`. This clutters the logs massively. Using the `-s` (silent) flag cleans the output, presenting only the actual application logs and compilation errors.
- **Use the `?=` assignment:** When defining variables in a Makefile (like `CC = gcc`), use `CC ?= gcc`. The `?=` operator only sets the variable if it isn't already set in the environment. This allows users to easily override compilers via the CLI (`make CC=clang`) without editing the Makefile.

## Interview Questions

**Q: You write a Makefile with a target `clean:` that runs `rm -rf *.o`. It works perfectly for months. One day, you run `make clean`, but it just prints `make: 'clean' is up to date.` and does nothing. Explain exactly why this occurred and how to fix the Makefile so it never happens again.**
**A:** This occurred because someone accidentally created a physical file or directory named `clean` in the same directory as the Makefile. `make` evaluates targets as physical files. Since the file `clean` exists and has no prerequisites, `make` believes the target has already been successfully built. To fix this, you must add the line `.PHONY: clean` to the Makefile. This instructs the `make` parser that `clean` is a "phony" target (an action, not a file), forcing it to bypass timestamp checks and execute the recipe unconditionally.

**Q: Explain the critical difference in execution environment between writing two commands on separate lines in a Makefile recipe, versus chaining them with `&&` on a single line.**
**A:** In a Makefile recipe, `make` forks a completely brand new `/bin/sh` subshell for every single line of the recipe. If line 1 is `cd /opt` and line 2 is `pwd`, line 2 executes in a totally new shell that defaults back to the original working directory. The state from line 1 is destroyed. Chaining them with `&&` (e.g., `cd /opt && pwd`) passes the entire string to a single `/bin/sh` invocation, ensuring the `pwd` command successfully executes within the `/opt` directory context.

## Practice Problems

**Problem:** You are compiling a massive C project. You want to instruct `make` to compile the default target utilizing parallel processing to speed up the build. You want it to aggressively spawn 8 concurrent jobs.
**Hint:** Use the flag specifically designed to control parallel job execution.
**Solution:**

```bash
make -j 8
```

**Problem:** You have a heavily customized Makefile named `Makefile.testing`. You want to execute the target `deploy`, but before you actually run it, you want to perform a dry-run to print exactly which bash commands `make` _would_ execute, ensuring it won't accidentally delete production data.
**Hint:** Combine the flag to specify a custom file with the flag for dry-run/no-execution.
**Solution:**

```bash
make -f Makefile.testing -n deploy
```

## References

- [make(1) - Linux man page (GNU Make)](https://linux.die.net/man/1/make)
- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html)
