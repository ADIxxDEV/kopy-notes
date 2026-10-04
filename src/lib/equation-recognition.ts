export type EquationRecognitionSettings={enabled:boolean;endpoint:string;model:string};

export function equationEndpoint(value:string):URL{
  let endpoint:URL;
  try{endpoint=new URL(value);}catch{throw new Error('Enter the Ollama server URL in Settings.');}
  if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error('Use an HTTP or HTTPS server URL without credentials, a query or a fragment.');
  endpoint.pathname=endpoint.pathname.replace(/\/$/,'')+'/api/chat';return endpoint;
}

export function equationRequest(settings:EquationRecognitionSettings,image:string){
  if(!settings.enabled)throw new Error('Enable the Ollama assistant in Settings and choose an installed vision model first.');
  if(!settings.model.trim())throw new Error('Choose an installed Ollama model that supports images in Settings.');
  equationEndpoint(settings.endpoint);
  if(!image||image.length>1500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))throw new Error('The equation image is invalid or too large. Clear the pad and try again.');
  return {model:settings.model.trim(),stream:false,keep_alive:0,options:{temperature:0,num_predict:160},messages:[
    {role:'system',content:'Transcribe the handwritten equation from the image. Do not solve it. Return only one plain-text mathematical expression in mathjs syntax. Use ^ for powers, * for multiplication, / for fractions, sqrt(...) for roots. Preserve an equation with = when present. No LaTeX, Markdown, HTML or explanation. If any symbol cannot be read, return UNREADABLE instead of guessing.'},
    {role:'user',content:'Transcribe this handwritten equation exactly.',images:[image]},
  ]};
}

export function equationResponse(data:unknown):string{
  const content=(data as {message?:{content?:unknown}}|null)?.message?.content;
  if(typeof content!=='string'||!content.trim())throw new Error('The model returned no equation. Check that it supports images.');
  const result=content.trim().replace(/^```(?:math|text)?\s*\n?([\s\S]*?)\n?```$/,'$1').replace(/^`([^`]+)`$/,'$1').trim().replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');
  if(result.length>500||/<\/?[a-z][^>]*>/i.test(result))throw new Error('The model did not return a plain mathematical expression. Edit the result or try again.');
  if(/^UNREADABLE[.!]?$/i.test(result))throw new Error('The model could not read every symbol. Rewrite the equation more clearly or enter it yourself.');
  return result;
}

/** Parse without evaluation: equality sides are expressions, never assignments. */
export async function validateEquationExpression(value:string):Promise<string>{
  const expression=value.trim();
  if(!expression||expression.length>500)throw new Error('Enter an equation of at most 500 characters.');
  const sides=expression.split(/(?<![<>=!])=(?!=)/);
  if(sides.length>2||sides.some(side=>!side.trim()))throw new Error('Use one expression, or two expressions separated by =.');
  const {parse}=await import('mathjs');
  try{for(const side of sides){const node=parse(side);node.traverse(part=>{if(!['OperatorNode','ConstantNode','SymbolNode','FunctionNode','ParenthesisNode'].includes(part.type))throw new Error();});}}
  catch{throw new Error('Check the transcription. Use plain math syntax such as x^2 + 2*x = 3 or sqrt(x).');}
  return expression;
}

export async function recognizeEquation(settings:EquationRecognitionSettings,image:string,{signal,timeoutMs=120000,fetcher=fetch}:{signal?:AbortSignal;timeoutMs?:number;fetcher?:typeof fetch}={}):Promise<string>{
  const body=equationRequest(settings,image),endpoint=equationEndpoint(settings.endpoint);
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)controller.abort();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',redirect:'error',signal:controller.signal});
    const data:unknown=await response.json();
    if(!response.ok){const error=(data as {error?:unknown}|null)?.error;throw new Error(typeof error==='string'?`Ollama: ${error.slice(0,300)}. Check the installed model supports vision.`:`Ollama returned ${response.status}. Check the model and server settings.`);}
    return await validateEquationExpression(equationResponse(data));
  }catch(error){
    if(timedOut)throw new Error('Recognition timed out. Try a faster vision model or another Ollama server.');
    if(controller.signal.aborted)throw new DOMException('Recognition stopped.','AbortError');
    if(error instanceof TypeError)throw new Error('Cannot reach Ollama. Check the server address, browser origin permission and whether this page allows HTTP connections.');
    throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
