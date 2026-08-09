---
slug: aws-ec2-describe-instances
name: aws ec2 describe-instances
aliases: []
category: cloud-cli
tags: [aws, cloud, ec2, compute, instances, listing]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'list aws ec2 instances'
  - 'describe ec2 instances'
  - 'check running ec2 servers'
  - 'find ec2 instance id'
  - 'query ec2 compute status'
relatedCommands: [aws-configure, aws-sts-get-caller-identity, aws-ec2-run-instances]
alternatives: []
status: draft
---

## What is it?

`aws ec2 describe-instances` is a core AWS CLI command used to retrieve detailed technical metadata about one or more Amazon Elastic Compute Cloud (EC2) instances. It queries the EC2 control plane API, returning a comprehensive hierarchical JSON payload describing instance states, networking configurations, attached storage volumes, security groups, and user-defined resource tags.

## Why does it exist?

Managing elastic cloud infrastructure requires a programmatic window into compute resource allocation and lifecycle states. The low-level EC2 REST API returns complex, nested XML payloads and requires manual handling of cryptographic authentication signatures and pagination tokens. `aws ec2 describe-instances` exists to bridge this gap, providing a robust command-line interface to filter, inspect, and audit compute fleets efficiently for automation pipelines, monitoring daemons, and administrative workflows.

## Syntax

```bash
aws ec2 describe-instances [--instance-ids <value>] [--filters <value>] [--max-results <value>] [--next-token <value>] [options]
```

## Flags

| Flag                   | Description                                                                                        | Example                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--instance-ids <ids>` | Restricts the query to specific, comma-separated EC2 instance IDs.                                 | `aws ec2 describe-instances --instance-ids i-0123456789abcdef0`                  |
| `--filters <filters>`  | Filters the returned instances using key-value pairs (e.g., matching state or tag values).         | `aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"` |
| `--max-results <num>`  | Limits the maximum number of evaluation results returned per API response page.                    | `aws ec2 describe-instances --max-results 10`                                    |
| `--next-token <token>` | Provides a pagination token to retrieve subsequent result sets when records exceed maximum limits. | `aws ec2 describe-instances --next-token eyJ...`                                 |
| `--profile <name>`     | Specifies a named AWS CLI profile to execute the request under a specific IAM identity.            | `aws ec2 describe-instances --profile production`                                |
| `--region <region>`    | Overrides the default region, directing the API request to a specific regional EC2 endpoint.       | `aws ec2 describe-instances --region us-west-2`                                  |
| `--endpoint-url <url>` | Overrides standard AWS endpoints with custom URLs (essential for testing via LocalStack).          | `aws ec2 describe-instances --endpoint-url http://localhost:4566`                |
| `--query <expr>`       | Filters and reshapes the JSON output using JMESPath syntax to extract precise attributes.          | `aws ec2 describe-instances --query "Reservations[*].Instances[*].InstanceId"`   |
| `--output <format>`    | Defines the response format style (`json`, `text`, `yaml`, `table`).                               | `aws ec2 describe-instances --output table`                                      |
| `--no-verify-ssl`      | Disables SSL certificate verification for API requests, useful behind corporate proxies.           | `aws ec2 describe-instances --no-verify-ssl`                                     |
| `--debug`              | Enables verbose diagnostic logging, exposing raw HTTP requests and API transport layers.           | `aws ec2 describe-instances --debug`                                             |

## Examples

```bash
aws ec2 describe-instances
```

> This queries the default region and returns a complete, unfiltered JSON document detailing every EC2 instance provisioned within the active AWS account and region.

```bash
aws ec2 describe-instances --instance-ids i-0abcd1234efgh5678
```

> This targets a single specific instance ID, retrieving its exact configuration, network interfaces, subnet IDs, and storage volume mappings without cluttering the output with unrelated resources.

```bash
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" "Name=tag:Environment,Values=Production"
```

> This applies compound server-side filtering, returning only instances that are simultaneously in a `running` state and tagged with an `Environment` key equal to `Production`.

```bash
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId, PrivateIpAddress]" --output text
```

