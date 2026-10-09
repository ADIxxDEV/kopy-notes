import {Note3Artwork} from './Note3Artwork';
import {Icon,type IconName} from '@/components/Icon';
import {useApp} from '@/lib/app-context';
import type {ThemeIconId} from '@/lib/theme-pack';
/** Theme artwork is embedded raster data validated by parseThemePack. */
export function ThemeIcon({name,className}:{name:IconName;className?:string}){
 const {profile}=useApp();
 const id=name==='toolbox'?'tools':name;
 const source=profile.theme?.icons[id as ThemeIconId];
 return source?<img src={source} className={`kn-theme-tool-image ${className??''}`} alt="" draggable={false}/>:profile.theme?.appearance==='org-note3'?<Note3Artwork name={id} className={className}/>:<Icon name={name} className={className}/>;
}
