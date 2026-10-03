import fs from 'node:fs';
const repo=process.env.GITHUB_REPOSITORY||'ADIxxDEV/kopy-notes';
if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error('Invalid GitHub repository');
const headers={Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})};
const contributors=[];
for(let page=1;page<=10;page++){
  const response=await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=100&page=${page}`,{headers});
  if(!response.ok)throw new Error(`GitHub contributors request failed: ${response.status}`);
  const rows=await response.json();contributors.push(...rows.filter(row=>row.type==='User'&&/^[\w-]+$/.test(row.login)));
  if(rows.length<100)break;
}
const start='<!-- CONTRIBUTORS:START -->',end='<!-- CONTRIBUTORS:END -->';
const readme=fs.readFileSync('README.md','utf8');
if(!readme.includes(start)||!readme.includes(end))throw new Error('README contributor markers are missing');
const cards=contributors.map(row=>`<a href="https://github.com/${row.login}"><img src="https://avatars.githubusercontent.com/u/${row.id}?s=80" width="64" height="64" alt="${row.login}" title="${row.login}" /></a>`).join('\n');
const body=cards?`<p>\n${cards}\n</p>\n\n${contributors.map(row=>`[${row.login}](https://github.com/${row.login})`).join(' · ')}`:'Contributor profiles appear here after the first contribution.';
const from=readme.indexOf(start)+start.length,to=readme.indexOf(end,from);
fs.writeFileSync('README.md',readme.slice(0,from)+'\n'+body+'\n'+readme.slice(to));
console.log(`Updated ${contributors.length} public contributor profiles.`);
