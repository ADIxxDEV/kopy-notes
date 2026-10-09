param([string]$Installation=(Join-Path ${env:ProgramFiles(x86)} 'ShiRui\Note\Main'),[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
# For local use with a licensed installation. No vendor image is checked into Kopy.
$assembly=[Reflection.Assembly]::LoadFile((Join-Path $Installation 'EasiNote.Resource.dll'))
$stream=$assembly.GetManifestResourceStream('EasiNote.Resource.g.resources')
$reader=New-Object System.Resources.ResourceReader $stream
$resources=@{}
foreach($entry in $reader.GetEnumerator()){$resources[$entry.Key]=$entry.Value}
$names=@{pen='pen_general';pencil='pen_general';paint='brush_general';chinese='bamboobrush';crayon='texturepen';stamp='magicpen';highlighter='markpen_general';laser='laserpen';eraser='eraser';select='arrow';hand='roam';shapes='rectangle';tools='tool_normal';menu='menu_normal';import='opendatabase';save='ui/startmenu/save.png';export='camera';board='desktop_normal';layers='pagemanagericon';plus='addnewpage';chevronLeft='prepage';chevronRight='nextpage';undo='undo';redo='redo';text='textinput';flipHorizontal='buttontoleft'}
$previews=@{pen='penthumb';pencil='penthumb';paint='brushthumb';chinese='bamboobrushthumb';crayon='crayonthumb';stamp='magicpenthumb';highlighter='markpenthumb';laser='laserpenthumb'}
foreach($id in $previews.Keys){$names[$id+'Preview']='ui/toolbar/popup/pen/'+$previews[$id]+'.png'}
$icons=@{}
foreach($id in $names.Keys){
 $key=if($names[$id].Contains('/')){$names[$id]}else{'ui/toolbar/minitoolbutton/'+$names[$id]+'.png'}
 if(-not $resources.ContainsKey($key)){throw "Missing artwork: $key"}
 $source=$resources[$key];$source.Position=0;$buffer=New-Object IO.MemoryStream
 $source.CopyTo($buffer);$icons[$id]='data:image/png;base64,'+[Convert]::ToBase64String($buffer.ToArray());$buffer.Dispose()
}
$pack=@{schema='org.kopynotes.theme';version=1;id='org-note3-local';name='org-note3 local artwork';appearance='org-note3';attribution='Artwork from the locally installed ShiRui Note3. Original ownership and license terms apply; not covered by the Kopy Notes MIT license. Redistribution permission has not been verified.';colors=@{panel='#f5f5f3';surface='#dededc';ink='#25272a';muted='#56595b';line='#b6b9bb';accent='#407db2'};autoContrast=$false;icons=$icons;boards=@(@{id='note-green';name='Note green';background='#95c459';pattern='none';ink='#111111'})}
$json=$pack|ConvertTo-Json -Depth 12
[IO.File]::WriteAllText([IO.Path]::GetFullPath($Output),$json,(New-Object Text.UTF8Encoding($false)))
$reader.Close()
Write-Output ('Local theme created: '+$Output)
