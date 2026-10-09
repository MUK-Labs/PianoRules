function stripWrappingQuotes(value='') {
  const s=String(value).trim();
  if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))return s.slice(1,-1).trim();
  return s;
}
function looksLikeUrl(value){return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);}
function repoPieceName(repo){return repo.replace(/^rules?[-_ ]+/i,'')||repo;}
function encodedLibraryPath(name){const safe=String(name).trim();return `Library/${encodeURIComponent(safe)}/${encodeURIComponent(safe)}.rules`;}
export const DEFAULT_RULESET='JazzLab';
export function resolveRulesetCandidates(rawRef, appUrl=(typeof location!=='undefined'?location.href:'https://example.invalid/')) {
  const ref=stripWrappingQuotes(rawRef);
  if(!ref)throw new Error('The ruleset parameter is empty.');
  if(!looksLikeUrl(ref) && !/[\\/]/.test(ref) && !/\.rules(?:$|[?#])/i.test(ref)){
    const url=new URL(encodedLibraryPath(ref),appUrl).href;
    return {ref,label:ref,kind:'library',candidates:[url]};
  }
  if(!looksLikeUrl(ref)){
    if(!/\.rules(?:$|[?#])/i.test(ref))throw new Error(`Ruleset “${ref}” is neither a short Library name nor a .rules path/URL.`);
    const url=new URL(ref,appUrl).href;
    const label=decodeURIComponent(url.split('/').pop().replace(/\.rules(?:[?#].*)?$/i,''));
    return {ref,label,kind:'file',candidates:[url]};
  }
  const u=new URL(ref),host=u.hostname.toLowerCase();
  if(host==='github.com'||host==='www.github.com'){
    const parts=u.pathname.split('/').filter(Boolean);
    if(parts.length<2)throw new Error('GitHub ruleset URLs must point to a repository or a .rules file.');
    const owner=parts[0],repo=parts[1].replace(/\.git$/i,'');
    if(parts[2]==='blob'&&parts.length>=5){
      const branch=parts[3],path=parts.slice(4).join('/');
      if(!/\.rules$/i.test(path))throw new Error('A GitHub blob ruleset URL must point to a .rules file.');
      return {ref,label:path.split('/').pop().replace(/\.rules$/i,''),kind:'github-file',candidates:[`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}`]};
    }
    const branch=parts[2]==='tree'&&parts[3]?parts[3]:null,piece=repoPieceName(repo),filenames=[`${piece}.rules`];
    if(`${repo}.rules`.toLowerCase()!==filenames[0].toLowerCase())filenames.push(`${repo}.rules`);
    const branches=branch?[branch]:['main','master'],candidates=[];
    for(const b of branches)for(const filename of filenames)candidates.push(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(b)}/${encodeURIComponent(filename)}`);
    return {ref,label:piece,kind:'github-repo',candidates};
  }
  if(!/\.rules$/i.test(u.pathname))throw new Error('For non-GitHub hosts, ruleset must be a direct public .rules URL.');
  return {ref,label:decodeURIComponent(u.pathname.split('/').pop().replace(/\.rules$/i,'')),kind:'url',candidates:[u.href]};
}
export async function loadRuleset(rawRef,{appUrl=(typeof location!=='undefined'?location.href:'https://example.invalid/'),fetchImpl=(typeof fetch!=='undefined'?fetch:null)}={}){
  if(!fetchImpl)throw new Error('No fetch implementation is available.');
  const resolved=resolveRulesetCandidates(rawRef,appUrl),attempts=[];
  for(const url of resolved.candidates){
    try{
      const response=await fetchImpl(url,{cache:'no-cache'});
      if(!response.ok){attempts.push(`${response.status} ${url}`);continue;}
      const source=await response.text();if(!source.trim()){attempts.push(`empty file ${url}`);continue;}
      return {...resolved,url,source,baseUrl:new URL('.',url).href,assetBaseUrl:new URL('assets/',new URL('.',url)).href};
    }catch(error){attempts.push(`${error?.message||error} ${url}`);}
  }
  const detail=attempts.length?` Tried: ${attempts.join(' · ')}`:'';throw new Error(`Could not load ruleset “${resolved.label}”.${detail}`);
}
export function resolveRulesetAssetUrl(source,{assetUrls=new Map(),assetBaseUrl=''}={},rulesBaseUrl='',appUrl=(typeof location!=='undefined'?location.href:'https://example.invalid/')){
  const originBase=rulesBaseUrl||appUrl,explicit=assetUrls?.get?.(source);
  if(explicit)return new URL(explicit,originBase).href;
  if(/^[a-z][a-z0-9+.-]*:/i.test(String(source)))return new URL(source,originBase).href;
  if(assetBaseUrl){const base=new URL(assetBaseUrl,originBase),baseHref=base.href.endsWith('/')?base.href:base.href+'/';return new URL(source,baseHref).href;}
  if(rulesBaseUrl)return new URL(source,new URL('assets/',rulesBaseUrl)).href;
  return '';
}
export function rulesetFromLocation(loc=(typeof location!=='undefined'?location:null)){
  if(!loc)return DEFAULT_RULESET;
  return new URLSearchParams(loc.search||'').get('ruleset')||DEFAULT_RULESET;
}
