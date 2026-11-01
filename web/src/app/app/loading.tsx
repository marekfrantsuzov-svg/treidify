/** Shown while an app page loads its data. Shapes match the dashboard so nothing jumps. */
export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="flex gap-4 overflow-hidden lg:hidden">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[54px] w-[54px] shrink-0 rounded-[16px]" />)}
      </div>
      <div className="skeleton h-4 w-48 rounded-full" />
      <div className="skeleton h-56 rounded-[24px]" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[112px] rounded-[24px]" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-60 rounded-[24px]" />)}
      </div>
    </div>
  );
}
