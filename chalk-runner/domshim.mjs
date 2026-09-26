/* A very small DOM, enough to run the client and see whether it throws. */
export function makeWindow(){
  const listeners = {};
  function El(id){
    const cls = new Set();
    const el = {
      id, tagName:'DIV', value:'', textContent:'', innerHTML:'',
      style:new Proxy({}, { get:(t,k)=>t[k]||'', set:(t,k,v)=>{t[k]=v;return true;} }),
      width:0, height:0, clientWidth:360, clientHeight:132,
      classList:{
        add:(...c)=>c.forEach(x=>cls.add(x)),
        remove:(...c)=>c.forEach(x=>cls.delete(x)),
        contains:c=>cls.has(c),
        toggle:(c,f)=>{ const want = f===undefined ? !cls.has(c) : !!f;
                        want?cls.add(c):cls.delete(c); return want; }
      },
      _children:{},
      addEventListener(t,f){ (el._l = el._l||{})[t] = (el._l[t]||[]).concat(f); },
      removeEventListener(){}, focus(){}, setPointerCapture(){},
      getContext(){ return CTX; },
      fire(t, ev){ ((el._l||{})[t]||[]).forEach(f=>f(ev||{})); if (el['on'+t]) el['on'+t](ev||{}); },
      get firstElementChild(){ return el._fec || (el._fec = El(id + '>i')); }
    };
    return el;
  }
  const CTX = new Proxy({}, {
    get(t,k){
      if (k==='canvas') return {};
      if (k==='measureText') return ()=>({width:10});
      if (k==='createLinearGradient') return ()=>({ addColorStop(){} });
      return ()=>undefined;
    },
    set(){ return true; }
  });
  const els = {};
  const document = {
    getElementById(id){ return els[id] || (els[id] = El(id)); },
    addEventListener(){}, createElement(t){ return El('new-'+t); }
  };
  const node = () => ({ connect(){}, disconnect(){},
    gain:{ value:0.1, setValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} },
    frequency:{ value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){} },
    type:'', Q:{value:1}, start(){}, stop(){}, buffer:null });
  const win = {
    document, els,
    innerWidth:412, innerHeight:915, devicePixelRatio:2,
    location:{ protocol:'https:', host:'chalk-runner.test', origin:'https://chalk-runner.test',
               pathname:'/', search:'' },
    navigator:{ vibrate:()=>true, clipboard:{ writeText:async()=>{} } },
    performance:{ now:()=>Date.now() },
    requestAnimationFrame(fn){ return setTimeout(()=>fn(Date.now()), 16); },
    cancelAnimationFrame(id){ clearTimeout(id); },
    addEventListener(t,f){ (listeners[t]=listeners[t]||[]).push(f); },
    fireWindow(t,ev){ (listeners[t]||[]).forEach(f=>f(ev||{})); },
    Path2D: function(){ this.moveTo=this.lineTo=this.quadraticCurveTo=()=>{}; },
    AudioContext: function(){ return { state:'running', currentTime:0, sampleRate:44100,
      destination:{}, resume(){}, createOscillator:node, createGain:node,
      createBiquadFilter:node, createBufferSource:node,
      createBuffer:(c,n)=>({ getChannelData:()=>new Float32Array(n) }) }; },
    fetch: async () => ({ json: async () => ({ top:[
      { n:'Cat', m:312, w:'Dan' }, { n:'Ann', m:120, w:'Bob' } ] }) }),
    WebSocket: function(){ const s = { readyState:1, sent:[],
      send(j){ s.sent.push(JSON.parse(j)); }, close(){} }; win.__sock = s; return s; }
  };
  win.window = win;
  return win;
}
