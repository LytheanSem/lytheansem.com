/**
 * The site's brand mark — the same leaf silhouette that falls in the WebGL
 * scene (see makeLeafGeometry in AutumnScene), traced as an SVG path.
 */
export default function LeafMark({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="-8 -11 16 22"
      className={className}
      style={style}
      aria-hidden
      fill="currentColor"
    >
      <path d="M 0 -10 Q 7.5 -2 1.5 10 Q 0 6 -1.5 10 Q -7.5 -2 0 -10 Z" />
    </svg>
  );
}
