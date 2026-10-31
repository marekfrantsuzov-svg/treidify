/** Switching settings categories animates only the content; the header and category bar stay put. */
export default function SettingsTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
