export interface NewsletterCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface NewsletterCropInset {
  x: number;
  y: number;
}
export type NewsletterCropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const bound = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Crops use percentages of the oriented image plane, before output resizing. */
export function newsletterImagePlane(
  width: number,
  height: number,
  rotation: number,
  quarterTurns = Math.round(rotation / 90),
) {
  const sideways = Math.abs(quarterTurns % 2) === 1;
  const planeWidth = sideways ? height : width;
  const planeHeight = sideways ? width : height;
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  // Inverse-transform the output corners. Cover both source axes, rather than
  // fitting the rotated bounding box, which would introduce transparent edges.
  const cover = Math.max(
    (planeWidth * cosine + planeHeight * sine) / width,
    (planeWidth * sine + planeHeight * cosine) / height,
  );
  return { width: planeWidth, height: planeHeight, radians, cover };
}

export function rotateNewsletterCrop(crop: NewsletterCropRect, clockwise: boolean) {
  return clockwise
    ? { x: 100 - crop.y - crop.height, y: crop.x, width: crop.height, height: crop.width }
    : { x: crop.y, y: 100 - crop.x - crop.width, width: crop.height, height: crop.width };
}

export function moveNewsletterCrop(crop: NewsletterCropRect, dx: number, dy: number) {
  return {
    ...crop,
    x: bound(crop.x + dx, 0, 100 - crop.width),
    y: bound(crop.y + dy, 0, 100 - crop.height),
  };
}

/** Resize around the opposite edge/corner; locked side handles keep their center. */
export function resizeNewsletterCrop(
  crop: NewsletterCropRect,
  handle: NewsletterCropHandle,
  dx: number,
  dy: number,
  locked: boolean,
  inset: NewsletterCropInset = { x: 0, y: 0 },
): NewsletterCropRect {
  const horizontal = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
  const vertical = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
  const anchorX = crop.x + (horizontal < 0 ? crop.width : horizontal > 0 ? 0 : crop.width / 2);
  const anchorY = crop.y + (vertical < 0 ? crop.height : vertical > 0 ? 0 : crop.height / 2);
  const maxWidth = horizontal
    ? horizontal < 0
      ? anchorX
      : 100 - anchorX
    : 2 * Math.min(anchorX, 100 - anchorX);
  const maxHeight = vertical
    ? vertical < 0
      ? anchorY
      : 100 - anchorY
    : 2 * Math.min(anchorY, 100 - anchorY);
  let width = crop.width + horizontal * dx;
  let height = crop.height + vertical * dy;
  if (locked) {
    // Inline cropping constrains the distance between corner-handle centers.
    // The photo editor's edge-centered handles use the default zero inset.
    const offsetWidth = Math.max(0, Math.min(2 * inset.x, crop.width - 1, maxWidth - 1));
    const offsetHeight = Math.max(0, Math.min(2 * inset.y, crop.height - 1, maxHeight - 1));
    const innerWidth = crop.width - offsetWidth;
    const innerHeight = crop.height - offsetHeight;
    const ratio = innerWidth / innerHeight;
    if (
      !horizontal ||
      (vertical &&
        Math.abs((height - offsetHeight) / innerHeight - 1) >
          Math.abs((width - offsetWidth) / innerWidth - 1))
    )
      width = (height - offsetHeight) * ratio + offsetWidth;
    width =
      bound(
        width - offsetWidth,
        Math.min(Math.max(1, ratio), maxWidth - offsetWidth, (maxHeight - offsetHeight) * ratio),
        Math.min(maxWidth - offsetWidth, (maxHeight - offsetHeight) * ratio),
      ) + offsetWidth;
    height = (width - offsetWidth) / ratio + offsetHeight;
  } else {
    width = bound(width, 1, maxWidth);
    height = bound(height, 1, maxHeight);
  }
  return {
    x: anchorX - (horizontal < 0 ? width : horizontal > 0 ? 0 : width / 2),
    y: anchorY - (vertical < 0 ? height : vertical > 0 ? 0 : height / 2),
    width,
    height,
  };
}
