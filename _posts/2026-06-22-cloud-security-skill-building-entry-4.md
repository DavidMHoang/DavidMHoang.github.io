---
layout: post
title: "Cloud Security Skill-Building - Entry 4"
date: 2026-06-22
description: "Building Detection-as-Code, simulating a compromised AWS role, and completing a full Terraform and AWS resource teardown"
---

---

## What I learned

In my previous entries, I focused on IAM, S3, KMS, private networking, VPC endpoints, and securely administering an EC2 instance without SSH.

For this entry, I focused on the next part of the cloud-security lifecycle:

- codifying security controls with Terraform
- building detections through code
- simulating suspicious activity from a compromised role
- containing the role
- destroying the environment
- verifying that no unmanaged resources or credentials remained

The main goal was to take controls that I had previously created manually and determine whether I could reproduce, test, and remove them through a structured engineering process.

---

## What I built

### S3 hardening with Terraform

I expanded my Terraform configuration to manage the security posture of an S3 bucket.

The bucket configuration included:

- versioning
- public-access blocking
- server-side encryption
- bucket-owner-enforced object ownership
- HTTPS-only access
- expiration of old object versions
- cleanup of incomplete multipart uploads

This made the intended configuration visible in code instead of depending only on AWS defaults or manual console changes.

The Terraform workflow became:

```text
terraform fmt
→ terraform validate
→ terraform plan
→ review
→ terraform apply
→ verify
```

This helped reinforce that Infrastructure as Code is not only used to create infrastructure. It can also document the expected security posture and make future changes reviewable.

---

## Detection-as-Code

I then reproduced my S3 monitoring pipeline through Terraform.

The configuration created:

- a CloudTrail log bucket
- S3 Data Events
- a CloudWatch log group
- an IAM role for CloudTrail log delivery
- a CloudWatch metric filter
- a burst-access alarm
- a sustained-access alarm

The detection path was:

```text
S3 GetObject
→ CloudTrail Data Event
→ CloudWatch Logs
→ Metric Filter
→ Custom Metric
→ CloudWatch Alarm
```

The CloudTrail selector was scoped to record `GetObject` activity under the approved S3 object prefix.

I generated repeated object downloads and confirmed that:

- CloudTrail recorded the requests
- the events reached CloudWatch Logs
- the metric filter matched the events
- the custom metric appeared
- the burst alarm entered the `ALARM` state

This was my first time deploying and validating a complete detection pipeline through Terraform.

---

## Where things broke

### Issue 1 — The alarm showed OK, but no metric existed

After generating the first set of S3 reads, the CloudWatch alarm showed:

```text
OK
```

However:

- the log query returned no matching events
- the custom metric did not appear
- the alarm had not actually evaluated real data

### Root cause

The alarm was configured to treat missing data as non-breaching.

That meant the alarm could appear healthy even when it had not received any matching datapoints.

The `OK` state did not prove that the detection worked.

### Fix

I validated each part of the pipeline separately:

1. Confirmed that the CloudTrail trail was enabled.
2. Confirmed the S3 Data Event selector.
3. Generated direct `s3api get-object` requests.
4. Confirmed the events reached CloudWatch Logs.
5. Confirmed the metric-filter pattern.
6. Generated a new burst after the metric filter existed.
7. Confirmed the metric and alarm.

This reinforced an important lesson:

> A configured alarm is not the same as a validated detection.

The entire path must be tested from activity generation through alert evaluation.

---

## IAM hardening

I also revised the Terraform-managed S3 access policy.

The earlier policy used a broad allow combined with an explicit deny. That was useful for learning how IAM evaluates conflicting statements, but it was more complex than necessary.

I simplified the role so it could only:

- list the approved S3 prefix
- read objects under `allowed/*`

The role had:

- no write permissions
- no access to other object paths
- no broad S3 read policy
- no global `NotResource` deny

This was a cleaner least-privilege design.

The main lesson was that the first security improvement should usually be to remove unnecessary access rather than adding more deny statements to compensate for an overly broad allow.

---

## Simulated compromised-role scenario

For the final capstone, I created a dedicated workload role with read-only access to the approved S3 prefix.

I then used AWS Security Token Service to assume the role and obtain temporary credentials.

The simulated scenario was:

```text
Compromised temporary role credentials
→ repeated S3 object reads
→ CloudTrail records the identity
→ identity-specific metric filter
→ CloudWatch alarm
```

I created a metric filter that matched:

- `s3.amazonaws.com`
- `GetObject`
- the specific capstone role name

