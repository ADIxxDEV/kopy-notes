export function editKeyboardText(value:string,start:number,end:number,key:string,maxLength=-1){
 start=Math.max(0,Math.min(value.length,start));end=Math.max(start,Math.min(value.length,end));
 if(key==='{bksp}'){if(start===end&&start>0){const before=Array.from(value.slice(0,start));start-=before.at(-1)!.length;}return{value:value.slice(0,start)+value.slice(end),caret:start};}
 const text=key==='{space}'?' ':key==='{enter}'?'\n':key;
 const room=maxLength<0?Infinity:Math.max(0,maxLength-(value.length-(end-start)));
 const inserted=Array.from(text).reduce((out,char)=>out.length+char.length<=room?out+char:out,'');
 return{value:value.slice(0,start)+inserted+value.slice(end),caret:start+inserted.length};
}
