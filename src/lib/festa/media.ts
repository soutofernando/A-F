export const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 45 * 1024 * 1024;

export type FestaMedia = {
  ext: string;
  contentType: string;
  mediaType: 'image' | 'video';
};

const BY_EXT: Record<string, FestaMedia> = {
  jpg: { ext: 'jpg', contentType: 'image/jpeg', mediaType: 'image' },
  jpeg: { ext: 'jpg', contentType: 'image/jpeg', mediaType: 'image' },
  png: { ext: 'png', contentType: 'image/png', mediaType: 'image' },
  webp: { ext: 'webp', contentType: 'image/webp', mediaType: 'image' },
  gif: { ext: 'gif', contentType: 'image/gif', mediaType: 'image' },
  heic: { ext: 'heic', contentType: 'image/heic', mediaType: 'image' },
  heif: { ext: 'heif', contentType: 'image/heif', mediaType: 'image' },
  mp4: { ext: 'mp4', contentType: 'video/mp4', mediaType: 'video' },
  mov: { ext: 'mov', contentType: 'video/quicktime', mediaType: 'video' },
  webm: { ext: 'webm', contentType: 'video/webm', mediaType: 'video' },
};

const BY_TYPE: Record<string, FestaMedia> = {
  'image/jpeg': BY_EXT.jpg,
  'image/jpg': BY_EXT.jpg,
  'image/png': BY_EXT.png,
  'image/webp': BY_EXT.webp,
  'image/gif': BY_EXT.gif,
  'image/heic': BY_EXT.heic,
  'image/heif': BY_EXT.heif,
  'video/mp4': BY_EXT.mp4,
  'video/quicktime': BY_EXT.mov,
  'video/webm': BY_EXT.webm,
};

export function mediaFromName(fileName: string): FestaMedia | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return BY_EXT[ext] ?? null;
}

export function mediaFromFile(file: { name: string; type: string }): FestaMedia | null {
  return mediaFromName(file.name) ?? BY_TYPE[file.type.toLowerCase()] ?? null;
}

export function festaImageUrl(fileId: string, width = 1600) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${width}`;
}

export function festaVideoEmbed(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}