> This combines JMESPath query filtering with text output formatting to strip away all structural JSON brackets, producing a clean, tabular list of Instance IDs paired with their private IP addresses.

```bash
aws ec2 describe-instances --region eu-west-1 --profile audit-admin
```

> This directs the query to the European regional endpoint (`eu-west-1`) while authenticating via a designated security audit profile (`audit-admin`), ensuring proper context isolation.

## Real-World Scenarios

**Auditing Running Compute Infrastructure for Compliance**

```bash
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].{ID:InstanceId, Type:InstanceType, Launch:LaunchTime}" --output table
```

> Cloud security teams routinely execute formatted queries to generate clean inventory tables of active production servers, reviewing instance types and launch timelines for vulnerability tracking and compliance reviews.

**Generating Dynamic Inventory for Configuration Management (Ansible/SSH)**

```bash
aws ec2 describe-instances --filters "Name=tag:Role,Values=web-server" "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].PublicIpAddress" --output text
```

> DevOps engineers use targeted EC2 describe queries in automation scripts to dynamically extract public IP addresses of active web servers, passing them directly into deployment tools or inventory generators.

**Troubleshooting Unresponsive Compute Nodes**

```bash
aws ec2 describe-instances --instance-ids i-0987654321fedcba0 --query "Reservations[*].Instances[*].StateReason"
```

> During incident response, support engineers quickly check the specific termination or failure state reason of a troubled or failed instance to diagnose hardware or startup configuration faults.

## When should it NOT be used?

- **Checking real-time operating system performance metrics:** Running `aws ec2 describe-instances` to monitor CPU utilization or memory leaks. **Reason:** The command only reports control-plane metadata and provisioning states, not internal guest OS resource consumption. **Use instead:** Amazon CloudWatch metrics or Systems Manager (SSM) agent monitoring.
- **Polling for continuous state changes in tight loops:** Writing high-frequency scripts that query `describe-instances` every second. **Reason:** Excessive API polling against EC2 control plane endpoints will trigger rate limiting (API throttling) and incur unnecessary request costs. **Use instead:** Event-driven architectures using Amazon EventBridge and CloudWatch alarms.
- **Modifying or terminating compute resources:** Using describe commands to attempt state mutations. **Reason:** Describe commands are strictly read-only inspection operations; they cannot change instance states. **Use instead:** `aws ec2 start-instances`, `stop-instances`, or `terminate-instances`.

## Alternatives

- **AWS Resource Groups Tagging API (`aws resourcegroupstaggingapi`):** A unified search tool. **Tradeoff:** It provides a broader, cross-service resource search mechanism based on tags, but lacks the deep, granular EC2-specific network and volume metadata returned by `describe-instances`.
- **Boto3 (Python SDK):** Programmatic AWS interaction. **Tradeoff:** Writing custom Python scripts using Boto3 gives you fine-grained exception handling and in-memory data manipulation, but requires writing boilerplate code compared to a direct CLI invocation.

## How it works internally

When you execute `aws ec2 describe-instances`, the AWS CLI translates your parameters into an HTTPS request targeting the regional `ec2.<region>.amazonaws.com` REST endpoint.

The CLI cryptographically signs the request using **Signature Version 4 (SigV4)** with your active IAM credentials. Upon receiving the signed request, the EC2 control plane backend authenticates the signature, evaluates your IAM permissions against the `ec2:DescribeInstances` action, and queries the internal EC2 resource database.

Because instances are grouped within execution contexts, the response is structured as a list of **Reservations** (representing the logical grouping of instances requested in a single API call). The EC2 backend packages this data into a structured XML or JSON payload, which the CLI parses and streams to standard output. The command exits with `0` on success, or a non-zero error code if permissions are missing or parameters are malformed.

## Performance Notes

- Querying an AWS account containing thousands of instances without filters or pagination limits (`--max-results`) will return massive JSON payloads, causing high local memory consumption and slow network transfer times.
- Utilizing server-side `--filters` significantly reduces network payload size and response latency because filtering occurs within the AWS backend database before data transmission over the network.

