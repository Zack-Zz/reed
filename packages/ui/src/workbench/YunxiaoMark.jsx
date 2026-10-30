export function YunxiaoMark({ size = 24, decorative = true }) {
  return (
    <img
      className="yunxiao-mark"
      src="/assets/yunxiao-mark.svg"
      width={size}
      height={size}
      alt={decorative ? '' : '云效'}
      aria-hidden={decorative || undefined}
    />
  );
}
