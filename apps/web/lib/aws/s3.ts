import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}

export function getS3Client(): S3Client {
  const region = process.env.AWS_REGION || 'us-east-1';
  const credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  } = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  };

  if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }

  return new S3Client({
    region,
    credentials,
  });
}

export interface S3UploadResult {
  s3Url: string;
  s3Key: string;
  bucket: string;
  filename: string;
  size: number;
  mimeType: string;
  isMockFallback?: boolean;
}

/**
 * Uploads an image to AWS S3 bucket.
 * If AWS S3 credentials are not yet configured in the environment,
 * returns a safe fallback object so local demo flows remain functional.
 */
export async function uploadImageToS3(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<S3UploadResult> {
  const size = buffer.length;

  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB.`);
  }

  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new Error(`Invalid file type "${mimeType}". Only PNG and JPEG/JPG images are allowed.`);
  }

  const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `archyve-assistant/${Date.now()}-${cleanFilename}`;
  const bucket = process.env.AWS_S3_BUCKET_NAME || 'archyve-assistant-uploads';
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!isS3Configured()) {
    console.warn(
      '[AWS S3] AWS_ACCESS_KEY_ID or AWS_S3_BUCKET_NAME not detected in environment. Using fallback mode.'
    );
    const base64Data = buffer.toString('base64');
    return {
      s3Url: `data:${normalizedMime};base64,${base64Data}`,
      s3Key,
      bucket,
      filename: originalFilename,
      size,
      mimeType: normalizedMime,
      isMockFallback: true,
    };
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: normalizedMime,
    // Add tags or metadata for academic audit trails
    Metadata: {
      'uploaded-by': 'archyve-assistant',
      'original-name': cleanFilename,
    },
  });

  await client.send(command);

  const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  return {
    s3Url,
    s3Key,
    bucket,
    filename: originalFilename,
    size,
    mimeType: normalizedMime,
    isMockFallback: false,
  };
}
