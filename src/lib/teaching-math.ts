import type { MathNode } from 'mathjs';

export type AngleMode = 'DEG' | 'RAD';
export interface PlotRange { xMin:number; xMax:number; yMin:number; yMax:number; }
export interface PlotPoint { x:number; y:number; }
export const GRAPH_PRESETS = [
  {label:'Sine',expression:'sin(x)',range:{xMin:-2*Math.PI,xMax:2*Math.PI,yMin:-2,yMax:2}},
  {label:'Cosine',expression:'cos(x)',range:{xMin:-2*Math.PI,xMax:2*Math.PI,yMin:-2,yMax:2}},
  {label:'Tangent',expression:'tan(x)',range:{xMin:-2*Math.PI,xMax:2*Math.PI,yMin:-4,yMax:4}},
  {label:'Linear',expression:'x',range:{xMin:-5,xMax:5,yMin:-5,yMax:5}},
  {label:'Quadratic',expression:'x^2',range:{xMin:-4,xMax:4,yMin:-2,yMax:16}},
  {label:'Cubic',expression:'x^3',range:{xMin:-3,xMax:3,yMin:-10,yMax:10}},
  {label:'Absolute value',expression:'abs(x)',range:{xMin:-5,xMax:5,yMin:-1,yMax:6}},
  {label:'Exponential',expression:'exp(x)',range:{xMin:-3,xMax:3,yMin:-1,yMax:10}},
  {label:'Logarithm',expression:'ln(x)',range:{xMin:0.1,xMax:10,yMin:-3,yMax:3}},
] as const;
export function formatMathNumber(value:number) {return String(Number(value.toPrecision(12)));}
function real(value:number):number {
  if (!Number.isFinite(value)) throw new Error('The result is undefined or outside the finite real-number range.');
  return value;
}
function factorial(value:number) {
  if (!Number.isInteger(value) || value<0 || value>170) throw new Error('Factorial needs a whole number from 0 to 170.');
  let result=1;for(let index=2;index<=value;index++)result*=index;return result;
}
function functions(mode:AngleMode):Record<string,{arity:number;run:(...args:number[])=>number}> {
  const angle=(value:number)=>mode==='DEG'?value*Math.PI/180:value;
  const inverse=(value:number)=>mode==='DEG'?value*180/Math.PI:value;
  return {
    sin:{arity:1,run:value=>Math.sin(angle(value))},cos:{arity:1,run:value=>Math.cos(angle(value))},
    tan:{arity:1,run:value=>{const radians=angle(value);if(Math.abs(Math.cos(radians))<1e-14)throw new Error('Tangent is undefined at this angle.');return Math.tan(radians);}},
    asin:{arity:1,run:value=>inverse(Math.asin(value))},acos:{arity:1,run:value=>inverse(Math.acos(value))},atan:{arity:1,run:value=>inverse(Math.atan(value))},
    sqrt:{arity:1,run:Math.sqrt},abs:{arity:1,run:Math.abs},ln:{arity:1,run:Math.log},log:{arity:1,run:Math.log10},log10:{arity:1,run:Math.log10},exp:{arity:1,run:Math.exp},
    pow:{arity:2,run:Math.pow},factorial:{arity:1,run:factorial},
  };
}
/** Use mathjs only to parse a small numeric AST; evaluate our allowlisted nodes ourselves.
 * No assignment, accessors, units, matrices, imported functions or general evaluation.
 * https://mathjs.org/docs/expressions/security.html
 */
