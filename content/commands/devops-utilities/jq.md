---
slug: jq
name: jq
aliases: []
category: devops-utilities
tags:
  - jq
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - parse JSON in command line
  - format json output
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`jq` is a lightweight, flexible command-line JSON processor designed to filter, transform, slice, and map JSON inputs.

## Why does it exist?

`jq` provides a domain-specific filter language for extracting values, reformatting payloads, and manipulating JSON data in shell pipelines.

## Syntax

```bash
jq [options] 'filter' [file...]
```

## Flags

| Flag | Description                                   | Example                           |
| ---- | --------------------------------------------- | --------------------------------- |
| `-r` | Output raw strings without JSON double quotes | `jq -r '.version' package.json`   |
| `-c` | Compact output (one JSON object per line)     | `jq -c '.' data.json`             |
| `-s` | Read all inputs into an array (slurp mode)    | `jq -s '.' file1.json file2.json` |

## Examples

```bash
curl -s https://api.github.com/repos/nodejs/node | jq '.stargazers_count'
```

> Fetches Node.js repo metadata from GitHub API and extracts stargazers count.

## Real-World Scenarios

**Extracting values in CI/CD shell scripts**: Reading package versions or API response tokens dynamically inside automated deployment scripts.

## When should it NOT be used?

- **Parsing YAML or XML**: Use `yq` or `xq` for non-JSON data formats.

## Alternatives

- **`yq`**: YAML and XML processor built on top of jq query semantics.

## How it works internally

`jq` compiles string expressions into an internal bytecode format executed against parsed C JSON tree data structures.

## Performance Notes

Fast C implementation handling large multi-megabyte JSON payloads with minimal memory footprint.

## Security Notes

Ensure untrusted JSON payloads do not exhaust memory when processing deeply nested structures.

## Common Mistakes

- **Forgetting `-r` when storing string values in shell variables**: Results in shell variables containing literal escaped double quotes (`"1.0.0"` instead of `1.0.0`).

## Best Practices

- Always test jq filters on sample JSON snippets before incorporating into production scripts.

## Interview Questions

**Q:** How do you extract field `status` from JSON payload string without quotes using `jq`?
**A:** `echo '{"status":"ok"}' | jq -r '.status'`

## Practice Problems

**Problem:** Map an array of user objects `[{"name":"Alice"},{"name":"Bob"}]` to extract an array of names.
**Solution:** `jq '[.[].name]'` or `jq '.[].name'`

## References

- [jq manual](https://jqlang.github.io/jq/manual/)
