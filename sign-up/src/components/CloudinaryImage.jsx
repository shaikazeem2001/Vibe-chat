import React, { useState } from 'react';
import { extractPublicId, optimiseImage, buildSrcSet, blurPlaceholder } from '../utils/cloudinary';

/**
 * A drop-in <img> replacement for Cloudinary-hosted images.
 *
 * Features:
 *  - f_auto / q_auto for WebP/AVIF delivery
 *  - Responsive srcSet at 400/800/1200 w
 *  - Progressive blur placeholder while loading
 *  - Native lazy loading + async decoding
 *  - Falls back to raw `src` if not a Cloudinary URL
 *
 * Usage:
 *   <CloudinaryImage src={user.avatarUrl} alt="User avatar" width={800} />
 *
 * Props:
 *   src        {string}  - Full Cloudinary URL (or any image URL as fallback)
 *   alt        {string}  - Accessible alt text
 *   width      {number}  - Largest rendered width hint (default 800)
 *   sizes      {string}  - CSS sizes attribute (default auto-detect)
 *   className  {string}  - Additional CSS classes
 *   style      {object}  - Inline styles
 *   eager      {boolean} - Set to true for LCP images (disables lazy loading)
 */
const CloudinaryImage = ({
  src,
  alt = '',
  width = 800,
  sizes = '(max-width: 600px) 100vw, 800px',
  className = '',
  style = {},
  eager = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const publicId = extractPublicId(src);

  // Not a Cloudinary URL — render plain img with lazy load only
  if (!publicId) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  const placeholder = blurPlaceholder(publicId);
  const fullSrc = optimiseImage(publicId, width);
  const srcSet = buildSrcSet(publicId);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', ...style }}>
      {/* Blurred placeholder — hidden once main image loads */}
      {!loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(12px)',
            transform: 'scale(1.05)', // prevent blur edges showing
          }}
        />
      )}

      {/* Main optimised image */}
      <img
        src={fullSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          display: 'block',
          transition: 'opacity 0.4s ease',
          opacity: loaded ? 1 : 0,
        }}
      />
    </div>
  );
};

export default CloudinaryImage;
