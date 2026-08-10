---
slug: yq
name: yq
aliases: []
category: devops-utilities
tags: [yaml, parsing, kubernetes, text-processing, json, devops]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'parse yaml in bash'
  - 'extract value from yaml file'
  - 'update kubernetes manifest'
  - 'convert yaml to json'
  - 'modify yaml inline'
relatedCommands: [jq, sed]
alternatives: [jq, sed]
status: published
---

## What is it?

`yq` is a portable, command-line YAML, JSON, XML, and CSV processor. Often described as "`jq` for YAML," it provides a robust syntax to query, extract, modify, and merge structured data documents. Unlike standard text manipulation tools, `yq` deeply understands YAML's complex hierarchical structures, document boundaries, and formatting idiosyncrasies. _(Note: This documentation covers the `mikefarah/yq` Go implementation, which is the industry standard for cloud-native workflows)._

## Why does it exist?

With the explosion of cloud-native computing, Kubernetes, Ansible, and modern CI/CD pipelines, YAML became the defacto standard for infrastructure configuration. However, `jq` does not natively parse YAML. Engineers resorted to writing brittle `sed` and `awk` scripts that instantly broke if YAML indentation changed or comments were added. `yq` exists to provide a deterministic, syntax-aware engine capable of mutating YAML configurations programmatically without destroying critical formatting, multi-document structures, or inline comments.

## Syntax

```bash
yq [options] <expression> [file...]
```

## Flags

| Flag                    | Description                                                                                                           | Example                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `-i`, `--inplace`       | Modifies the target file directly in place, rather than outputting the result to standard out.                        | `yq -i '.app.version = "v2"' config.yaml` |
| `-o`, `--output-format` | Explicitly forces the output format. Accepts `yaml`, `json`, `props`, `csv`, or `xml`.                                | `yq -o=json . deployment.yaml`            |
| `-p`, `--input-format`  | Explicitly dictates the input format. Useful when parsing files lacking standard extensions.                          | `yq -p=json -o=yaml . data.json`          |
| `-P`, `--prettyPrint`   | Automatically formats and visually aligns the output, expanding minified documents into readable structures.          | `yq -P . data.json`                       |
| `-e`, `--exit-status`   | Sets the exit code to `1` if the evaluation result is empty, null, or false, aiding in CI/CD pipeline validation.     | `yq -e '.metadata.name' pod.yaml`         |
| `-n`, `--null-input`    | Evaluates the expression with a null input. Used for generating brand new YAML files entirely from an expression.     | `yq -n '.a.b.c = "cat"' > new.yml`        |
| `-s`, `--split-exp`     | Splits a multi-document YAML stream (files separated by `---`) into multiple independent output files.                | `yq -s '.metadata.name' all.yaml`         |
| `-I`, `--indent`        | Overrides the default indentation level (usually 2 spaces) to match specific organizational formatting requirements.  | `yq -I 4 . config.yaml`                   |
| `-M`, `--no-colors`     | Disables colorized output. Crucial when assigning outputs to bash variables to avoid ANSI escape code corruption.     | `yq -M '.env' config.yaml`                |
| `-r`, `--unwrapScalar`  | Unwraps scalar values (like strings) by removing surrounding quotes. Typically enabled by default in recent versions. | `yq -r '.image.tag' values.yaml`          |

## Examples

```bash
yq '.metadata.name' deployment.yaml
```

> Extracts the specific scalar value nested under the `metadata` key. By default, it will print the raw text value of the `name` field without quotes.

```bash
yq -i '.spec.replicas = 3' deployment.yaml
```

> The most critical infrastructure-as-code workflow. The `-i` flag updates the file on the disk, mutating the `replicas` integer to `3`. Critically, `yq` preserves all surrounding YAML comments and existing indentation exactly as they were.

```bash
yq -o=json . values.yaml > values.json
```

> Acts as an instant schema translator. It parses the entire `values.yaml` file and explicitly outputs standard, compliant JSON, effectively replacing complex Python script converters.