export async function compileTeachingExpression(expression:string,options:{angleMode?:AngleMode;allowX?:boolean;answer?:number}={}) {
  const source=expression.trim().replace(/×/g,'*').replace(/÷/g,'/').replace(/π/g,'pi').replace(/−/g,'-');
  if (!source) throw new Error('Enter an expression first.');
  if (source.length>240) throw new Error('Keep expressions under 240 characters.');
  if (!/^[\dA-Za-z_\s.+\-*/^!(),]+$/.test(source)) throw new Error('Use numbers, arithmetic, parentheses and the supported functions.');
  let depth=0;for(const character of source){if(character==='('&&++depth>20)throw new Error('Use fewer nested parentheses.');if(character===')')depth--;}
  const {parse}=await import('mathjs');
  let node:MathNode;try {node=parse(source);}catch {throw new Error('Check the expression and close every parenthesis.');}
  const allowedFunctions=functions(options.angleMode??'RAD');
  const symbols:Record<string,number>={pi:Math.PI,e:Math.E,ans:options.answer??0};
  const operators=new Set(['add','subtract','multiply','divide','pow','unaryMinus','unaryPlus','factorial']);
  let count=0;
  node.traverse(part=>{
    if (++count>160)throw new Error('Use a shorter expression.');
    if (!['ConstantNode','SymbolNode','ParenthesisNode','OperatorNode','FunctionNode'].includes(part.type))throw new Error('Only numeric arithmetic and supported functions are allowed.');
    const record=part as MathNode & {name?:string;value?:unknown;fn?:string|MathNode;args?:MathNode[]};
    if (part.type==='ConstantNode' && (typeof record.value!=='number'||!Number.isFinite(record.value)))throw new Error('Use finite real numbers.');
    if (part.type==='SymbolNode' && !Object.hasOwn(symbols,record.name??'') && !(options.allowX&&record.name==='x') && !Object.hasOwn(allowedFunctions,record.name??''))throw new Error(`Unsupported name: ${record.name}. Use pi, e${options.allowX?', x':', ans'} and the scientific functions.`);
    if (part.type==='OperatorNode' && (typeof record.fn!=='string'||!operators.has(record.fn)))throw new Error('This operator is not supported. Use +, -, *, /, ^ or factorial (!).');
    if (part.type==='FunctionNode'){
      const functionNode=record.fn as MathNode & {name?:string};
      const definition=functionNode?.type==='SymbolNode'?allowedFunctions[functionNode.name??'']:undefined;
      if (!definition || record.args?.length!==definition.arity)throw new Error('Use supported scientific functions with the correct number of arguments.');
    }
  });
  function evaluate(part:MathNode,x?:number):number {
    const record=part as MathNode & {name:string;value:number;content:MathNode;fn:string|MathNode;args:MathNode[]};
    if (part.type==='ConstantNode')return record.value;
    if (part.type==='SymbolNode') {
      if (record.name==='x'&&options.allowX&&x!==undefined)return real(x);
      if (Object.hasOwn(symbols,record.name))return real(symbols[record.name]);
      throw new Error('Function names must be followed by parentheses.');
    }
    if (part.type==='ParenthesisNode')return evaluate(record.content,x);
    const args=record.args.map(argument=>evaluate(argument,x));
    if (part.type==='FunctionNode')return real(allowedFunctions[(record.fn as MathNode & {name:string}).name].run(...args));
    switch(record.fn){
      case 'add':return real(args[0]+args[1]);case 'subtract':return real(args[0]-args[1]);case 'multiply':return real(args[0]*args[1]);case 'divide':return real(args[0]/args[1]);case 'pow':return real(Math.pow(args[0],args[1]));case 'unaryMinus':return -args[0];case 'unaryPlus':return args[0];case 'factorial':return real(factorial(args[0]));
      default:throw new Error('Unsupported operator.');
    }
  }
  return (x?:number)=>evaluate(node,x);
}
export function validatePlotRange(range:PlotRange) {
  if (Object.values(range).some(value=>!Number.isFinite(value)||Math.abs(value)>1e6))throw new Error('Use finite range limits between -1,000,000 and 1,000,000.');
  if (range.xMax-range.xMin<1e-6||range.yMax-range.yMin<1e-6)throw new Error('Each maximum must be greater than its minimum by at least 0.000001.');
}
export function sampleTeachingGraph(evaluate:(x:number)=>number,range:PlotRange,samples=640):PlotPoint[][] {
  validatePlotRange(range);
  if (!Number.isInteger(samples)||samples<2||samples>2000)throw new Error('Use 2 to 2000 graph samples.');
  const segments:PlotPoint[][]=[];let current:PlotPoint[]=[];
  const ySpan=range.yMax-range.yMin;
  const sample=(x:number)=>{try{const y=evaluate(x);return Number.isFinite(y)&&y>=range.yMin&&y<=range.yMax?{x,y}:null;}catch{return null;}};
  for(let index=0;index<=samples;index++){
    const point=sample(range.xMin+(range.xMax-range.xMin)*index/samples);
    if (!point){if(current.length>1)segments.push(current);current=[];continue;}
    const previous=current.at(-1);
    if(previous){
      const midpoint=sample((point.x+previous.x)/2);
      // Break at out-of-range/domain gaps, large screen jumps, or curvature that
      // suggests a pole between samples. Never draw a line across a tan/1/x pole.
      if(!midpoint||Math.abs(point.y-previous.y)>ySpan/2||Math.abs(midpoint.y-(point.y+previous.y)/2)>ySpan/40){if(current.length>1)segments.push(current);current=[];}
    }
    current.push(point);
  }
  if(current.length>1)segments.push(current);
  return segments;
}
export function plotTicks(min:number,max:number) {
  const rough=(max-min)/8;const scale=10**Math.floor(Math.log10(rough));
  const factor=rough/scale;const step=(factor<=1?1:factor<=2?2:factor<=5?5:10)*scale;
  const ticks:number[]=[];
  for(let index=Math.ceil(min/step);index<=Math.floor(max/step)&&ticks.length<30;index++)ticks.push(Number((index*step).toPrecision(12)));
  return ticks;
}
