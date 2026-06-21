---
layout: post
title: "Cloud Security Skill-Building - Week 2"
date: 2026-03-13
description: "Building the foundation on cloud concepts and implementing them for reinforcing understanding"
---

## What I learned this week

This week, I focused on building my first real network boundary in AWS by setting up a Virtual Private Cloud (VPC). I also got an opportunity to work alongside a team that manages a **Salesforce cloud environment**, which gave me additional exposure to how cloud security controls show up in real systems.

My main goal for this week was to build a secure AWS setup where an EC2 instance runs in a **private subnet**, can be managed **without SSH**, and can still access **S3 privately** — including downloading objects encrypted with **server-side encryption using AWS Key Management Service (SSE-KMS)**.

---

## VPC Basics

A VPC is basically my own isolated network inside AWS. The part that really clicked for me is that **subnets are not “public” or “private” because of their name** — they become public or private based on how they are routed.

A subnet is “public” if it has a route to the internet (through an Internet Gateway).
A subnet is “private” if it does **not** have a route to the internet.

So the route table is what actually determines the security posture.

---

## What I built

### VPC + Subnets

I created a VPC:

- `10.0.0.0/16`

Then I created two subnets:

- Public subnet: `10.0.1.0/24`
- Private subnet: `10.0.2.0/24`

I attached an Internet Gateway (IGW) to the VPC and created two route tables:

**Public route table**

- `10.0.0.0/16 → local`
- `0.0.0.0/0 → Internet Gateway`

**Private route table**

- `10.0.0.0/16 → local`

Then I associated:

- public subnet → public route table
- private subnet → private route table

This gave me a real “inside vs outside” boundary.

---

## Private EC2 (No SSH, no inbound rules)

I launched an EC2 instance in the **private subnet** with:

- No public IP
- A security group with **no inbound rules**
- An IAM role (`LogReaderEC2Role`) for temporary credentials

Instead of SSH, I used:

- AWS Systems Manager Session Manager

This was a big shift in how I think about “secure admin access” because the goal wasn’t just “lock down SSH,” it was **remove the entire need for it**.

---

## Where things broke (and what it taught me)

In Week 1, my main issue was authorization:

- I had S3 permission but lacked KMS permission (`kms:Decrypt`).

This week’s issues were different:

- I could have correct IAM permissions and still fail if there’s **no network path** to the service.

So this week was less about “am I allowed?” and more about “can I even reach it?”

---

## Issue 1 — Session Manager wouldn’t connect

When I tried to connect via Session Manager, it didn’t work. The instance wasn’t showing properly in Systems Manager.

### Root cause

My private subnet had:

- no NAT gateway
- no VPC endpoints

So the instance had no path to reach Systems Manager.

### Fix

I created **Interface VPC Endpoints** for:

- `ssm`
- `ssmmessages`
- `ec2messages`

After that, Session Manager connected successfully without opening inbound ports.

---

## Issue 2 — STS calls hung with no output

Next, I ran:

- `aws sts get-caller-identity`

It just hung.

### Root cause

The instance couldn’t reach AWS Security Token Service (STS), which is required for the role credentials flow.

### Fix

I created an **Interface Endpoint** for:

- `com.amazonaws.us-west-2.sts`

After that, `aws sts get-caller-identity` returned my account/role identity, confirming the instance role credentials were working.

---

## Issue 3 — S3 commands hung

After that, commands like:

- `aws s3 ls`

hung indefinitely.

### Root cause

Private subnet had no route to S3. S3 commonly uses a **Gateway VPC Endpoint**, not an interface endpoint.

### Fix

I created an **S3 Gateway VPC Endpoint** and associated it with the private route table.

After that, I could list the bucket contents privately:

- `aws s3 ls s3://david-secure-logs-2026`

---

## Issue 4 — My private subnet wasn’t actually private

During debugging, I discovered my private subnet had been associated with the **public route table** at some point, which meant it effectively had:

- `0.0.0.0/0 → Internet Gateway`

### Fix

I re-associated the subnet with the private route table so it was truly private again.

This reinforced a big lesson:
route tables matter more than labels.

---

## Issue 5 — KMS AccessDenied (again, but now it made more sense)

When I finally tried to download an encrypted object from S3:

- `aws s3 cp s3://david-secure-logs-2026/upload-text.txt .`

I got:

- `AccessDenied` (not authorized to perform `kms:Decrypt`)

### Root cause

Same concept as Week 1:

Encrypted S3 objects require **two layers**:

- S3 authorization (`s3:GetObject`)
- KMS authorization (`kms:Decrypt`)

### Fix

I added a least-privilege inline policy allowing:

- `kms:Decrypt`

restricted to the specific KMS key.

After that, the object downloaded successfully.

---

## Final small issue — OS permissions

At the very end I hit:

- “Permission denied”

because I was accidentally writing into a protected directory.

Fix was simple:

- `cd ~` (or `/tmp`) and re-run the copy command.

---

## Final architecture (in plain terms)

By the end of the lab, I had:

- an EC2 instance in a **private subnet**
- no public IP
- no inbound ports
- no SSH
- private access to AWS services using **VPC endpoints**
- the ability to download **SSE-KMS encrypted objects** from S3

Everything stayed inside AWS networking, which is the security win.

---

## What I learned

This week taught me that cloud security isn’t just IAM permissions. It’s layers:

- Network path (can I reach the service?)
- Identity (do I have working credentials?)
- Authorization (do I have permission?)
- Encryption boundaries (do I also need KMS permission?)
- Host environment (am I writing files somewhere valid?)

It also taught me that architecture can reduce exposure without relying on “rules everywhere.”
Subnet placement, route tables, and public IP assignment can prevent whole categories of risk before they even exist.

---

This is still an ongoing journey, and the more I build these environments from scratch, the more I’m understanding how cloud security becomes real through implementation, not just theory.
