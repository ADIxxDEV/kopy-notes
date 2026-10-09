import {ELEMENTS} from './periodic-table';

function positive(value:number,name:string,allowZero=false) {
  if (!Number.isFinite(value)||(allowZero?value<0:value<=0)) throw new Error(`${name} must be ${allowZero?'zero or ':''}positive.`);
}

/** Ideal DC supply, two positive resistors, and a supply-side switch. */
export function resistorCircuit(voltage:number,r1:number,r2:number,parallel:boolean,closed:boolean) {
  positive(voltage,'Voltage',true);positive(r1,'Resistance');positive(r2,'Resistance');
  const resistance=parallel?1/(1/r1+1/r2):r1+r2;
  const current=closed?voltage/resistance:0;
  const currents=parallel?[closed?voltage/r1:0,closed?voltage/r2:0]:[current,current];
  const voltages=[currents[0]*r1,currents[1]*r2];
  return {resistance,current,currents,voltages,power:voltage*current};
}

/** Real object distance is positive; diverging focal lengths are negative. */
export function thinLens(focalLength:number,objectDistance:number) {
  positive(Math.abs(focalLength),'Focal length');positive(objectDistance,'Object distance');
  if (Math.abs(objectDistance-focalLength)<1e-8) return {distance:null,magnification:null,kind:'At infinity' as const};
  const distance=focalLength*objectDistance/(objectDistance-focalLength);
  return {distance,magnification:-distance/objectDistance,kind:distance>0?'Real, inverted' as const:'Virtual, upright' as const};
}

export function diluteSolution(molarity:number,initialMl:number,finalMl:number) {
  positive(molarity,'Concentration',true);positive(initialMl,'Initial volume');positive(finalMl,'Final volume');
  if(finalMl<initialMl)throw new Error('Final volume must be at least the initial volume.');
  return {moles:molarity*initialMl/1000,concentration:molarity*initialMl/finalMl,addedMl:finalMl-initialMl};
}

const symbols=new Set(ELEMENTS.map(element=>element.symbol));
export function parseChemicalFormula(formula:string):Record<string,number> {
  if(!formula||formula.length>120)throw new Error('Use a formula of 1–120 characters.');
  let index=0;
  function number() {
    const start=index;while(/\d/.test(formula[index]??''))index++;
    const n=start===index?1:Number(formula.slice(start,index));
    if(n<1||n>1000)throw new Error('Subscripts must be between 1 and 1000.');return n;
  }
  function group(depth:number):Record<string,number> {
    if(depth>6)throw new Error('Too many nested parentheses.');
    const result:Record<string,number>={};let count=0;
    const add=(items:Record<string,number>,multiple:number)=>{for(const [symbol,n] of Object.entries(items)){result[symbol]=(result[symbol]??0)+n*multiple;if(result[symbol]>1000000)throw new Error('Formula is too large.');}};
    while(index<formula.length&&formula[index]!==')') {
      count++;
      if(formula[index]==='('){index++;const inner=group(depth+1);if(formula[index++]!==')')throw new Error('Close every parenthesis.');add(inner,number());}
      else {const match=/^[A-Z][a-z]?/.exec(formula.slice(index));if(!match)throw new Error('Use neutral formulas, such as H2O or Ca(OH)2. Ions and hydrates are not supported.');const symbol=match[0];if(!symbols.has(symbol))throw new Error(`Unknown element: ${symbol}.`);index+=symbol.length;add({[symbol]:1},number());}
    }
    if(!count)throw new Error('Empty formulas or parentheses are not allowed.');return result;
  }
  const result=group(0);if(index!==formula.length)throw new Error('Unexpected closing parenthesis.');return result;
}

