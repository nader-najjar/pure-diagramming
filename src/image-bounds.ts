export interface Bounds { x: number; y: number; width: number; height: number }
export const PNG_PIXEL_RATIO = 2;
/**
Keep text at its authored size, rather than shrinking a huge layout to illegibility.
*/
export function imageBounds(rectangles: Bounds[]): Bounds {
  if (rectangles.length === 0) throw new Error('Add a component before exporting an image.');
  if (
    rectangles.some(
      (rect) => Object.values(rect).some((value) => !Number.isFinite(value)) || rect.width < 0 || rect.height < 0
    )
  )
    throw new Error('The diagram is not ready to capture. Try again after it renders.');
  const x = Math.floor(Math.min(...rectangles.map((rect) => rect.x))) - 32;
  const y = Math.floor(Math.min(...rectangles.map((rect) => rect.y))) - 32;
  const width = Math.ceil(Math.max(...rectangles.map((rect) => rect.x + rect.width))) + 32 - x;
  const height = Math.ceil(Math.max(...rectangles.map((rect) => rect.y + rect.height))) + 32 - y;
  if (
    width * PNG_PIXEL_RATIO > 16_384
    || height * PNG_PIXEL_RATIO > 16_384
    || width * height * PNG_PIXEL_RATIO ** 2 > 32_000_000
  )
    throw new Error(
      'This layout exceeds the 32-megapixel / 16,384-pixel PNG limit. '
      + 'Bring distant components closer, or share the HTML/JSON instead.'
    );
  return { x, y, width, height };
}
