export type Solution={volumeMl:number;acidMol:number;baseMol:number;spilledMl:number};
export type Reagent='Water'|'HCl'|'NaOH';
export type Indicator='Universal'|'Litmus'|'Phenolphthalein'|'None';
export const EMPTY_SOLUTION:Solution={volumeMl:0,acidMol:0,baseMol:0,spilledMl:0};
function valid(solution:Solution){if(!Object.values(solution).every(n=>Number.isFinite(n)&&n>=0)||solution.volumeMl>500||(!solution.volumeMl&&(solution.acidMol||solution.baseMol)))throw new Error('Invalid solution.');}
export function pourSolution(solution:Solution,reagent:Reagent,ml:number,molarity=.1,capacity=500):Solution {
  valid(solution);if(!Number.isFinite(capacity)||capacity<1||capacity>500)throw new Error('Invalid capacity.');if(!['Water','HCl','NaOH'].includes(reagent)||!Number.isFinite(ml)||ml<0||ml>500||!Number.isFinite(molarity)||molarity<0||molarity>1)throw new Error('Invalid reagent or amount.');
  const total=solution.volumeMl+ml,keep=total>capacity?capacity/total:1;
  return {volumeMl:Math.min(capacity,total),acidMol:(solution.acidMol+(reagent==='HCl'?molarity*ml/1000:0))*keep,baseMol:(solution.baseMol+(reagent==='NaOH'?molarity*ml/1000:0))*keep,spilledMl:solution.spilledMl+Math.max(0,total-capacity)};
}
export function drainSolution(solution:Solution,ml:number):Solution {
  valid(solution);if(!Number.isFinite(ml)||ml<0)throw new Error('Invalid drain amount.');
  const volumeMl=Math.max(0,solution.volumeMl-ml),keep=solution.volumeMl?volumeMl/solution.volumeMl:0;
  return {...solution,volumeMl,acidMol:solution.acidMol*keep,baseMol:solution.baseMol*keep};
}
export function solutionPH(solution:Solution):number|null {
  valid(solution);if(!solution.volumeMl)return null;
  const excess=(solution.acidMol-solution.baseMol)/(solution.volumeMl/1000),root=Math.sqrt(excess*excess+4e-14);
  const h=excess>=0?(excess+root)/2:2e-14/(root-excess);
  return -Math.log10(h);
}
export function indicatorColor(ph:number|null,indicator:Indicator,custom='#58a9df'):string {
  if(ph===null||indicator==='None')return custom;
  if(indicator==='Litmus')return ph<=4.5?'#e44c67':ph>=8.3?'#5063d5':'#9864bf';
  if(indicator==='Phenolphthalein')return ph<8.2?'#e5f3fa':ph<9?'#efa5c6':'#e845a3';
  const stops:[number,string][]=[[0,'#e54242'],[2,'#ea603e'],[4,'#efa62e'],[6,'#d5d93e'],[7,'#58b85c'],[8,'#2ea6a5'],[10,'#4676da'],[12,'#8762d7'],[14,'#b94aa3']];
  let i=0;while(i<stops.length-2&&ph>stops[i+1][0])i++;
  const [a,ca]=stops[i],[b,cb]=stops[i+1],t=Math.max(0,Math.min(1,(ph-a)/(b-a)));
  const rgb=(hex:string)=>[1,3,5].map(x=>parseInt(hex.slice(x,x+2),16)),left=rgb(ca),right=rgb(cb);
  return '#'+left.map((v,j)=>Math.round(v+(right[j]-v)*t).toString(16).padStart(2,'0')).join('');
}