type Fraction={n:bigint;d:bigint};
function gcd(a:bigint,b:bigint):bigint {a=a<0n?-a:a;b=b<0n?-b:b;while(b){const next=a%b;a=b;b=next;}return a;}
function fraction(n:bigint,d=1n):Fraction {if(!d)throw new Error('Cannot balance this equation.');const divisor=gcd(n,d);return {n:n/divisor*(d<0n?-1n:1n),d:(d<0n?-d:d)/divisor};}
const subtract=(a:Fraction,b:Fraction)=>fraction(a.n*b.d-b.n*a.d,a.d*b.d);
const multiply=(a:Fraction,b:Fraction)=>fraction(a.n*b.n,a.d*b.d);
const divide=(a:Fraction,b:Fraction)=>fraction(a.n*b.d,a.d*b.n);

/** Exact rational elimination. Ambiguous reactions require the teacher to narrow the species. */
export function balanceChemicalEquation(input:string) {
  if(input.length>600)throw new Error('Keep the equation under 600 characters.');
  const normalized=input.replace(/[₀-₉]/g,char=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(char))).replace(/\s/g,'');
  const sides=normalized.split(/->|→|=/);
  if(sides.length!==2||!sides.every(Boolean))throw new Error('Separate reactants and products with →, -> or =.');
  const parts=sides.map(side=>side.split('+').map(part=>part.replace(/^\d+/,'')));
  const formulas=parts.flat();if(formulas.length>12)throw new Error('Use at most 12 compounds.');
  const atoms=formulas.map(parseChemicalFormula),elements=[...new Set(atoms.flatMap(Object.keys))];
  const rows=elements.map(element=>atoms.map((counts,i)=>fraction(BigInt((counts[element]??0)*(i<parts[0].length?1:-1)))));
  let row=0;const pivots:number[]=[];
  for(let col=0;col<formulas.length&&row<rows.length;col++) {
    const pivot=rows.findIndex((values,i)=>i>=row&&values[col].n!==0n);if(pivot<0)continue;
    [rows[row],rows[pivot]]=[rows[pivot],rows[row]];
    const value=rows[row][col];rows[row]=rows[row].map(v=>divide(v,value));
    for(let i=0;i<rows.length;i++)if(i!==row){const factor=rows[i][col];rows[i]=rows[i].map((v,j)=>subtract(v,multiply(factor,rows[row][j])));}
    pivots.push(col);row++;
  }
  const free=formulas.map((_,i)=>i).filter(i=>!pivots.includes(i));
  if(free.length!==1)throw new Error(free.length?'More than one balance is possible. Use fewer compounds.':'These reactants and products cannot be balanced.');
  const solution=formulas.map(()=>fraction(0n));solution[free[0]]=fraction(1n);
  pivots.forEach((col,i)=>{solution[col]=fraction(-rows[i][free[0]].n,rows[i][free[0]].d);});
  const denominator=solution.reduce((lcm,v)=>lcm/gcd(lcm,v.d)*v.d,1n);
  let integers=solution.map(v=>v.n*(denominator/v.d));const divisor=integers.reduce(gcd);integers=integers.map(n=>n/divisor);
  if(integers.every(n=>n<0n))integers=integers.map(n=>-n);
  if(integers.some(n=>n<=0n||n>1000000n))throw new Error('No positive balance within the supported coefficient range.');
  const coefficients=integers.map(Number),split=parts[0].length;
  const totals=elements.map(element=>({element,left:atoms.slice(0,split).reduce((n,a,i)=>n+(a[element]??0)*coefficients[i],0),right:atoms.slice(split).reduce((n,a,i)=>n+(a[element]??0)*coefficients[i+split],0)}));
  if(totals.some(t=>t.left!==t.right))throw new Error('Could not verify atom conservation.');
  const format=(start:number,end:number)=>formulas.slice(start,end).map((f,i)=>`${coefficients[start+i]===1?'':coefficients[start+i]+' '}${f}`).join(' + ');
  return {formulas,coefficients,split,totals,equation:`${format(0,split)} → ${format(split,formulas.length)}`};
}