```bash
yq eval-all '. as $item ireduce ({}; . * $item )' base.yml override.yml
```

> Merges two YAML files together. The `eval-all` operation evaluates all provided files simultaneously, using the `ireduce` operator to deeply merge `override.yml` onto `base.yml`, with the latter file taking precedence on conflicting keys.

```bash
yq '.env[] | select(.name == "PORT") | .value' config.yaml
```

> Executes a complex array filter. It iterates through an array of objects located at `.env`, finds the exact object where the key `name` equals "PORT", and returns the corresponding `value` for that object.

## Real-World Scenarios

**Dynamic CI/CD Kubernetes Updates**

```bash
NEW_TAG=${GITHUB_SHA::7}
yq -i ".spec.template.spec.containers[0].image = \"[myregistry.com/app:$](https://myregistry.com/app:$){NEW_TAG}\"" deployment.yaml
kubectl apply -f deployment.yaml
```

> In a GitHub Actions pipeline, the image tag must be updated to match the latest Git commit hash before deploying to Kubernetes. The pipeline extracts the hash, securely updates the deployment manifest in place using `yq`, and applies the result, entirely bypassing the need for complex templating engines like Helm for simple workflows.

**Validating Helm Charts**

```bash
helm template my-chart ./chart | yq -e '. | select(.kind == "Deployment" and .metadata.name == "my-app") | .spec.replicas'
```

> DevOps engineers need to verify that a complex Helm chart renders correctly before deployment. They pipe the raw rendered manifest stream directly into `yq`, select the specific multi-document payload representing the Deployment, and extract the replicas field to assert it matches expectations.

## When should it NOT be used?

- **Massive data streams:** **Do not use `yq` to parse multi-gigabyte log streams.** YAML is inherently a slow protocol to parse due to complex line-wrapping and anchor resolution rules. Use JSON and `jq` for heavy data pipelining.
- **Heavy templating logic:** **Avoid writing 50-line `yq` expressions.** If you are doing complex if/else logic, loop reductions, and variable injections to mutate manifests, you have outgrown `yq`. Switch to Kustomize, Helm, or a programming language like Python to manage your configurations.

## Alternatives

- **`jq`:** **Best for pure JSON.** `yq` wraps `jq` concepts, but if your data is strictly JSON, the C-compiled `jq` binary is universally available and significantly faster.
- **`kislyuk/yq` (Python):** **Best for 1:1 `jq` compatibility.** This is a different tool also named `yq`. It is a Python wrapper that converts YAML to JSON, pipes it to the actual `jq` C-binary, and converts it back. It doesn't preserve comments natively like the Go version does.
- **Kustomize / Helm:** **Best for Kubernetes manipulation.** Instead of imperatively patching YAML files with `yq`, these declarative tools overlay patches and manage release state safely.

## How it works internally

`mikefarah/yq` is written in Go and statically compiled. It does not wrap the `jq` C-binary; it is a completely distinct evaluation engine built on top of the `gopkg.in/yaml.v3` library.

When `yq` reads a file, it builds an Abstract Syntax Tree (AST). The `yaml.v3` library is unique because it treats comments and formatting (like inline spacing and document separators `---`) as first-class nodes in the AST.

When you issue a command like `.spec.replicas = 3`, `yq`'s internal expression evaluator navigates the AST, finds the target node, and replaces its value. Because the comments and formatting were preserved as nodes in the tree, when `yq` serializes the AST back into text, the output looks identical to the original file, minus the specific mutated value. This is a monumental difference from older tools that parsed YAML to a generic map/dictionary, losing all contextual comments upon re-serialization.

## Performance Notes

- **Multi-Document Streams:** Processing standard Kubernetes files containing 10+ documents separated by `---` is seamless, but `yq` must parse every document into memory simultaneously if using cross-document operators (`eval-all`).
- **Go Binary Overhead:** Being a statically compiled Go binary, it is fast to start but has a slightly larger memory footprint than C-based tools like `jq`.

