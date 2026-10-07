export function CommunityLinks() {
  return <nav aria-label="Kopy Notes community" className="rounded-xl border border-line p-4 text-left">
    <h3 className="mb-3 text-sm font-semibold">Community</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      <a href="https://www.producthunt.com/products/kopy-notes?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-kopy-notes" target="_blank" rel="noopener noreferrer" className="kn-focus flex min-h-11 items-center gap-3 rounded-lg border border-line bg-base px-3 py-2 text-sm hover:bg-elevated">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#da552f] font-bold text-white">P</span>
        <span>Product Hunt</span><span aria-hidden="true" className="ml-auto text-muted">↗</span>
      </a>
      <a href="https://www.reddit.com/r/kopynotes/" target="_blank" rel="noopener noreferrer" className="kn-focus flex min-h-11 items-center gap-3 rounded-lg border border-line bg-base px-3 py-2 text-sm hover:bg-elevated">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff4500] font-bold text-white">r/</span>
        <span>r/kopynotes</span><span aria-hidden="true" className="ml-auto text-muted">↗</span>
      </a>
    </div>
  </nav>;
}