I then generated repeated reads using the temporary role session.

The identity-specific alarm entered the `ALARM` state.

This detection was stronger than only counting S3 reads because it answered:

- which role performed the action
- which action was performed
- whether the activity matched the role’s intended purpose
- how frequently the activity occurred

---

## Containment

After the alarm was confirmed, I simulated emergency containment.

I attached an inline policy containing an explicit deny for S3 access.

The role still had its original read permission, but the explicit deny overrode that allow.

I reused the same temporary credentials and attempted another object download.

The request returned:

```text
AccessDenied
```

The response flow became:

```text
Suspicious object access
→ identity-specific alarm
→ investigation
→ emergency explicit deny
→ existing role session blocked
```

This connected IAM policy evaluation with a realistic incident-response workflow.

---

## Terraform teardown

After the capstone was complete, I created a Terraform destruction plan.

I reviewed the proposed removals and applied the saved plan.

Terraform reported:

```text
29 destroyed
```

I then ran:

```text
terraform state list
```

and confirmed that no Terraform-managed resources remained.

However, this did not mean the AWS account was completely clean.

Terraform only removed resources recorded in its state.

---

## Manual AWS resource audit

I created read-only scripts to inspect resources that had been created manually during the earlier labs.

The audit checked:

- CloudTrail trails
- CloudWatch log groups
- CloudWatch alarms
- SNS topics
- IAM policies
- IAM roles
- instance profiles
- EC2 instances
- EBS volumes
- Elastic IP addresses
- NAT gateways
- VPC endpoints
- non-default VPCs
- S3 buckets
- customer-managed KMS keys

The audit found several resources outside Terraform state, including:

- two stopped EC2 instances
- two EBS root volumes
- one S3 gateway endpoint
- one non-default VPC
- two subnets
- custom route tables
- custom security groups
- one VPC Flow Log
- one Internet Gateway
- three S3 buckets
- one customer-managed KMS key
- old IAM roles and policies
- one Terraform IAM user with a long-lived access key

---

## Dependency-aware cleanup

The manually created resources had to be removed in the correct order.

I deleted:

1. CloudTrail trails
2. CloudWatch alarms and log groups
3. the SNS topic
4. custom IAM policies
5. lab IAM roles and instance profiles
6. both EC2 instances
7. their EBS root volumes
8. the S3 VPC endpoint
9. the VPC Flow Log
10. custom security groups
11. non-main route-table associations
12. non-main route tables
13. both subnets
14. the Internet Gateway
15. the non-default VPC
16. all S3 objects, historical versions, and delete markers
17. all three S3 buckets
18. the customer-managed KMS key
19. the Terraform IAM user and access key
20. the obsolete local AWS credentials

The KMS key entered:

```text
PendingDeletion
```

which is the expected state during AWS’s mandatory deletion waiting period.

---

## Final architecture and lifecycle

The complete technical workflow was:

```text
Terraform security controls
→ CloudTrail Data Events
→ CloudWatch detection
→ simulated compromised role
→ identity-aware alarm
→ explicit-deny containment
→ Terraform destroy
→ manual account audit
→ dependency-aware cleanup
→ credential removal
```

The final verification showed no remaining:

- Terraform resources
- CloudTrail trails
- EC2 instances
- EBS volumes
- Elastic IP addresses
- NAT gateways
- VPC endpoints
- non-default VPCs
- CloudWatch log groups
- CloudWatch alarms
- SNS topics
- customer-managed IAM policies
- lab IAM roles
- instance profiles
- S3 buckets

---

## What I learned

This phase taught me that cloud security does not end when a resource is securely deployed or when an alarm enters the `ALARM` state.

A complete lifecycle also includes:

- testing the control
- confirming the telemetry
- identifying the responsible identity
- containing suspicious behavior
- removing unused resources
- auditing for configuration outside Terraform
- deleting long-lived credentials
- verifying the account after cleanup

I also learned that:

- an empty Terraform state does not prove the AWS account is empty
- an alarm showing `OK` does not prove it has received data
- identity context makes behavioral detections more meaningful
- explicit deny can support emergency containment
- cloud resources must be deleted in dependency order
- teardown is part of security engineering, not an afterthought

This completed the full workflow:

```text
Build
→ break
→ investigate
→ detect
→ contain
→ destroy
→ verify
```

The AWS environment was intentionally removed, but the Terraform configuration, troubleshooting process, and validated security scenarios remain reproducible evidence of the work.
