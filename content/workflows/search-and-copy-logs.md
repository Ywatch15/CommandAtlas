---
slug: search-and-copy-logs
title: Search and Extract Server Log Files
category: text-processing
difficulty: intermediate
tags: [logs, grep, cp, extraction, incident-response]
estimatedTime: 10 minutes
prerequisites: [grep, cp]
steps:
  - command: grep
    note: Search recursively for error-level entries across all server log files, case-insensitively.
  - command: cp
    note: Copy the matching log files to a staging directory, preserving original attributes.
  - command: tail
    note: Review the staged files' most recent entries to confirm you captured the right time window.
relatedWorkflows: []
status: draft
---

## Overview

When investigating a production incident, you rarely want to run diagnostic commands directly against live log files on the production host. Grepping repeatedly against a multi-gigabyte log under active write load adds I/O pressure to a system that may already be struggling, and it ties your analysis to a terminal session on that host — if the connection drops, you lose your place. This workflow isolates the relevant log entries once, copies them somewhere safe, and lets you analyze offline at your own pace, without touching production again.

## Workflow Execution

### Step 1: Isolate error entries with `grep`

```bash
grep -rli "error" /var/log/myapp/
```

Search recursively (`-r`) and case-insensitively (`-i`) across the log directory, printing only filenames (`-l`) that contain a match. Filtering to filenames first — rather than full lines — keeps this step fast even against very large log directories, since `grep -l` stops reading each file at its first match instead of scanning it completely.

Why `grep` first, before anything else: you want to know _which_ files matter before you spend time copying them. Copying the entire log directory wholesale and filtering afterward wastes disk I/O and staging-directory space on files that never had a relevant error in the first place.

### Step 2: Stage the matching files with `cp`

```bash
cp $(grep -rli "error" /var/log/myapp/) /tmp/incident-staging/
```

Copy only the files identified in Step 1 into a dedicated staging directory. Using `cp` here — not `mv` — is deliberate: the original files stay in place on the production host, untouched, in case another team member or a different tool needs to reference them later. Command substitution (`$(...)`) feeds Step 1's output directly into `cp`'s argument list, so you never have to manually type out filenames.

Why staging matters: once files are off the production host, you can grep, sort, and cross-reference them as aggressively as you want without any risk of impacting the live application.

### Step 3: Confirm the time window with `tail`

```bash
tail -n 50 /tmp/incident-staging/*.log
```

Before doing deeper analysis, quickly check the last 50 lines of each staged file. This confirms two things at once: that the copy actually succeeded (you'll see real log content, not an empty or truncated file), and that the entries you captured actually fall within the incident's real time window — a `grep -i "error"` match from three weeks ago is very different from one from ten minutes ago, and this step catches that distinction before you waste time analyzing the wrong data.

## References

- [grep command reference](/command/grep)
- [cp command reference](/command/cp)
- [tail command reference](/command/tail)
