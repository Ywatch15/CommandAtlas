---
slug: gcloud-compute-instances-list
name: gcloud compute instances list
aliases: []
category: cloud-cli
tags: [gcp, compute, gce, virtual-machines, cloud, gcloud]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd]
intentPhrases:
  - 'list all gcp vms'
  - 'show compute engine instances'
  - 'get vm ips in gcp'
  - 'find virtual machine status google cloud'
  - 'list vms by label gcloud'
relatedCommands: [gcloud-compute-ssh]
alternatives: []
status: draft
---

## What is it?

`gcloud compute instances list` is an operational command used to query the Google Compute Engine (GCE) API and retrieve a list of all Virtual Machine instances within a specified project. It outputs a high-level summary of each VM, including its name, availability zone, machine type, provisioning state (e.g., RUNNING, TERMINATED), and its assigned internal and external IP addresses.

## Why does it exist?

Managing infrastructure at scale requires immediate visibility into deployed fleet inventory. While the Google Cloud Console provides a graphical interface, administrators and automation scripts require a fast, programmatic method to retrieve instance state and network routing information. `gcloud compute instances list` exists to fulfill this need, bridging the raw JSON payload of the Compute Engine REST API with powerful client-side formatting and filtering capabilities. This allows engineers to rapidly extract specific data, such as fetching all external IPs of servers matching a specific tag, directly from the terminal.

## Syntax

```bash
gcloud compute instances list [options]
```

## Flags

