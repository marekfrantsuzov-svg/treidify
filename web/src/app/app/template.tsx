/** Re-mounts on every section change, so each page arrives with the same short fade and stagger. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-flow">{children}</div>;
}
