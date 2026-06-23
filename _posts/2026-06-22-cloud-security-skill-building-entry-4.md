---
layout: post
title: "Cloud Security Skill-Building - Final Reflection"
date: 2026-06-22
description: "Reflecting on the complete AWS cloud-security learning cycle, from IAM fundamentals through detection, containment, Infrastructure as Code, and teardown"
---

---

## What I learned

I began this cloud-security learning project to move beyond theoretical cybersecurity concepts and build practical experience with cloud infrastructure, identity, encryption, monitoring, detection, and incident response.

I chose Amazon Web Services as the platform because I wanted to learn cloud-security concepts through a real environment rather than only memorizing individual services.

The project began with IAM and eventually developed into a complete security-engineering lifecycle:

```text
Identity and authorization
→ networking
→ encryption
→ visibility
→ detection
→ Infrastructure as Code
→ incident containment
→ teardown
```

---

## IAM, S3, and KMS

The first phase focused on Identity and Access Management.

I practiced:

- IAM users and roles
- temporary credentials
- policy structure
- resource scoping
- conditions
- implicit deny
- explicit deny
- least privilege

I wrote an IAM policy that combined:

- `s3:ListBucket`
- `s3:GetObject`
- prefix restrictions
- KMS decryption
- secure-transport enforcement
- explicit denial of protected paths

I also created an S3 bucket encrypted with a customer-managed KMS key.

---

## Where things first broke

My EC2 role had S3 read access, but an encrypted object download returned:

```text
AccessDenied
```

### Root cause

The role had:

```text
s3:GetObject
```

but did not have:

```text
kms:Decrypt
```

The object was stored in S3, but the data could not be decrypted without separate KMS authorization.

### Fix

I added a least-privilege KMS permission scoped to:

- the specific KMS key
- the S3 service
- the relevant encryption context

After that, the object downloaded successfully.

This established one of the main lessons of the project:

> Access to an encrypted cloud resource can require authorization from multiple services.

---

## Building the network boundary

The next phase focused on AWS networking.

I created:

- a VPC using `10.0.0.0/16`
- a public subnet using `10.0.1.0/24`
- a private subnet using `10.0.2.0/24`
- an Internet Gateway
- public and private route tables
- a private EC2 instance
- security groups with no inbound rules

The private instance had:

- no public IP address
- no SSH access
- no open inbound ports
- an IAM role using temporary credentials

Instead of securing SSH, I removed the need for SSH and used AWS Systems Manager Session Manager.

---

## Where networking broke

The private EC2 instance could not initially connect to Systems Manager.

### Root cause

The private subnet had:

- no NAT Gateway
- no path to Systems Manager
- no VPC endpoints

### Fix

I created Interface VPC Endpoints for:

- Systems Manager
- SSM Messages
- EC2 Messages
- Security Token Service

I also created an S3 Gateway Endpoint and associated it with the private route table.

This allowed the EC2 instance to communicate with the required AWS services without receiving a public IP address.

---

## Route tables determine exposure

During troubleshooting, I discovered that the private subnet had been associated with the public route table.

That meant the subnet had a route through the Internet Gateway even though it was labeled “private.”

I corrected the route-table association.

This reinforced that:

> A subnet is not public or private because of its name. Its routes determine its effective behavior.

---

## A layered troubleshooting model

The IAM and networking exercises created a reusable troubleshooting process:

```text
Network path
→ identity
→ authorization
→ encryption
→ operating-system behavior
```

A cloud request can fail because:

- the workload cannot reach the service
- credentials are unavailable
- IAM does not authorize the action
- KMS does not authorize the cryptographic operation
- the host cannot write to the requested location

Separating these layers helped me avoid treating every AWS problem as an IAM problem.

---

## Logging and visibility

After building the environment, I focused on recording activity.

I configured:

- CloudTrail management events
- CloudTrail S3 Data Events
- VPC Flow Logs
- CloudWatch Logs
- CloudWatch Logs Insights
- metric filters
- custom metrics
- alarms
- SNS notifications

One important discovery was that enabling CloudTrail did not automatically provide visibility into every action.

Management events showed administrative activity, but S3 object access required Data Events.

After enabling S3 Data Events, I could identify:

- the IAM role
- the role session
- the action
- the bucket
- the object key
- the source address
- the user agent
- the event time

---

## Building exfiltration detections

I created two detections for S3 `GetObject` behavior.

### Burst detection

The first alarm detected more than five object reads within one minute.

It was designed to recognize:

- rapid retrieval
- noisy behavior
- obvious bulk access

### Sustained detection

The second alarm evaluated elevated object access across consecutive five-minute periods.

It was designed to recognize:

- slower retrieval
- prolonged collection
- attempts to spread activity across time

The tests showed that both alarms could trigger during the same activity.

A sustained test could still exceed the burst threshold during an individual minute.

This taught me that detection rules must be tuned using observed behavior rather than relying only on the names assigned to them.

---

## Identity-aware detection

The investigation evolved from asking:

```text
How many GetObject events occurred?
```

to asking:

```text
Which identity performed the actions, and was that behavior normal for the role?
```

A log-reading role may be authorized to retrieve objects, but repeated bulk retrieval can still be suspicious if it does not match the role’s intended purpose.