| Flag        | Description                                                                                                            | Example                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--project` | Specifies the Google Cloud project ID to query, overriding the active configuration default.                           | `gcloud compute instances list --project=my-prod-env`                            |
| `--zones`   | Restricts the query to a comma-separated list of specific zones, significantly speeding up execution.                  | `gcloud compute instances list --zones=us-central1-a,us-east1-b`                 |
| `--filter`  | Applies client-side or server-side evaluation logic to filter the returned list based on specific resource attributes. | `gcloud compute instances list --filter="status=RUNNING"`                        |
| `--limit`   | Restricts the total number of instances returned by the API to the specified integer.                                  | `gcloud compute instances list --limit=5`                                        |
| `--format`  | Transforms the output format. Highly useful for extracting specific data points (e.g., `json`, `csv`, `value`).        | `gcloud compute instances list --format="value(networkInterfaces[0].networkIP)"` |
| `--sort-by` | Sorts the returned list of instances based on a specified field (prefix with `~` for descending order).                | `gcloud compute instances list --sort-by="~creationTimestamp"`                   |
| `--regexp`  | Filters the list to only include instances whose names match the provided regular expression.                          | `gcloud compute instances list --regexp=".*-web-.*"`                             |

## Examples

```bash
gcloud compute instances list
```

> Performs an aggregated query across all zones in the default project. It outputs a standard table displaying the Name, Zone, Machine Type, Preemptible status, Internal IP, External IP, and execution Status for every VM.

```bash
gcloud compute instances list --filter="status=TERMINATED"
```

> Filters the fleet to only display VMs that are currently stopped. This is an essential command for cost-optimization sweeps, allowing administrators to find orphaned instances that are consuming persistent disk storage while powered off.

```bash
gcloud compute instances list --filter="labels.env:prod AND labels.tier:frontend"
```

> Queries instances based on attached key-value labels. This specific command isolates production frontend servers, relying on the robust Google Cloud filtering syntax to handle complex logical `AND`/`OR` conditions.

```bash
gcloud compute instances list --format="value(name, zone)"
```

> Strips away the tabular ASCII formatting and outputs only the raw text values of the instance names and their respective zones, separated by a tab. This format is heavily relied upon by bash loops requiring structured input.

```bash
gcloud compute instances list --format="json"
```

> Dumps the complete, highly detailed Compute Engine REST API JSON response for all instances. This includes deeply nested metadata, disk configurations, and service account attachments that are hidden in the default table view.

## Real-World Scenarios

**Dynamic Ansible/SSH Inventory Generation**

```bash
gcloud compute instances list --filter="tags.items=web-server" --format="value(networkInterfaces[0].accessConfigs[0].natIP)" > web_ips.txt
```

> A DevOps engineer needs to run an urgent patch via SSH across a fleet of web servers. They use the `format="value(...)"` flag combined with a tag filter to extract _only_ the external IP addresses of the matching instances, writing a clean, newline-separated list directly into a text file for consumption by Ansible or parallel-SSH tools.

**Cost-Optimization Audits**

```bash
gcloud compute instances list --filter="machineType:n1-standard-32 AND status=RUNNING"
```

> A Finance Operations (FinOps) team is auditing cloud spend. They use the wildcard operator (`:`) to search for massively over-provisioned, expensive legacy instances (like the 32-core N1 series) that are currently active, generating an immediate hit-list for rightsizing efforts.

## When should it NOT be used?

- **Organization-wide Inventory:** **Do not use this to list VMs across hundreds of projects.** `gcloud compute instances list` operates on a single project at a time. If you need a global inventory across an entire Google Cloud Organization, use the Cloud Asset Inventory API (`gcloud asset search-all-resources`).
- **Checking Detailed Health Status:** **Do not rely on this command for deep application health.** The `status=RUNNING` output merely indicates the hypervisor has booted the VM. It does not guarantee the OS has loaded successfully, nor that the web server is responding. Use Google Cloud Monitoring/Health Checks for application state.

## Alternatives

- **`gcloud asset search-all-resources`:** **Best for cross-project queries.** Can search for Compute instances across entire folders or organizations instantly, bypassing the single-project limitation of the compute API.
- **Google Cloud Console:** **Best for visual filtering.** The web-based GUI provides excellent, point-and-click column filtering and immediate links to VM performance metrics that terminal outputs cannot match.

## How it works internally

By default, when `gcloud compute instances list` is executed without the `--zones` flag, the CLI does not send a single list request. Instead, it utilizes the Compute Engine `instances.aggregatedList` REST API endpoint.

The `aggregatedList` API queries the Google Cloud control plane for instances spanning _every single zone_ globally within the specified project. The API response is paginated and segmented by zone. The CLI parses this complex JSON structure, flattens the multidimensional array, applies any requested `--filter` logic (if the filter wasn't natively supported server-side), maps the nested API properties (like extracting the primary IP from the `networkInterfaces` array) to human-readable table columns, and formats the output to standard out.

Because instances are zonal resources in GCP, passing the `--zones=us-central1-a` flag fundamentally changes the underlying behavior. The CLI switches from the global `aggregatedList` endpoint to the highly specific `instances.list` endpoint targeted directly at that exact zone, resulting in significantly faster response times.

## Performance Notes

- **Zonal Filtering:** In projects with massive numbers of VMs scattered globally, relying on the default `aggregatedList` behavior can cause the command to take several seconds to return. If you know the instances you need reside in `europe-west4-a`, passing `--zones=europe-west4-a` bypasses the global aggregation and dramatically accelerates the query.
- **Server-side vs Client-side Filtering:** `gcloud` attempts to pass `--filter` arguments to the Compute API to be executed server-side. However, if the filter utilizes complex string matching or functions not supported by the API, `gcloud` falls back to fetching _all_ instances from the API and filtering them client-side in Python, consuming significantly more memory and bandwidth.

## Security Notes

- **Permissions Required:** Executing this command requires the `compute.instances.list` IAM permission on the target project, typically granted via the `Compute Viewer` or `Viewer` roles.
- **Metadata Exposure:** If outputting with `--format=json`, be aware that custom instance metadata is included in the payload. If developers have improperly hardcoded database passwords or API keys into the VM's custom metadata fields (instead of using Secret Manager), this command will pull those secrets into the terminal buffer in plaintext.

## Common Mistakes

- **Misunderstanding IP Extraction**
  - _Mistake:_ Using `grep` and `awk` to clumsily extract IP addresses from the default table output.
  - _Why:_ The default table format is fragile and breaks if column widths change. Always use the built-in JSON path projector: `--format="value(networkInterfaces[0].networkIP)"` for internal IPs, or `accessConfigs[0].natIP` for external IPs.
- **Using `=` instead of `:` for partial matches**
  - _Mistake:_ Running `--filter="machineType=e2-micro"` and getting no results, even though you have `e2-micro` VMs.
  - _Why:_ The `=` operator in GCP filters requires an exact string match. The Compute API stores machine types as full URIs (e.g., `zones/us-central1-a/machineTypes/e2-micro`). To match just the end of the string, you must use the `:` (has) operator: `--filter="machineType:e2-micro"`.

## Best Practices

- **Leverage Labels:** Establish a strict tagging/labeling strategy for your infrastructure (e.g., `owner`, `cost-center`, `environment`). This transforms `gcloud compute instances list` from a simple inventory tool into a powerful billing and governance querying engine.
- **Alias Complex Formats:** If you frequently need specific outputs, create bash aliases. For example: `alias gcip='gcloud compute instances list --format="table(name,networkInterfaces[0].networkIP)"'` provides a lightning-fast custom view of just names and internal IPs.

## Interview Questions

**Q: Why does running `gcloud compute instances list` sometimes take noticeably longer than `gcloud compute instances list --zones=us-east1-b`?**
**A:** Without specifying a zone, instances are queried using the global `aggregatedList` Compute API endpoint, which must poll the control plane across all existing Google Cloud zones. Providing a specific zone switches the CLI to the zonal `instances.list` endpoint, narrowing the search space and eliminating global aggregation latency.

**Q: You need to output the names of all VMs in your project to pass them into a script, but the default output includes headers and other columns. How do you cleanly extract just the raw names?**
**A:** You use the value format projection: `gcloud compute instances list --format="value(name)"`. This strips away headers, borders, and extraneous data, outputting only the raw text of the instance names separated by newlines.

## Practice Problems

**Problem:** You need to find all instances in the project `data-analytics-prod` that are currently in the `RUNNING` state, but you only want to query the `europe-west3-a` zone to speed up the command.
**Hint:** Combine the flags for target project, target zone, and state filtering.
**Solution:**

```bash
gcloud compute instances list --project=data-analytics-prod --zones=europe-west3-a --filter="status=RUNNING"
```

**Problem:** You want to generate a clean, comma-separated CSV file containing the Name and the Zone of every VM in your default project.
**Hint:** Use the format flag, specify the CSV formatting type, and declare the exact columns you want included.
**Solution:**

```bash
gcloud compute instances list --format="csv(name, zone)" > inventory.csv
```

## References

- [gcloud compute instances list - Google Cloud CLI Documentation](https://cloud.google.com/sdk/gcloud/reference/compute/instances/list)
- [gcloud topic formats - Formatting Output](https://cloud.google.com/sdk/gcloud/reference/topic/formats)
- [gcloud topic filters - Filtering Output](https://cloud.google.com/sdk/gcloud/reference/topic/filters)
