import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToS3, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/aws/s3';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in form data' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please upload a smaller image.`,
        },
        { status: 400 }
      );
    }

    const mime = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      return NextResponse.json(
        {
          error: `Unsupported file format "${file.type}". Only PNG, JPG, and JPEG images are supported.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadImageToS3(buffer, file.name, mime);

    return NextResponse.json({
      success: true,
      ...uploadResult,
    });
  } catch (error: any) {
    console.error('Error handling assistant file upload to AWS S3:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image to AWS S3' },
      { status: 500 }
    );
  }
}
