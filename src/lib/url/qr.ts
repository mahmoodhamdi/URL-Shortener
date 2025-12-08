import QRCode from 'qrcode';

export interface QrOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const defaultOptions: QrOptions = {
  width: 256,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
};

export async function generateQrDataUrl(url: string, options?: QrOptions): Promise<string> {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    color: {
      ...defaultOptions.color,
      ...options?.color,
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });
    return dataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQrSvg(url: string, options?: QrOptions): Promise<string> {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    color: {
      ...defaultOptions.color,
      ...options?.color,
    },
  };

  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });
    return svg;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQrBuffer(url: string, options?: QrOptions): Promise<Buffer> {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    color: {
      ...defaultOptions.color,
      ...options?.color,
    },
  };

  try {
    const buffer = await QRCode.toBuffer(url, {
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });
    return buffer;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}
