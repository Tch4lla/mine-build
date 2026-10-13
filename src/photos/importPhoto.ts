/** Turning real photos (files, drag-and-drop, webcam) into compact images for the world. */

export const MAX_PHOTO_SIDE = 1024;

/** Scales (w, h) down to fit within `max` on the longest side, keeping the aspect ratio. Never upscales. */
export function fitWithin(w: number, h: number, max = MAX_PHOTO_SIDE): { w: number; h: number } {
  if (w <= 0 || h <= 0) throw new Error('Invalid image size');
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Size in blocks of a frame whose longest side is `size` blocks. */
export function frameDimensions(photoW: number, photoH: number, size: number): { w: number; h: number } {
  return photoW >= photoH
    ? { w: size, h: (size * photoH) / photoW }
    : { w: (size * photoW) / photoH, h: size };
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const tryType = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, q));
  const webp = await tryType('image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const jpg = await tryType('image/jpeg', 0.88);
  if (!jpg) throw new Error('Could not encode image');
  return jpg;
}

function drawToCanvas(source: CanvasImageSource, sw: number, sh: number): HTMLCanvasElement {
  const { w, h } = fitWithin(sw, sh);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

/** Decodes an image file (respecting EXIF orientation) and downsizes it. */
export async function processImageFile(file: Blob): Promise<{ blob: Blob; w: number; h: number }> {
  if (!file.type.startsWith('image/')) throw new Error(`Not an image: ${file.type || 'unknown type'}`);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = drawToCanvas(bitmap, bitmap.width, bitmap.height);
  bitmap.close();
  return { blob: await canvasToBlob(canvas), w: canvas.width, h: canvas.height };
}

/** Opens the webcam into a <video> element. Call the returned function to stop it. */
export async function startWebcam(video: HTMLVideoElement): Promise<() => void> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not available in this browser');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return () => {
    for (const t of stream.getTracks()) t.stop();
    video.srcObject = null;
  };
}

/** Grabs the current webcam frame (mirrored like a selfie preview). */
export async function captureWebcam(
  video: HTMLVideoElement,
  mirror = true,
): Promise<{ blob: Blob; w: number; h: number }> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error('Camera is not ready yet');
  const src = document.createElement('canvas');
  src.width = vw;
  src.height = vh;
  const ctx = src.getContext('2d')!;
  if (mirror) {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, vw, vh);
  const canvas = drawToCanvas(src, vw, vh);
  return { blob: await canvasToBlob(canvas), w: canvas.width, h: canvas.height };
}
