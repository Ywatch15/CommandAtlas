---
slug: aws
name: aws
aliases: []
category: cloud-cli
tags:
  - aws
  - cloud
  - cli
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - cmd
intentPhrases:
  - manage aws cloud resources
  - aws s3 sync files
relatedCommands: [aws-configure]
alternatives: []
status: published
---

## What is it?

`aws` (AWS CLI) is a unified tool for managing Amazon Web Services cloud infrastructure from the command line.

## Why does it exist?

`aws` automates interactions with AWS services (S3, EC2, IAM, Lambda, ECS) through structured scriptable API calls.

## Syntax

```bash
aws [options] <command> <subcommand> [parameters]
```

## Flags

| Flag        | Description                             | Example                        |
| ----------- | --------------------------------------- | ------------------------------ |
| `--region`  | Target AWS Region                       | `aws --region us-east-1 s3 ls` |
| `--profile` | Use specific named credential profile   | `aws --profile prod s3 ls`     |
| `--output`  | Output format (json, text, table, yaml) | `aws s3 ls --output table`     |

## Examples

```bash
aws s3 ls
```

> List all S3 buckets in account.

## Real-World Scenarios

- Automated infrastructure management.

## When should it NOT be used?

- Declarative infrastructure management (use Terraform).

## Alternatives

- Terraform / CloudFormation.

## How it works internally

Sends HTTPS REST API calls to service endpoints.

## Performance Notes

Fast execution.

## Security Notes

Protect credentials in ~/.aws/credentials.

## Common Mistakes

Hardcoding access keys in scripts.

## Best Practices

Use IAM Roles and AWS SSO.

## Interview Questions

**Q:** How does AWS CLI resolve region configuration?
**A:** Flag -> Environment variable -> Named profile -> Default profile.

## Practice Problems

- List S3 buckets using AWS CLI.

## References

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
