/**
 * `-webkit-line-clamp` often makes offsetHeight === scrollHeight even when text is
 * truncated, so compare a clamped clone against an unclamped clone instead.
 */
export default function isLineClampTruncated(
  element: HTMLElement,
  {
    lineClamp = 2,
  }: {
    lineClamp?: number,
  } = {},
): boolean {
  const width = element.getBoundingClientRect().width;

  if (width <= 0) return false;

  const computed = window.getComputedStyle(element);
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;';

  const applySharedStyles = (target: HTMLElement) => {
    target.style.width = `${width}px`;
    target.style.margin = '0';
    target.style.padding = '0';
    target.style.border = 'none';
    target.style.font = computed.font;
    target.style.letterSpacing = computed.letterSpacing;
    target.style.wordSpacing = computed.wordSpacing;
    target.style.whiteSpace = computed.whiteSpace;
    target.style.wordBreak = computed.wordBreak;
    target.style.overflowWrap = computed.overflowWrap;
    target.style.lineHeight = computed.lineHeight;
    target.style.boxSizing = 'border-box';
    target.textContent = element.textContent;
  };

  const clamped = document.createElement('div');
  applySharedStyles(clamped);
  clamped.style.display = '-webkit-box';
  clamped.style.overflow = 'hidden';
  clamped.style.textOverflow = 'ellipsis';
  clamped.style.webkitBoxOrient = 'vertical';
  clamped.style.webkitLineClamp = String(lineClamp);
  clamped.style.setProperty('line-clamp', String(lineClamp));

  const full = document.createElement('div');
  applySharedStyles(full);
  full.style.display = 'block';
  full.style.overflow = 'visible';

  host.append(clamped, full);
  document.body.append(host);

  const truncated = full.offsetHeight > clamped.offsetHeight + 1;

  host.remove();

  return truncated;
}
