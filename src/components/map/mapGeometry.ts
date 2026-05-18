/** Pixel rect of image drawn with object-fit: contain inside a container. */
export interface ContainRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getObjectContainRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): ContainRect {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

export function clientToMapPercent(
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
  imageRect: ContainRect
): { xPct: number; yPct: number } | null {
  const box = containerEl.getBoundingClientRect();
  const x = clientX - box.left - imageRect.left;
  const y = clientY - box.top - imageRect.top;
  if (imageRect.width <= 0 || imageRect.height <= 0) return null;
  if (x < 0 || y < 0 || x > imageRect.width || y > imageRect.height) return null;
  return {
    xPct: (x / imageRect.width) * 100,
    yPct: (y / imageRect.height) * 100,
  };
}

export function clampPct(v: number) {
  return Math.max(0, Math.min(100, v));
}
