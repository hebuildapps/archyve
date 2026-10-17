# Archyve AWS Services Integration Guide
## AWS Bedrock & Amazon S3 Setup for College Presentation

This document provides a complete, step-by-step guide to setting up and running the AWS services integration in Archyve.

---

## 1. Architectural Overview

Archyve integrates two AWS core services:
1. **Amazon Bedrock (Converse API & Streaming):**
   - Foundation Model: `anthropic.claude-3-haiku-20240307-v1:0` (or `amazon.nova-lite-v1:0` / `amazon.titan-text-express-v1`).
   - Purpose: Powers the in-dossier research assistant with multi-turn conversation memory, full background access to paper metadata, abstract, open-access PDFs, GitHub repos, and citations.
   - Multimodal Vision: Directly ingests uploaded diagrams, equations, and charts to answer visual research questions.
2. **Amazon S3 (Simple Storage Service):**
   - Bucket: Blob storage for attached figure/diagram images (PNG, JPG, JPEG up to 5MB).
   - Generates persistent storage URLs for multimodal audit trails.

```
┌────────────────────────────────────────────────────────┐
│               Archyve Dossier Page                     │
│  - Text Selection Tooltip: "Add to assistant"          │
│  - Floating Bottom-Right Trigger: [Ctrl+I]             │
│  - Slide-in Assistant Sidebar (sequenced chat history) │
└───────────────────────┬────────────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  /api/assistant/upload   │    │   /api/assistant/chat    │
│  (Next.js App Router)    │    │  (Next.js App Router)    │
└──────────────┬───────────┘    └────────────┬─────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      Amazon S3           │    │      Amazon Bedrock      │
│  - PutObjectCommand      │    │  - ConverseStreamCommand │
│  - Image Blob Storage    │    │  - Full Dossier Context  │
│  - PNG/JPG <= 5MB        │    │  - Multi-Turn Memory     │
└──────────────────────────┘    └──────────────────────────┘
```

---

## 2. Step-by-Step AWS Console Setup

### Step 1: Enable Bedrock Model Access
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **Amazon Bedrock** and open the service.
3. In the left navigation menu, scroll down and click **Model access**.
4. Click the orange **Enable specific models** (or **Modify model access**) button on the top right.
5. Under **Anthropic**, check the box for:
   - ✅ **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
   *(Optional: Also check Amazon Nova Lite or Amazon Titan Text Express if desired)*.
6. Click **Next**, fill in the brief use-case form if prompted (e.g. "Academic research assistant presentation"), and click **Submit**.
7. Approval for Claude 3 Haiku is typically **immediate** (green "Access granted").

> 💡 **AWS Region Note:** Make sure your AWS console is set to a region where Bedrock is widely available, such as **`us-east-1` (N. Virginia)** or **`us-west-2` (Oregon)**.

---

### Step 2: Create IAM User & Access Keys
1. In the AWS console search bar, type **IAM** and navigate to **Users**.
2. Click **Create user**.
   - User name: `archyve-bedrock-assistant`
3. In the **Set permissions** step, choose **Attach policies directly**:
   - Check `AmazonBedrockFullAccess`
   - Check `AmazonS3FullAccess`
   *(For least-privilege production, you can restrict permissions to `bedrock:ConverseStream`, `bedrock:InvokeModel`, and `s3:PutObject` on your bucket)*.
