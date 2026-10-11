export type DockEdge='auto'|'bottom'|'top'|'left'|'right';
export type InterfaceSettings={menuEdge:DockEdge;slidesEdge:DockEdge;showFullscreen:boolean;showCustomize:boolean;showTime:boolean;showSlideControls:boolean;showMenu:boolean;showToolbar:boolean;flipToolsOnSwap:boolean;flipMenuOnSwap:boolean;toolPopupOnFirstClick:boolean;popupGap:number};
export function interfaceSettings(value:unknown):InterfaceSettings{
 const input=value&&typeof value==='object'?value as Partial<InterfaceSettings>:{};
 const edge=(v:unknown):DockEdge=>["bottom","top","left","right"].includes(String(v))?v as DockEdge:"auto";
 return{menuEdge:edge(input.menuEdge),slidesEdge:edge(input.slidesEdge),toolPopupOnFirstClick:input.toolPopupOnFirstClick===true,showFullscreen:input.showFullscreen!==false,showCustomize:input.showCustomize!==false,showTime:input.showTime!==false,showSlideControls:input.showSlideControls!==false,showMenu:input.showMenu!==false,showToolbar:input.showToolbar!==false,flipToolsOnSwap:input.flipMenuOnSwap!==false,flipMenuOnSwap:input.flipMenuOnSwap!==false,popupGap:typeof input.popupGap==='number'&&Number.isFinite(input.popupGap)?Math.max(0,Math.min(64,input.popupGap)):0};
}
