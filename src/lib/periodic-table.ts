/** Names, symbols, numbering and 18-column layout: IUPAC table, 4 May 2022.
 * https://iupac.org/wp-content/uploads/2022/07/IUPAC_Periodic_Table-04May22_CRA.pdf
 * Categories are conventional classroom families, not predictions of physical properties.
 * All La–Lu and Ac–Lr are detached, avoiding an assertion about group 3 membership.
 */
export type ElementCategory = 'Alkali metal' | 'Alkaline earth metal' | 'Transition metal' | 'Post-transition metal' | 'Metalloid' | 'Other nonmetal' | 'Halogen family' | 'Noble gas family' | 'Lanthanoid' | 'Actinoid' | 'Unclassified';
export interface ChemicalElement { atomicNumber: number; symbol: string; name: string; period: number; group: number | null; row: number; column: number; category: ElementCategory; }
const identities = `H Hydrogen,He Helium,Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon,Na Sodium,Mg Magnesium,Al Aluminium,Si Silicon,P Phosphorus,S Sulfur,Cl Chlorine,Ar Argon,K Potassium,Ca Calcium,Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton,Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,Sb Antimony,Te Tellurium,I Iodine,Xe Xenon,Cs Caesium,Ba Barium,La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium,Pm Promethium,Sm Samarium,Eu Europium,Gd Gadolinium,Tb Terbium,Dy Dysprosium,Ho Holmium,Er Erbium,Tm Thulium,Yb Ytterbium,Lu Lutetium,Hf Hafnium,Ta Tantalum,W Tungsten,Re Rhenium,Os Osmium,Ir Iridium,Pt Platinum,Au Gold,Hg Mercury,Tl Thallium,Pb Lead,Bi Bismuth,Po Polonium,At Astatine,Rn Radon,Fr Francium,Ra Radium,Ac Actinium,Th Thorium,Pa Protactinium,U Uranium,Np Neptunium,Pu Plutonium,Am Americium,Cm Curium,Bk Berkelium,Cf Californium,Es Einsteinium,Fm Fermium,Md Mendelevium,No Nobelium,Lr Lawrencium,Rf Rutherfordium,Db Dubnium,Sg Seaborgium,Bh Bohrium,Hs Hassium,Mt Meitnerium,Ds Darmstadtium,Rg Roentgenium,Cn Copernicium,Nh Nihonium,Fl Flerovium,Mc Moscovium,Lv Livermorium,Ts Tennessine,Og Oganesson`;
const periods = [1, 3, 11, 19, 37, 55, 87];
export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  'Alkali metal':'#ffd6ae', 'Alkaline earth metal':'#ffeaa6', 'Transition metal':'#cce3f8', 'Post-transition metal':'#d9dcf6', Metalloid:'#b9e4db', 'Other nonmetal':'#ccebbb', 'Halogen family':'#f8d2e7', 'Noble gas family':'#ddd2fa', Lanthanoid:'#f6dcc1', Actinoid:'#efd0c9', Unclassified:'#e1e5ea',
};
export const ELEMENTS: readonly ChemicalElement[] = identities.split(',').map((identity, index) => {
  const atomicNumber = index + 1;
  const [symbol, name] = identity.split(' ');
  const period = periods.filter(start => start <= atomicNumber).length;
  const lanthanoid = atomicNumber >= 57 && atomicNumber <= 71;
  const actinoid = atomicNumber >= 89 && atomicNumber <= 103;
  const offset = atomicNumber - periods[period - 1];
  const group = lanthanoid || actinoid ? null : period === 1 ? (atomicNumber === 1 ? 1 : 18) : period <= 3 ? (offset < 2 ? offset + 1 : offset + 11) : period >= 6 && offset >= 17 ? offset - 13 : offset + 1;
  let category: ElementCategory = 'Unclassified';
  if (lanthanoid) category = 'Lanthanoid';
  else if (actinoid) category = 'Actinoid';
  else if (atomicNumber === 1 || [6,7,8,15,16,34].includes(atomicNumber)) category = 'Other nonmetal';
  else if (group === 1) category = 'Alkali metal';
  else if (group === 2) category = 'Alkaline earth metal';
  else if (group === 17) category = 'Halogen family';
  else if (group === 18) category = 'Noble gas family';
  else if ([5,14,32,33,51,52].includes(atomicNumber)) category = 'Metalloid';
  else if ([13,31,49,50,81,82,83,84].includes(atomicNumber)) category = 'Post-transition metal';
  else if (group !== null && group >= 3 && group <= 12 && atomicNumber <= 108) category = 'Transition metal';
  return { atomicNumber, symbol, name, period, group, category, row:lanthanoid ? 9 : actinoid ? 10 : period, column:lanthanoid ? atomicNumber - 53 : actinoid ? atomicNumber - 85 : group! };
});
export function searchElements(query: string): readonly ChemicalElement[] {
  const normalized = query.trim().toLowerCase().replace('aluminum','aluminium').replace('cesium','caesium');
  return ELEMENTS.filter(element => !normalized || element.symbol.toLowerCase() === normalized || element.name.toLowerCase().includes(normalized) || String(element.atomicNumber) === normalized || element.category.toLowerCase().includes(normalized));
}
export function elementCardSvg(element: ChemicalElement): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" rx="24" fill="${CATEGORY_COLORS[element.category]}"/><g fill="#172532" font-family="Arial, sans-serif"><text x="30" y="48" font-size="24">Atomic number ${element.atomicNumber}</text><text x="240" y="173" text-anchor="middle" font-size="110" font-weight="bold">${element.symbol}</text><text x="240" y="229" text-anchor="middle" font-size="32">${element.name}</text><text x="240" y="276" text-anchor="middle" font-size="20">${element.category}</text><text x="240" y="317" text-anchor="middle" font-size="18">Period ${element.period}${element.group === null ? ' · Detached series' : ` · Group ${element.group}`}</text></g></svg>`;
}
