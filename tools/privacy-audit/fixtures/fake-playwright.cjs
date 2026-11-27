// Synthetic lifecycle integration fixture. Never distributed to the phone.
const fs=require('fs');const path=require('path');const stores=new Map();let active=0;
const hints={brands:[{brand:'Chromium',version:'158'},{brand:'Google Chrome',version:'158'}],mobile:true,platform:'Android'};
const headers={'user-agent':'Mozilla/5.0 Chrome/158.0.0.0 Mobile','accept-language':'de-DE,de',
  'sec-ch-ua':'"Chromium";v="158", "Google Chrome";v="158"','sec-ch-ua-mobile':'?1','sec-ch-ua-platform':'"Android"'};
exports.chromium={async launchPersistentContext(dir){
  if(active)throw new Error('Synthetic simultaneous context');active++;
  if(!stores.has(dir))stores.set(dir,new Map());const store=stores.get(dir);let listener,closed=false,last;
  const page={async goto(url){last=url;return {status:()=>200,url:()=>url,
    json:async()=>({url,headers}),request:()=>({allHeaders:async()=>headers})};},
    async textContent(){return 'ip='+ (process.env.TEST_MISMATCH?'9.9.9.9':'1.1.1.1')+'\n';},
    async evaluate(fn,args){
      if(fn.name==='collectRealms'){
        const values={ua:headers['user-agent'],platform:'Linux armv81',language:'de-DE',languages:['de-DE','de'],hints,
          boundary:{profilePresent:true,personaPresent:false,upstreamProxyPresent:false}};
        return Object.fromEntries(['main','blankIframe','classicBlobWorker','moduleBlobWorker'].map(k=>[k,{status:'OK',values}]));
      }
      if(fn.name==='observeSurfaces')return {ua:headers['user-agent'],testFixture:true};
      if(fn.name==='storageOperation'){
        if(args.write)store.set(args.key,args.value);
        return Object.fromEntries(['local','cookie','indexedDB','cache'].map(k=>[k,store.get(args.key)??null]));
      }
      return {ua:headers['user-agent'],languages:['de-DE','de'],hints};
    },async route(){},async unroute(){}};
  return {on(type,fn){if(type==='close')listener=fn;},async addInitScript(){},setDefaultTimeout(){},
    async route(){},pages(){return [page];},browser(){return {version:()=> '158.0.8127.36'};},
    async close(){if(closed)return;closed=true;active--;listener?.();
      fs.appendFileSync(path.join(process.env.HOME,'synthetic-close-events'),'closed\n');}};
}};
