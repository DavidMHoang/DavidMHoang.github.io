---
layout: post
title: "Cloud Security Skill-Building - Entry 3"
date: 2026-06-21
description: "Building AWS detection pipelines, enforcing least privilege, and introducing Infrastructure as Code with Terraform"
---

## What I learned

In this entry, I moved beyond building private cloud infrastructure and focused on three areas:

- detecting suspicious activity
- enforcing least-privilege access
- defining AWS resources through Infrastructure as Code

The goal was to understand how a cloud security engineer connects visibility, detection, prevention, and repeatable deployment.

I built a detection pipeline for S3 object access, tested different exfiltration patterns, tightened IAM permissions, and began rebuilding parts of the environment with Terraform.

---

## What I built

### S3 data-event visibility

I started by enabling CloudTrail Data Events for my secure S3 bucket.

CloudTrail management events showed administrative operations such as:

- `ListBuckets`
- `GetBucketAcl`
- configuration changes

However, management events did not show individual object downloads.

To detect access to files, I needed S3 Data Events, including:

- `GetObject`
- `PutObject`
- `DeleteObject`

After enabling data events, I downloaded an object from an EC2 instance:

```bash
aws s3 cp \
  s3://david-secure-logs-2026/upload-text.txt \
  test.txt
```

The resulting CloudTrail event showed:

```json
"eventSource": "s3.amazonaws.com",
"eventName": "GetObject",
"awsRegion": "us-west-2",
"sourceIPAddress": "10.0.2.118"
```

It also identified:

- the IAM role performing the request
- the requested bucket
- the object key
- the AWS CLI user agent
- the number of bytes transferred

This confirmed that I could answer:

- who accessed the object
- which object they accessed
- when they accessed it
- where the request originated

---

### CloudWatch detection pipeline

I configured CloudTrail to deliver new events to a CloudWatch log group:

```text
cloudtrail-s3-data-events
```

I then used CloudWatch Logs Insights to investigate the events.

One of the queries I used was:

```sql
fields @timestamp,
       eventName,
       userIdentity.sessionContext.sessionIssuer.userName,
       sourceIPAddress
| filter eventName = "GetObject"
| sort @timestamp desc
```

This displayed each object read with its timestamp, IAM role, and source IP.

I also grouped the events by role and five-minute time windows:

```sql
fields userIdentity.sessionContext.sessionIssuer.userName as roleName
| filter eventName = "GetObject"
| stats count() as getObjectCount
    by roleName, bin(5m) as timeBucket
| sort timeBucket desc
```

The results showed `LogReaderEC2Role` performing counts such as:

- 39 reads
- 32 reads
- 34 reads
- 26 reads

across separate five-minute windows.

For a role intended to retrieve logs occasionally, sustained activity at that rate looked more like bulk collection than normal usage.

---

### Burst data-exfiltration detection

I created a CloudWatch metric filter for:

```text
{ $.eventName = "GetObject" }
```

The filter published a custom metric with the following configuration:

- Namespace: `Security`
- Metric name: `S3GetObjectCount`
- Metric value: `1`

This converted every matching CloudTrail event into a measurable CloudWatch datapoint.

I then created a burst-detection alarm:

- Statistic: `Sum`
- Period: 1 minute
- Threshold: greater than 5
- Datapoints to alarm: 1 out of 1

To test it, I generated multiple downloads:

```bash
for i in {1..10}; do
  aws s3 cp \
    s3://david-secure-logs-2026/upload-text.txt \
    burst_test_$i.txt
done
```

After the events reached CloudWatch, the alarm entered the `ALARM` state.

This validated the complete pipeline:

```text
S3 GetObject
→ CloudTrail Data Event
→ CloudWatch Logs
→ Metric Filter
→ Custom Metric
→ CloudWatch Alarm
```

---

### Sustained data-exfiltration detection

The first alarm detected short bursts, but an attacker could attempt to avoid it by slowing down requests.

I created a second alarm for sustained activity:

- Statistic: `Sum`
- Period: 5 minutes
- Threshold: greater than or equal to 25
- Datapoints to alarm: 3 out of 3

This required elevated activity across three consecutive five-minute windows.

I simulated sustained retrieval using:

```bash
for i in {1..120}; do
  aws s3 cp \
    s3://david-secure-logs-2026/upload-text.txt \
    slow_test_$i.txt
  sleep 8
done
```

The sustained alarm eventually entered the `ALARM` state.

The burst alarm also triggered during parts of the test because the request rate was still high enough to exceed its one-minute threshold.

This taught me that detection rules can overlap. A single activity pattern may trigger several rules because each rule evaluates the behavior through a different time window.

---

### IAM least-privilege enforcement

After working on detection, I shifted toward prevention.

I created an IAM policy that allowed `s3:GetObject` only for objects under:

```text
allowed/*
```

The policy also explicitly denied reads outside that prefix.

When I attempted to download the original object, the AWS CLI returned:

```text
HeadObject operation: Forbidden
```

The CLI performed a `HeadObject` request before downloading the file, so the forbidden response confirmed that access was being blocked.

I then tested the approved path:

```text
s3://david-secure-logs-2026/allowed/test.txt
```

S3 does not use folders in the same way as a traditional filesystem. The `allowed/` portion is simply part of the object key.

To upload the test object, I temporarily allowed:

- `s3:PutObject`

Because the bucket used SSE-KMS, the upload also required KMS permissions such as:

- `kms:GenerateDataKey`
- `kms:Encrypt`
- `kms:DescribeKey`

Without KMS authorization, the upload failed even though S3 allowed `PutObject`.

