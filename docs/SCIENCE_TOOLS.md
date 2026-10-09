# Classroom science tools

Open **Treasure box → Physics** or **Chemistry**. Searching for circuit, lens, voltage, reaction or dilution also finds the relevant lab. All calculations and diagrams run locally, without an account, API, network or new runtime dependency. Original diagrams and code are covered by this project's MIT license.

## Available experiments

| Tool | Classroom interaction | Model boundary |
| --- | --- | --- |
| Buoyancy | Change water volume, object mass and density; lower/lift the object and compare displacement and buoyant force | Ideal static fresh water; neutral density suspends the object. Fluid motion and container clearance are not simulated. |
| Circuits | Compare two resistors in series or parallel; change supply voltage and resistances; open/close the supply switch; read currents, voltages, equivalent resistance and power | Ideal DC source, positive resistors, ideal wires/meters. This is a two-resistor experiment, not a general circuit editor. |
| Lenses | Change converging/diverging lens, focal length and object distance; compare real/virtual images, magnification and ray paths | Thin lens and paraxial approximation. At the focal plane the image is at infinity. Diagram rescales; dashed lines are virtual extensions. |
| Equation balancing | Enter known reactants/products; balance to the smallest positive integer coefficients; inspect atom counts on both sides | Neutral formulas with nested parentheses. Exact rational arithmetic. Unsupported ions/hydrates and ambiguous or impossible balances show an explanation. Atom conservation does not establish whether a reaction occurs. |
| Dilution | Adjust stock concentration, stock volume and final volume; compare beakers, concentration and conserved solute | No chemical reaction or loss of solute. Final volume cannot be below stock volume. Colour is illustrative. Add solvent to the final volume mark. |
| Periodic table | Search 118 elements; inspect family and element details; insert element cards | The separate periodic table stays available alongside the new lab. |

Circuit, lens and dilution diagrams insert as a snapshot; balanced equations insert as editable board text. Snapshots are ordinary lesson images, not editable simulations. Switching between tabs preserves each experiment's values until the tool closes.

## Curtain

Open **Treasure box → Curtain**. The direction button cycles top/right/bottom/left. Drag the large boundary handle or adjust the coverage slider. Keyboard arrows on the handle move it in 5% increments. **Reveal all** removes the shade completely; **Cover all** restores it. Close or Escape dismisses the tool. Its controls remain inside the viewport after resizing; uncovered board space remains usable. The curtain is a presentation overlay and is not saved into lesson content or exported images.

## Next improvements, in priority order

1. **Forces and motion:** draggable force vectors with resultant/components, a friction-aware inclined plane, and a pendulum with explicit model assumptions.
2. **Circuit construction:** wire snapping, movable components and meters, and clear open/short-circuit diagnostics. Extend beyond the current two-resistor experiment only with network-solver tests.
3. **Atomic structure and molecules:** validated shell/electron data, adjustable molecular models and bond geometry. Avoid presenting decorative or invented structures as chemistry.
4. **Persistent experiments:** save parameters as editable lesson objects in `.kopy`, reopen a snapshot's controls, and restore undo/redo across parameter changes.
5. **Reusable teaching resources:** teacher-created experiment presets, searchable subject collections, and a documented contribution format with licensing and attribution.
6. **Presentation tools:** a movable rectangular answer cover, configurable curtain imagery and document-camera rotation/freeze/device selection.

These are planned work, not implemented features. Test real iPad, Android smartboard and Windows touch hardware before declaring device parity.

## References and verification

- [Official Note3 user guide](https://prod-cdn.prod.asbis.io/s3/cms/document/80/bc/80bcca968eba8ea466cacaa276a34a27/note3_user_guide.pdf): subject workflows and screen-cover reference. The science implementations are independent; theme artwork terms are documented in THIRD_PARTY.md.
- OpenStax: [series/parallel resistors](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel), [thin lenses](https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses), [balancing equations](https://openstax.org/books/chemistry-atoms-first/pages/7-1-writing-and-balancing-chemical-equations), [molarity and dilution](https://openstax.org/books/chemistry/pages/3-3-molarity). These informed the equations; illustrations and UI are original.
- `test/teaching-science.test.ts`: conservation, exact integer balances, focal-plane/virtual-image cases, invalid input and unsupported chemistry.
- `test/browser/science-tools.spec.ts`: offline use, changing experiments, board insertion, mobile layout and curtain dragging/reveal.