## Security Notes

- **Least Privilege Access:** The IAM principal executing `describe-instances` must possess the `ec2:DescribeInstances` permission. Overly broad wildcard policies (`ec2:*`) grant excessive control and violate security best practices.
- **Metadata Disclosure Risk:** Detailed instance descriptions expose private IP addresses, VPC subnet IDs, IAM instance profile associations, and internal configuration structures, which can aid attackers if output logs are leaked or stored insecurely.

## Common Mistakes

- **Confusing Instance IDs with Reservation IDs:** Filtering by a reservation ID (`r-01234`) when looking for a specific server instance ID (`i-01234`). **Why it's wrong:** Reservations represent the batch grouping of an API request, not the physical server compute unit. Querying by an incorrect identifier yields empty results.
- **Forgetting regional scope:** Running the command and wondering why instances in another region are missing. **Why it's wrong:** EC2 resources are strictly regional. If you do not specify `--region`, the CLI defaults to the region configured in your local profile, ignoring instances elsewhere.
- **Parsing massive JSON outputs manually in bash:** Piping raw `describe-instances` output into complex grep/sed pipelines. **Why it's wrong:** The JSON structure is deeply nested under `Reservations` and `Instances`. Manual text parsing is extremely brittle; you should always use `--query` with JMESPath.

## Best Practices

- Always leverage server-side `--filters` to restrict query scopes rather than downloading entire account inventories and filtering text locally in your shell.
- Master JMESPath expressions via the `--query` flag to isolate exactly the data attributes you need (such as IPs or State IDs), keeping terminal output clean and scriptable.
- In multi-account or multi-region enterprise environments, explicitly pair the command with `--profile` and `--region` flags to eliminate ambiguity.

## Interview Questions

**Q:** Why does the JSON response structure of `aws ec2 describe-instances` group instances inside an array called `Reservations`, and what does a reservation represent?
**A:** A reservation represents a record of a request to launch instances. When multiple instances are launched simultaneously in a single API call, they share the same Reservation ID. The `describe-instances` command returns an array of these reservation objects, which is why JMESPath queries require flattening (`Reservations[*].Instances[*]`) to inspect individual servers directly.

**Q:** What is the performance impact of querying an AWS account with thousands of EC2 instances without using server-side `--filters` or pagination?
**A:** Querying without filters forces the EC2 backend to pull and serialize metadata for every single instance in the region, generating a massive JSON network payload. This causes high memory utilization on the client machine, increased network latency, and can trigger AWS API rate limiting (throttling).

**Q:** How does server-side filtering (`--filters`) differ from filtering the command's output locally in your shell using tools like `grep` or `jq`?
**A:** Server-side filtering evaluates conditions directly inside the AWS EC2 backend database before transmitting data over the network, drastically reducing payload size and query latency. Local filtering via `grep` or `jq` requires downloading the entire unfiltered account inventory first, wasting network bandwidth and processing overhead.

## Practice Problems

**Problem:** Query all EC2 instances in the `us-east-1` region that are currently in a `stopped` state, outputting only their Instance IDs and Tags.
**Hint:** Use the region flag combined with a state filter and a JMESPath query.
**Solution:** `aws ec2 describe-instances --region us-east-1 --filters "Name=instance-state-name,Values=stopped" --query "Reservations[*].Instances[*].[InstanceId, Tags]"` (This scopes the region, filters for stopped compute units, and extracts specific attributes).

**Problem:** Extract a clean, bracket-free list of all private IP addresses belonging to running instances tagged with `Tier=Backend`.
**Hint:** Combine multiple filter names with JMESPath text formatting.
**Solution:** `aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" "Name=tag:Tier,Values=Backend" --query "Reservations[*].Instances[*].PrivateIpAddress" --output text` (This targets running backend instances and flushes out their private IPs as raw strings).

## References

- [AWS CLI Command Reference - ec2 describe-instances](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/describe-instances.html)
- [Amazon EC2 API Reference - DescribeInstances](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeInstances.html)
