export type InterfaceSettings={showFullscreen:boolean;showCustomize:boolean;showTime:boolean;showSlideControls:boolean;showMenu:boolean;showToolbar:boolean;flipToolsOnSwap:boolean;popupGap:number};
export function interfaceSettings(value:unknown):InterfaceSettings{
 const input=value&&typeof value==='object'?value as Partial<InterfaceSettings>:{};
 return{showFullscreen:input.showFullscreen!==false,showCustomize:input.showCustomize!==false,showTime:input.showTime!==false,showSlideControls:input.showSlideControls!==false,showMenu:input.showMenu!==false,showToolbar:input.showToolbar!==false,flipToolsOnSwap:input.flipToolsOnSwap===true,popupGap:typeof input.popupGap==='number'&&Number.isFinite(input.popupGap)?Math.max(0,Math.min(64,input.popupGap)):0};
}
