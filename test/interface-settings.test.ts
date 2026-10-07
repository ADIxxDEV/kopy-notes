import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interfaceSettings} from '../src/lib/interface-settings';
import {newPageStyle} from '../src/lib/new-page-style';
import {toolPopupPosition} from '../src/lib/tool-popup';
import {controlPalette,BUILTIN_THEMES} from '../src/lib/theme-pack';
test('interface defaults keep controls visible, use zero popup gap and clamp imported distances',()=>{assert.equal(interfaceSettings(null).popupGap,0);assert.equal(interfaceSettings({popupGap:1000}).popupGap,64);assert.equal(interfaceSettings({showTime:false}).showTime,false);});
test('new blank pages after imported documents use the saved paper and image',()=>{
 const profile={boardBg:'#123456',boardPattern:'grid',boardImage:'data:image/png;base64,aGVsbG8='};
 const imported={background:'#ffffff',pattern:'none',media:[],importFrame:{x:0,y:0,width:1280,height:720}};
 assert.deepEqual(newPageStyle(profile,imported),{background:'#123456',pattern:'grid',backgroundImage:profile.boardImage});
 assert.equal(newPageStyle(profile,{...imported,importFrame:undefined,background:'#cc8844'}).background,'#cc8844');
});
test('tool popups touch the toolbar by default and stay inside the viewport on both sides',()=>{
 const view={width:1280,height:720},bottom={x:400,y:660,width:400,height:60};
 const above=toolPopupPosition({x:500,y:668,width:44,height:44},{width:330,height:400},bottom,view);assert.equal(above.y+400,bottom.y);
 for(const x of [0,1220]){const dock={x,y:120,width:60,height:480};const result=toolPopupPosition({x,y:260,width:44,height:44},{width:330,height:400},dock,view,12);assert.ok(result.x>=8);assert.ok(result.x+330<=1272);assert.ok(result.y+400<=712);assert.ok(x===0?result.x>=72:result.x+330<=1208);}
});
test('a dark theme stays dark regardless of the page color and automatic contrast setting',()=>{const theme=BUILTIN_THEMES[2];assert.equal(controlPalette(theme,'#000000').panel,theme.colors.panel);assert.equal(controlPalette(theme,'#ffffff').panel,theme.colors.panel);});

test('side settings shrink into the available edge space instead of covering their owner',()=>{
 const owner={x:252,y:200,width:336,height:44};const p=toolPopupPosition(owner,{width:320,height:280},{x:150,y:440,width:300,height:60},{width:600,height:500},0,true);
 assert.ok(p.x+Math.min(320,p.maxWidth)<=owner.x);assert.ok(p.x>=8);assert.ok(p.maxWidth>=200);
});
