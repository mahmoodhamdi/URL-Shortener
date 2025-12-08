import { NextRequest, NextResponse } from 'next/server';
import { generateQrDataUrl } from '@/lib/url/qr';
import { z } from 'zod';

const qrSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  width: z.number().min(64).max(1024).optional(),
  margin: z.number().min(0).max(10).optional(),
  darkColor: z.string().optional(),
  lightColor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { url, width, margin, darkColor, lightColor } = qrSchema.parse(body);

    const dataUrl = await generateQrDataUrl(url, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('QR generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
