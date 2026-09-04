/** A finite JWT NumericDate that can also be represented by the browser's Date API. */
export function isNumericDate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8_640_000_000_000
}
