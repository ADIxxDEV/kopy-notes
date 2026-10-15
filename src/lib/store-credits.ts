export type StoreCredits={author:string;addedBy:string;license?:string;source?:string;origin?:string};
export const KOPY_CREDITS:StoreCredits={author:'Kopy Notes contributors',addedBy:'Kopy Notes contributors',license:'MIT',source:'https://github.com/ADIxxDEV/kopy-notes'};
export const NOTE3_CREDITS:StoreCredits={author:'Note3 creators',addedBy:'Kopy Notes contributors',license:'Separate artwork terms; see THIRD_PARTY.md',origin:'Note3 artwork adapted for Kopy Notes'};
export function parseStoreCredits(value:unknown):StoreCredits|undefined{
 if(value===undefined)return undefined;if(!value||typeof value!=='object')throw new Error('Invalid creator credits.');const v=value as Record<string,unknown>;
 for(const key of ['author','addedBy'])if(typeof v[key]!=='string'||!(v[key] as string).trim()||(v[key] as string).length>120)throw new Error('Creator and added-by names must be 1 to 120 characters.');
 for(const key of ['license','origin'])if(v[key]!==undefined&&(typeof v[key]!=='string'||(v[key] as string).length>250))throw new Error('Invalid artwork credits.');
 if(v.source!==undefined){if(typeof v.source!=='string'||v.source.length>500)throw new Error('Invalid source link.');const url=new URL(v.source);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a public HTTP or HTTPS source link.');}
 return {author:(v.author as string).trim(),addedBy:(v.addedBy as string).trim(),...(typeof v.license==='string'?{license:v.license}:{}),...(typeof v.origin==='string'?{origin:v.origin}:{}),...(typeof v.source==='string'?{source:v.source}:{})};
}
