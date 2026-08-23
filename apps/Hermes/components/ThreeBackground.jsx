export default function ThreeBackground({ className = '' }) {
  return <div className={`pointer-events-none absolute inset-0 mesh-bg ${className}`} aria-hidden="true" />;
}