After testing the upload and download successfully, I removed the temporary write and KMS permissions so the role returned to read-only access.

---

### IAM source-IP conditions

I then added an `aws:SourceIp` condition to restrict access based on request origin.

At first, the condition did not enforce the restriction as expected.

The role still had a broader S3 read policy attached. When the conditional allow did not match, the broader policy could still authorize the request.

The existing explicit deny only blocked objects outside `allowed/*`, so it did not prevent another policy from allowing access to the approved prefix.

I added a second explicit deny using `NotIpAddress`.

The resulting logic became:

- allow `GetObject` for `allowed/*` from the approved IP
- deny `GetObject` outside `allowed/*`
- deny `GetObject` for `allowed/*` from an unapproved IP

I initially used the public IP shown on the EC2 page, but the request was denied. I checked the source IP AWS actually observed, updated the policy, and successfully downloaded the file.

This reinforced an important IAM rule:

> A conditional allow does not create an effective boundary when another broader allow still applies. An explicit deny may be required to enforce the restriction.

---

### Infrastructure as Code with Terraform

I also began rebuilding parts of the environment through Terraform.

I defined resources for:

- an S3 bucket
- S3 versioning
- an IAM policy
- an IAM role
- an IAM policy attachment
- an IAM instance profile
- a planned EC2 instance

I learned the basic Terraform block structure:

```hcl
resource "RESOURCE_TYPE" "LOCAL_NAME" {
  configuration = "value"
}
```

For example:

```hcl
resource "aws_iam_role" "log_reader_role" {
  name = "terraform-log-reader-role"
}
```

In this structure:

- `resource` identifies the type of Terraform block
- `aws_iam_role` is the AWS provider resource type
- `log_reader_role` is the local Terraform reference name
- the block body contains the configuration

I practiced the standard Terraform workflow:

```bash
terraform init
terraform plan
terraform apply
terraform state list
terraform destroy
```

The commands served different purposes:

- `init` prepared the directory and downloaded the AWS provider
- `plan` previewed proposed infrastructure changes
- `apply` created the approved resources
- `state list` showed the resources Terraform managed
- `destroy` removed the Terraform-managed environment

I later separated the configuration into:

- `main.tf`
- `variables.tf`
- `outputs.tf`

I added variables for the region, bucket name, and environment, along with tags such as:

```hcl
tags = {
  Environment = var.environment
  Name        = "cloud-security-lab"
  ManagedBy   = "terraform"
}
```

I also created outputs for the bucket name and ARN.

This made the configuration more reusable and easier to understand.

---

## Where things broke

### CloudTrail showed activity, but not object downloads

I initially saw management and service events but not `GetObject`.

The issue was not a lack of S3 activity. Object access required CloudTrail Data Events, and those events were delivered to the trail logs rather than appearing like normal management events in Event History.

### The CloudTrail log bucket rejected a new trail

The log bucket policy allowed specific existing trail ARNs but did not allow the new trail.

The policy structure was valid, but its `AWS:SourceArn` condition did not match the new trail.

This showed how exact ARN scoping supports least privilege but also creates operational friction when new resources are introduced.

### IAM conditions appeared ineffective

The IP-based conditional allow did not enforce the restriction because another attached policy still allowed S3 reads.

The fix was to understand the full policy evaluation path and add an explicit deny.

### S3 uploads failed despite `PutObject`

The bucket used SSE-KMS encryption. Uploading required both S3 write permission and permission to generate a KMS data key.

This reinforced that encrypted storage often involves authorization across multiple services.

---

## Cost and architecture tradeoffs

I also reviewed my AWS costs.

The largest VPC expense came from Interface VPC Endpoints for services such as:

- SSM
- SSM Messages
- EC2 Messages
- STS

These endpoints were billed hourly.

The S3 Gateway Endpoint did not have the same hourly endpoint cost.

I also had charges from:

- two running EC2 instances
- EBS storage
- a public IPv4 address
- a customer-managed KMS key
- CloudTrail data events

To reduce costs, I:

- stopped the private EC2 instance
- used the public test instance for later exercises
- removed unnecessary Interface Endpoints
- avoided deploying an additional Terraform EC2 instance
- destroyed temporary Terraform resources after validation

This demonstrated that secure architecture involves tradeoffs between:

- isolation
- convenience
- availability
- operational cost

---

## Final architecture

The detection path was:

```text
EC2
→ S3 GetObject
→ CloudTrail Data Event
→ CloudWatch Logs
→ Metric Filter
→ Custom Metric
→ CloudWatch Alarm
```

The access-control path was:

```text
IAM Role
→ Prefix Restriction
→ Source-IP Condition
→ Explicit Deny
→ S3 Object
→ KMS Authorization
```

The Terraform workflow was:

```text
Write
→ Initialize
→ Plan
→ Review
→ Apply
→ Verify
→ Destroy
```

---

## Key takeaways

This entry taught me that cloud security requires several layers working together:

- prevention
- visibility
- detection
- identity context
- validation
- repeatable deployment
- cost management

I learned that enabling CloudTrail does not automatically provide visibility into every important action. S3 object access requires Data Events.

I learned that logs alone are not detections. They must be queried, converted into signals, and evaluated against meaningful conditions.

I learned that IAM policies cannot be evaluated in isolation. A restrictive statement may not be effective if another broader policy still grants access.

Terraform introduced a more professional infrastructure workflow by allowing changes to be reviewed before deployment and reproduced consistently.

The biggest shift was moving from configuring individual AWS services toward understanding how detection, IAM enforcement, encrypted storage, cost, and Infrastructure as Code fit together as one security architecture.
