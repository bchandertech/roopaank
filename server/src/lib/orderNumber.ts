const ORDER_NUMBER_PREFIX = "RPK-";
const ORDER_NUMBER_PATTERN = /^RPK-(\d+)$/i;

/** Formats Order.orderSeq as a human-readable order number, e.g. 10001 -> "RPK-10001". */
export function formatOrderNumber(orderSeq: number): string {
  return `${ORDER_NUMBER_PREFIX}${orderSeq}`;
}

/**
 * Parses "RPK-10001" (case-insensitive, surrounding spaces ignored) to 10001, or null if invalid.
 *
 * Track Order requirements (endpoint not built yet):
 * - Check for null BEFORE querying; never pass null into `where: { orderSeq }`. Return "not found".
 * - Order numbers are sequential and guessable, so never return an order by number alone:
 *   logged-in users only get orders where order.userId matches them; public tracking needs
 *   order number + phone (or email) and both must match.
 * - A wrong number and a wrong phone/email must return the same generic "not found".
 */
export function parseOrderNumber(value: string): number | null {
  const match = ORDER_NUMBER_PATTERN.exec(value.trim());
  if (!match) return null;
  const seq = Number(match[1]);
  return Number.isSafeInteger(seq) && seq > 0 && seq <= 2147483647 ? seq : null;
}
