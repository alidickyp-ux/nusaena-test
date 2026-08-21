import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = 'nodejs';
// export const maxDuration = 30; // opsional

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'handover_photos',
          resource_type: 'image',
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve(result!);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      secure_url: result.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}