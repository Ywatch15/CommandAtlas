---
slug: aws
name: aws
aliases: []
category: cloud-cli
tags:
  - aws
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
  - manage aws cloud resources
  - aws s3 sync files
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`aws` (AWS CLI) is a unified tool for managing Amazon Web Services cloud infrastructure from the command line.

## Why does it exist?

`aws` automates interactions with AWS services (S3, EC2, IAM, Lambda, ECS) through structured scriptable API calls.

## Syntax

```bash
aws [options] <service> <command> [parameters]
```

## Flags

| Flag        | Description                       | Example                                     |
| ----------- | --------------------------------- | ------------------------------------------- |
| `--profile` | Use named credential profile      | `aws --profile prod s3 ls`                  |
| `--output`  | Output format (json, text, table) | `aws ec2 describe-instances --output table` |
| `--region`  | Override target AWS region        | `aws s3 ls --region us-west-2`              |

## Examples

```bash
aws s3 ls
```

> Lists all S3 buckets owned by the authenticated AWS IAM identity.

## Real-World Scenarios

**CI/CD Artifact Deployment**: Syncing built static site assets directly into an AWS S3 bucket with `aws s3 sync ./dist s3://my-bucket`.

## When should it NOT be used?

- **Complex infrastructure state management**: Infrastructure-as-code tools like Terraform or AWS CloudFormation/CDK are better than raw AWS CLI scripts for managing complex infrastructure state.

## Alternatives

- **`terraform`**: Declarative multi-cloud infrastructure provisioner.

## How it works internally

`aws` wraps AWS REST APIs via `botocore` (Python SDK), signing HTTP requests with SigV4 credentials.

## Performance Notes

API calls network latency depends on AWS control plane responsiveness and target region distance.

## Security Notes

Never hardcode AWS Access Keys into scripts or Git repositories; use AWS IAM Roles or environment variables (`AWS_ROLE_ARN`).

## Common Mistakes

- **Committing secret keys in `~/.aws/credentials` to Git**: Always put AWS credential folders in `.gitignore`.

## Best Practices

- Use AWS IAM SSO / Identity Center or AWS Vault for short-lived temporary security credentials.

## Interview Questions

**Q:** How do you sync local directory `./build` to S3 bucket `my-app` deleting files no longer present locally?
**A:** `aws s3 sync ./build s3://my-app --delete`

## Practice Problems

**Problem:** List all running EC2 instance IDs using `--query` filter.
**Solution:** `aws ec2 describe-instances --query "Reservations[*].Instances[*].InstanceId" --output text`

## References

- [AWS CLI Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/index.html)