4. Complete the user creation.
5. Click on your newly created user name, go to the **Security credentials** tab.
6. Scroll down to **Access keys** and click **Create access key**.
7. Select **Application running outside AWS** (or **Command Line Interface (CLI)**), click **Next**, and click **Create access key**.
8. **Copy both:**
   - **Access key ID** (e.g. `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key** (e.g. `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

> 🎓 **For AWS Academy / Learner Lab / AWS Educate Users:**
> If you are using a university-provided AWS Learner Lab:
> 1. In your Learner Lab window, click **AWS Details**.
> 2. Next to **AWS CLI**, click **Show**.
> 3. Copy `aws_access_key_id`, `aws_secret_access_key`, and `aws_session_token`.
> Archyve natively supports `AWS_SESSION_TOKEN`!

---

### Step 3: Create an Amazon S3 Bucket
1. In the AWS console search bar, type **S3** and click **Buckets**.
2. Click **Create bucket**.
   - **Bucket name:** `archyve-assistant-uploads-[your-name]` *(Must be globally unique, lowercase, no spaces)*
   - **AWS Region:** Select the same region as Bedrock (e.g. `us-east-1`).
   - **Block Public Access settings:** Keep defaults (or uncheck if you want public direct image viewing).
3. Click **Create bucket**.
4. *(Optional but Recommended for Image uploads)* Configure CORS on the bucket:
   - Click your bucket name -> **Permissions** tab -> Scroll down to **Cross-origin resource sharing (CORS)**.
   - Click **Edit** and paste this JSON:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
   - Click **Save changes**.

---

## 3. Configuring Environment Variables in Archyve

In `apps/web/.env` (or `apps/web/.env.local`), add the following environment variables:

```ini
# ─────────────────────────────────────
# AWS Services (Bedrock & S3)
# ─────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY_HERE

# (Optional: Required ONLY if using AWS Academy / Learner Lab session tokens)
# AWS_SESSION_TOKEN=YOUR_AWS_SESSION_TOKEN_HERE

# Amazon Bedrock Model ID (Default: Anthropic Claude 3 Haiku)
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Amazon S3 Bucket Name
AWS_S3_BUCKET_NAME=your-s3-bucket-name-here
```

> 🛡️ **Zero-Crash Presentation Safety:**
> Even if AWS credentials have not been configured yet on a machine, Archyve automatically activates **Presentation Demo Mode**. In this mode, the assistant still works, grounds its responses using the active dossier metadata, and displays a friendly configuration hint. Once AWS credentials are added, it instantly routes live to AWS Bedrock and AWS S3!

---

## 4. How to Run & Verify

1. Run the local development server:
   ```bash
   npm run dev
   ```
2. Open your browser at:
   `http://localhost:3000`
3. Search or navigate to any paper dossier (e.g. ArXiv, PubMed, or IEEE URL).
4. Observe the features:
   - **Floating Bottom Trigger:** In the bottom-right corner, notice the capsule bar with `"Ask a question..."`, `Ctrl+I`, and the green arrow.
   - **Keyboard Shortcut:** Press `Ctrl+I` (or `⌘I` on Mac) to open the Assistant sidebar.
   - **Text Selection Menubar:** Select any sentence or paragraph in the paper dossier. A floating badge `✨ Add to assistant` appears directly above the text. Click it to open the Assistant with the excerpt pinned in context!
   - **Sequential Multi-turn Querying:**
     - Turn 1: *"What are the key contributions of this paper?"*
     - Turn 2: *"Can you compare the second contribution with related baselines?"* (Notice how Bedrock cross-references Turn 1).
   - **Image Attachment (PNG/JPG <= 5MB):** Click the paperclip icon, select a diagram or screenshot from the paper, and ask: *"Analyze this figure in relation to the methodology"*. The image is uploaded to S3 and sent to Bedrock for multimodal inference.
   - **Typography & Links:** Notice true emdashes (`—`), code blocks with copy buttons, and clickable external links with badges.

---

## 5. College Presentation Talking Points

When presenting to your professors and evaluators, highlight these technical strengths:

1. **Context-Grounded Foundation Model Execution:**
   - Rather than sending a generic prompt to an LLM, Archyve automatically serializes the entire scraped and normalized research dossier (metadata, DOI, open-access preprint links, algorithmic contributions, GitHub implementations, citations) into the system prompt.
   - This prevents hallucinations and anchors responses directly to scientific facts.

2. **Multimodal Analysis via AWS Bedrock Converse API:**
   - Bedrock's unified `ConverseStreamCommand` handles both text blocks and binary image bytes natively in streaming mode.
   - Researchers can upload paper architecture diagrams or benchmark charts and query them directly.

3. **Enterprise Blob Storage via Amazon S3:**
   - User-uploaded figures are validated for MIME type (`image/png`, `image/jpeg`) and size limits (`≤ 5MB`), then streamed to Amazon S3 with collision-resistant timestamps.

4. **Interactive In-Situ Context Injection:**
   - The browser selection listener enables single-click quote extraction (`TextSelectionMenu`), bridging the reading experience directly into the AI assistant without tedious copy-pasting.
