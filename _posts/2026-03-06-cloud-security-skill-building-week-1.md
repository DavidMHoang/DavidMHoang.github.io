---
layout: post
title: "Cloud Security Skill-Building - Week 1"
date: 2026-03-06
description: "Building the foundation on cloud concepts and implementing them for reinforcing understanding"
---

This is my first post after re-working the site and I plan to use this to share my journey with building my understanding of cloud fundamentals and become proficient enough to effectively incorporate my experience with security concepts and web development skills.

I recently completed my Master's in Cybersecurity and Information Assurance and wanted to shift my focus towards a specialized skill within the cybersecurity space. I chose to go with the cloud because it is a rapidly evolving space and there are always opportunities to learn something new.

I am taking the initiative to learn these skillsets to become a professional Security engineer specialized in the Cloud and aim to have this blog document what I learn each week.

---

## What I learned this week

### Cloud Service Provider

I ultimately ended up choosing Amazon Web Services (AWS) as my cloud service of choice because I want to learn cloud concepts _through_ a platform, not just learn the platform. I do know that other providers such as Microsoft Azure and Google Cloud Platform have their own unique services, but I stuck with a platform that I was already familiar with to efficiently learn.

---

## Topics I have explored

There are a lot of topics that cloud engineers should be aware of, such as:

- Identity and Access Management (IAM)
- Networking and Infrastructure Security
- Logging, Detection, Visibility
- Infrastructure as Code (IaC)
- Automation
- Cloud Security Architecture

This week I chose to focus on Identity and Access Management (IAM)

---

## IAM Topics

### What is IAM and how does it work?

Identity and Access Management is a set of controls that defines **who can do what in the cloud**. Instead of directly logging into servers, users interact with cloud services through permissions defined by IAM policies.

A good way for me to think about it would be roles on Discord, where server owners can design and assign moderators to do separate or collective tasks based on their role. All moderators can moderate the general chat, but you can have two roles where one is capable of banning, and another role to create or delete voice or text channels.

### This week's topics that I explored were:

- IAM users vs roles
- Policy structure
- Explicit and implicit deny
- Least privilege access
- Writing my own policy

---

## First attempt at creating my own policy

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLogReaderRoleListingProdBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::company-logs"],
      "Condition": {
        "StringLike": {
          "s3:prefix": ["prod/", "prod/*"]
        }
      }
    },
    {
      "Sid": "AllowLogReaderRoleGetProdBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::company-logs/prod/*"]
    },
    {
      "Sid": "AllowS3ToUseKeyToDecryptForThisBucket",
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": ["arn:aws:kms:<region>:<account-id>:key/<key-id>"],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-west-2.amazonaws.com"
        },
        "StringLike": {
          "kms:EncryptionContext:aws:s3:arn": [
            "arn:aws:s3:::company-logs",
            "arn:aws:s3:::company-logs/*"
          ]
        }
      }
    },
    {
      "Sid": "DenyLogReaderRoleGettingPrivateObjects",
      "Effect": "Deny",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::company-logs/prod/private/*"]
    },
    {
      "Sid": "DenyLogReaderRoleListingPrivateBuckets",
      "Effect": "Deny",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::company-logs"],
      "Condition": {
        "StringLike": {
          "s3:prefix": ["prod/private/", "prod/private/*"]
        }
      }
    },
    {
      "Sid": "DenyLogReaderRoleTLS",
      "Effect": "Deny",
      "Action": ["s3:ListBucket", "s3:GetObject"],
      "Resource": ["arn:aws:s3:::company-logs", "arn:aws:s3:::company-logs/*"],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}
```

Note: I utilize ChatGPT and other LLMs to help enhance my learning experience and ensure understanding of topics.

Creating the policy helped me learn:

- Explicit Deny always overrides Allow
- The smallest misconfiguration will cause issues, reinforcing precise scoping
  - This applies to resource types and logic

---

## AWS Environment

### Overview

I dove into the AWS console and set up a small secure AWS environment. I deployed an EC2 instance using an IAM role for temporary credentials and server-side encryption with AWS Key Management Service (SSE-KMS). I also incorporated network hardening by removing inbound traffic rules from security groups and disabled inbound SSH and used the AWS Systems Manager Session Manager for access.

### Encryption

For increasing the protection of data, using SSE-KMS encrypts objects at rest using a customer-managed KMS key. In order for an object to be accessed, reads will require both S3 permissions and KMS permissions. Data is also encrypted while in transit, due to the bucket policy enforcing secure transport requests. The bucket is only allowing HTTPS/TLS requests to go through and blocks incoming HTTP requests.

### Issues and Debugging

While testing the roles and permissions, I came across my first obstacle, which was a permission failure. Trying to download an object from the S3 bucket onto the local folder returned an error `"AccessDenied"` even though the role had `AmazonS3ReadOnlyAccess`. After doing a quick root cause analysis of the issue, I saw that the S3 bucket was encrypted with the SSE-KMS, but the role did not have the permission to decrypt, only just the `s3:GetObject`. I added a least-privilege KMS permission `kms:Decrypt` and restricted it to a specific KMS key and S3 bucket and the service via `kms:ViaService`. After adding the permission, I was able to resolve and successfully download the object to the local folder.

### What I learned

I learned that AWS services have multiple authorization layers and that precise detail is required. In this instance, it's that encrypted S3 objects require **both** S3 authorization and KMS authorization for a successful object read. If either of them are not present, then the access will be denied.

---

This will be an ongoing journey, and one I'm excited about because it motivates me to work towards strengthening my understanding and skills, and pushing me beyond my boundaries to share what I learn along the way.