The detection logic began combining:

- identity
- action
- volume
- time window
- source
- expected behavior

This made the alert more meaningful than a simple event count.

---

## IAM hardening

I tested restrictions based on:

- S3 object prefixes
- source IP addresses
- explicit deny logic

The role was restricted to:

```text
allowed/*
```

Attempts to read other object paths were denied.

I also tested an `aws:SourceIp` condition.

At first, the condition appeared ineffective.

### Root cause

Another broader S3 policy still authorized the request.

The conditional allow did not match, but the broader allow remained applicable.

### Fix

I added an explicit deny to enforce the boundary.

Later, I simplified the policy by removing the broad permission and granting only the exact access required.

This reinforced that IAM policies must be evaluated together rather than one statement at a time.

---

## Infrastructure as Code

I then rebuilt the environment using Terraform.

I practiced:

- provider configuration
- resource blocks
- local Terraform names
- variables
- outputs
- dependencies
- state
- formatting
- validation
- planning
- applying
- destruction

The project was divided into:

- `main.tf`
- `variables.tf`
- `outputs.tf`
- `detection.tf`
- `capstone.tf`

Terraform managed:

- S3 configuration
- versioning
- encryption
- public-access blocking
- lifecycle policies
- bucket policies
- IAM roles
- IAM policies
- CloudTrail
- CloudWatch Logs
- metric filters
- alarms

The workflow became:

```text
Write
→ format
→ validate
→ plan
→ review
→ apply
→ test
```

---

## Detection-as-Code

The manually created S3 detection pipeline was rebuilt through Terraform.

I generated controlled S3 reads and confirmed:

- the event was recorded
- the event reached CloudWatch Logs
- the metric filter matched it
- the custom metric was created
- the alarm entered the expected state

This demonstrated that the security controls could be recreated consistently without depending on undocumented console steps.

---

## Simulated compromise and containment

For the final capstone, I created a narrowly scoped S3 reader role.

I assumed the role through STS and used its temporary credentials to generate repeated object reads.

An identity-specific alarm detected the elevated activity.

I then attached an emergency explicit-deny policy and retried the request with the same temporary credentials.

The request was denied.

The completed response flow was:

```text
Authorized role
→ abnormal behavior
→ CloudTrail evidence
→ identity-specific alert
→ investigation
→ explicit-deny containment
→ access blocked
```

This connected access-control engineering, detection engineering, and incident response.

---

## Cost and operational awareness

The project also demonstrated that secure architecture can introduce cost.

The main charges came from:

- Interface VPC Endpoints
- EC2 instances
- EBS volumes
- public IPv4 usage
- CloudTrail Data Events
- CloudWatch logging
- the customer-managed KMS key

I avoided a NAT Gateway, but the collection of Interface Endpoints still generated hourly costs.

This reinforced that a cloud-security design must consider:

- security
- usability
- availability
- operational complexity
- cost

---

## Teardown and final verification

Terraform destroyed:

```text
29 resources
```

However, manually created resources remained outside Terraform state.

I audited and removed:

- CloudTrail trails
- CloudWatch alarms
- log groups
- SNS topics
- IAM policies
- IAM roles
- instance profiles
- EC2 instances
- EBS volumes
- VPC endpoints
- VPC Flow Logs
- security groups
- route tables
- subnets
- the Internet Gateway
- the non-default VPC
- S3 buckets and object versions
- the customer-managed KMS key
- the Terraform IAM user
- the long-lived access key
- local AWS credential entries

The final verification showed no remaining lab infrastructure.

The KMS key entered `PendingDeletion`, which was the expected state during its deletion waiting period.

---

## Final architecture and workflow

The complete project followed this lifecycle:

```text
Design
→ deploy
→ misconfigure
→ troubleshoot
→ monitor
→ detect
→ contain
→ rebuild as code
→ destroy
→ audit
→ verify
```

The most important outcome was understanding how these layers interact:

```text
Networking
+ identity
+ authorization
+ encryption
+ logging
+ detection
+ response
+ automation
+ operations
```

---

## What I learned

The strongest lessons often came from failures:

- having S3 access but lacking KMS authorization
- having IAM permission but no network path
- configuring an alarm that had not received telemetry
- writing a conditional allow that was bypassed by another policy
- destroying Terraform resources while manual resources remained
- trying to delete a VPC before removing all its dependencies

Each failure required me to identify the responsible layer, test my assumptions, and correct the design.

This cloud-security foundation phase is now complete.

The project gave me practical experience in:

- cloud architecture
- IAM engineering
- encrypted storage
- logging and detection
- behavioral investigation
- Infrastructure as Code
- incident containment
- cost management
- resource teardown
- credential lifecycle management

The environment itself was intentionally deleted, but the Terraform source, documentation, debugging process, and validated scenarios remain evidence of the work.

My next phase will broaden beyond AWS and focus more heavily on generalized security engineering, including:

- Windows and Linux telemetry
- endpoint and host investigation
- network-security analysis
- Sigma detection rules
- vulnerability and configuration management
- security automation
- repeatable incident-response workflows

This cloud project will remain one specialization within that broader security-engineering direction.
