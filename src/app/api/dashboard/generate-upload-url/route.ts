import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!

interface GenerateUploadUrlBody {
  filename: string;
  contentType: string;
}

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json() as GenerateUploadUrlBody;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Faltan los parámetros filename y contentType' }, { status: 400 })
    }

    const uniqueKey = `uploads/${uuidv4()}-${filename}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
    })

    // La URL expira en 10 minutos
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 })

    return NextResponse.json({
      success: true,
      uploadUrl,
      key: uniqueKey,
    })
  } catch (error) {
    console.error('Error generando URL pre-firmada:', error)
    return NextResponse.json({ error: 'No se pudo generar la URL de subida' }, { status: 500 })
  }
} 