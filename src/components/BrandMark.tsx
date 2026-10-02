import { useApp } from '@/lib/app-context';
export function BrandMark({className='h-8 w-8'}:{className?:string}) {
  const {profile}=useApp();
  return <img src={profile.iconData || './icon.svg'} alt="" width={32} height={32} className={`${className} object-contain`} draggable={false}/>;
}
