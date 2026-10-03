import { useState, type CSSProperties } from 'react';
import { CATEGORY_COLORS, ELEMENTS, elementCardSvg, searchElements, type ChemicalElement } from '@/lib/periodic-table';
import './PeriodicTable.css';

export function PeriodicTable({ onInsert }: { onInsert: (url:string,width:number,height:number)=>Promise<void> }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ChemicalElement>(ELEMENTS[0]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const matches = searchElements(query), matching = new Set(matches.map(element => element.atomicNumber));
  async function insert() {
    setBusy(true); setMessage('');
    try { await onInsert(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(elementCardSvg(selected))))}`,480,360); setMessage(`${selected.name} inserted on board.`); }
    catch { setMessage('Could not insert the element. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="periodic-tool" aria-label="Interactive periodic table">
    <label className="periodic-search">Find an element<input type="search" className="kn-focus" aria-label="Search elements" placeholder="Name, symbol, atomic number or family" value={query} onChange={event => setQuery(event.target.value)}/></label>
    {query.trim() && <div className="periodic-results"><p role="status">{matches.length} {matches.length === 1 ? 'element' : 'elements'} found</p><div>{matches.map(element => <button key={element.symbol} className="kn-focus" onClick={() => {setSelected(element);setMessage('');}}>{element.atomicNumber} · {element.symbol} · {element.name}</button>)}</div></div>}
    <div className="periodic-scroll" tabIndex={0} aria-label="Periodic table; scroll horizontally to explore all groups">
      <div className="periodic-grid">
        {Array.from({length:18},(_,index) => <span key={`group-${index}`} className="periodic-group" style={{gridColumn:index+1,gridRow:1}}>{index+1}</span>)}
        <span className="periodic-series" style={{gridColumn:3,gridRow:7}}>57–71<br/>↓</span><span className="periodic-series" style={{gridColumn:3,gridRow:8}}>89–103<br/>↓</span>
        <span className="periodic-series-label" style={{gridColumn:'1 / 4',gridRow:10}}>Lanthanoids</span><span className="periodic-series-label" style={{gridColumn:'1 / 4',gridRow:11}}>Actinoids</span>
        {ELEMENTS.map(element => <button key={element.symbol} title={`${element.name} · ${element.category}`} aria-label={`${element.atomicNumber} ${element.name} ${element.symbol}`} aria-pressed={selected.atomicNumber === element.atomicNumber} className={`periodic-cell kn-focus ${matching.has(element.atomicNumber) ? '' : 'periodic-dim'}`} style={{gridColumn:element.column,gridRow:element.row+1,'--element-color':CATEGORY_COLORS[element.category]} as CSSProperties} onClick={() => {setSelected(element);setMessage('');}}><small>{element.atomicNumber}</small><strong>{element.symbol}</strong><span>{element.name}</span></button>)}
      </div>
    </div>
    <article className="periodic-detail" aria-label="Selected element details" style={{'--element-color':CATEGORY_COLORS[selected.category]} as CSSProperties}>
      <div className="periodic-symbol" aria-hidden="true">{selected.symbol}</div><div><h3>{selected.name}</h3><p>Atomic number <strong>{selected.atomicNumber}</strong> · Period {selected.period}{selected.group === null ? ' · Detached series' : ` · Group ${selected.group}`}</p><p>{selected.category}</p></div><button className="kn-focus periodic-insert" disabled={busy} onClick={() => void insert()}>{busy ? 'Inserting…' : 'Insert element on board'}</button>
    </article>
    {message && <p role="status">{message}</p>}
    <details className="periodic-legend"><summary>Element families and source</summary><div>{Object.entries(CATEGORY_COLORS).map(([category,color]) => <span key={category}><i style={{background:color}}/>{category}</span>)}</div><p>Names, symbols and layout: IUPAC, 4 May 2022. Families use a conventional classroom grouping; boundaries vary between references. Superheavy metal properties are unclassified here. Lanthanoids and actinoids are shown as detached series.</p></details>
  </section>;
}
