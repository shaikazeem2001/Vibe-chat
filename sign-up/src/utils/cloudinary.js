import { Cloudinary } from '@cloudinary/url-gen';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { scale, thumbnail } from '@cloudinary/url-gen/actions/resize';

// Initialise once — reads from Vite env
const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  },
});

/**
 * Extract the Cloudinary public_id from a full Cloudinary URL.
 * Returns null for non-Cloudinary URLs so callers can fall back to raw src.
 */
export function extractPublicId(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]{2,4})?$/i);
  return match ? match[1] : null;
}

/**
 * Optimised image URL: f_auto (WebP/AVIF) + q_auto:good + width scale.
 */
export function optimiseImage(publicId, width = 800) {
  return cld
    .image(publicId)
    .delivery(format('auto'))
    .delivery(quality('auto:good'))
    .resize(scale().width(width))
    .toURL();
}

/**
 * Face-cropped avatar thumbnail (max 96px, q_auto:low).
 */
export function avatarUrl(publicId, size = 96) {
  return cld
    .image(publicId)
    .resize(thumbnail().width(size).height(size).gravity('face'))
    .delivery(format('auto'))
    .delivery(quality('auto:low'))
    .toURL();
}

/**
 * Blurred tiny placeholder for progressive loading.
 */
export function blurPlaceholder(publicId) {
  return cld
    .image(publicId)
    .resize(scale().width(20))
    .delivery(format('auto'))
    .toURL();
}

/**
 * srcSet string for responsive <img> elements.
 */
export function buildSrcSet(publicId, widths = [400, 800, 1200]) {
  return widths.map(w => `${optimiseImage(publicId, w)} ${w}w`).join(', ');
}
