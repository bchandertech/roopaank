import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ImageType = 'jpg' | 'png' | 'webp';

/**
 * Where product images live. Local disk now; S3 + CloudFront later (D11) by adding
 * another implementation of this interface.
 */
export interface ImageStorage {
  /** Stores the image and returns its public URL. */
  save(data: Buffer, type: ImageType): Promise<string>;
  /** Removes an image previously returned by `save`. Missing files are ignored. */
  remove(url: string): Promise<void>;
}

/**
 * Detects the real file type from its first bytes. The browser-supplied MIME type and file
 * name are not trusted, since anyone can send any value.
 */
export function detectImageType(data: Buffer): ImageType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

const PRODUCTS_DIR = 'products';

export function createLocalImageStorage(rootDir: string, publicBaseUrl: string): ImageStorage {
  const productsDir = path.resolve(rootDir, PRODUCTS_DIR);
  const urlPrefix = `${publicBaseUrl}/${PRODUCTS_DIR}/`;

  return {
    async save(data, type) {
      await mkdir(productsDir, { recursive: true });
      // Random names: never use the uploaded file name (path traversal, collisions).
      const fileName = `${randomUUID()}.${type}`;
      await writeFile(path.join(productsDir, fileName), data);
      return `${urlPrefix}${fileName}`;
    },

    async remove(url) {
      if (!url.startsWith(urlPrefix)) return;
      const fileName = path.basename(url.slice(urlPrefix.length));
      try {
        await unlink(path.join(productsDir, fileName));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    },
  };
}
