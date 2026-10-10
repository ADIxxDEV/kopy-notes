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
    <section className="mt-4 border-t border-line pt-4" aria-label="Support Kopy Notes">
      <h3 className="mb-2 text-sm font-semibold">Support Kopy Notes</h3>
      <p className="mb-3 text-xs text-muted">Enjoy teaching with Kopy? You can support adixdev with a coffee.</p>
      <iframe title="Buy me a coffee button" src={`${import.meta.env.BASE_URL}coffee.html`} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" loading="lazy" className="mb-2 block max-w-full border-0" width="310" height="68"/>
      <a href="https://www.buymeacoffee.com/adixdev" target="_blank" rel="noopener noreferrer" aria-label="Buy adixdev a coffee" className="kn-focus inline-flex min-h-11 items-center rounded-lg border border-line bg-base p-2">
        Support adixdev
      </a>
    </section>
  </nav>;
}