## Security Notes

- **In-Place Deletion:** If you use `-i` and your `yq` expression evaluates to nothing (or encounters a syntax error depending on the version), it is possible to truncate or corrupt your YAML file. Always use source control (Git) so you can revert botched `-i` commands.
- **YAML Anchors and Aliases:** YAML supports anchors (`&`) and aliases (`*`), allowing data deduplication. Maliciously crafted YAML files can use recursive aliases (the "Billion Laughs" attack) to cause denial-of-service via memory exhaustion. `yq`'s underlying YAML parser handles standard aliases but can be computationally stressed by deep recursion.

## Common Mistakes

- **Confusing the Python and Go versions of `yq`**
  - _Mistake:_ Using an expression perfectly valid in `jq` but receiving a syntax error in `yq`.
  - _Why:_ There are two popular tools named `yq`. The Go version (`mikefarah/yq`) has a highly similar, but custom, expression syntax that sometimes diverges from strict `jq`. The Python version (`kislyuk/yq`) is literally `jq`. Check `yq --version` to know which environment you are running.
- **Overwriting the file without `-i`**
  - _Mistake:_ Running `yq '.app.version="v2"' file.yaml > file.yaml`.
  - _Why:_ Standard bash redirection evaluates before `yq` executes. This instantly truncates `file.yaml` to 0 bytes, leaving `yq` with nothing to read, permanently destroying the file. Always use the `-i` (in-place) flag.
- **Failing to quote string modifications**
  - _Mistake:_ `yq -i '.version = v2' file.yaml` (results in a null/error evaluation).
  - _Why:_ To assign a string, the string itself must be quoted within the expression. The correct format uses nested quotes: `yq -i '.version = "v2"' file.yaml`.

## Best Practices

- **Strictly quote string assignments:** When passing bash variables into an in-place edit, tightly control the quoting: `yq -i ".image.tag = \"${TAG}\"" file.yaml`.
- **Normalize configurations:** Use `yq -P . messy.yaml > clean.yaml` to enforce strict formatting, 2-space indentation, and clean array structures before committing third-party manifests to your repository.

## Interview Questions

**Q: You need to extract a value from a YAML file, but the key contains a dot (e.g., `app.kubernetes.io/name`). How do you access this key without `yq` misinterpreting it as nested hierarchy?**
**A:** You must wrap the key in double quotes and brackets to escape the dot notation. The correct syntax is `yq '.["app.kubernetes.io/name"]' file.yaml`.

**Q: Why is `yq -i` vastly superior to `sed -i` for updating configuration values like application versions in Kubernetes manifests?**
**A:** `sed` operates purely on strings and regex. If the word `version:` appears multiple times, or is indented differently, or is moved to a different line by another developer, the `sed` command will break or corrupt the file. `yq` parses the actual hierarchical AST of the YAML document. It deterministically targets the exact logical node regardless of where it physically resides in the file, while preserving comments and indentation perfectly.

## Practice Problems

**Problem:** You have a `config.yaml` file. You need to read it, completely convert it to JSON format, and output the result to the terminal.
**Hint:** Use the flag that explicitly forces the output format.
**Solution:**

```bash
yq -o=json . config.yaml
```

**Problem:** A `deployment.yaml` file contains an array of containers at `.spec.template.spec.containers`. You need to modify the file in place to change the `image` attribute of the _first_ container in the array to `"nginx:latest"`.
**Hint:** Use the in-place flag, array indexing `[0]`, and remember to enclose the new string value in quotes inside the expression.
**Solution:**

```bash
yq -i '.spec.template.spec.containers[0].image = "nginx:latest"' deployment.yaml
```

## References

- [yq Documentation (mikefarah.github.io)](https://mikefarah.gitbook.io/yq/)
- [yq on GitHub](https://github.com/mikefarah/yq)
