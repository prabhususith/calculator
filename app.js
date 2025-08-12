
// app.js - PWA Scientific Calculator with FX & Crypto caching
const state = {
  calcExp: '',
  sciVal: '',
  fxRates: null,
  fxLast: null,
  cgData: null,
  cgLast: null
};

function $(s){ return document.querySelector(s) }
function $all(s){ return Array.from(document.querySelectorAll(s)) }

// Tabs
$all('.tab').forEach(btn=>btn.addEventListener('click', ()=>{
  $all('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const t = btn.dataset.tab;
  $all('.tabpane').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
}));

// Basic calculator logic
const screen = $('#calc-screen');
let current = '0';
let operator = null;
let operand = null;
let resetNext = false;

function updateScreen(){ screen.textContent = current }

$all('.num').forEach(b=> b.addEventListener('click', ()=>{
  const v = b.dataset.val;
  if(resetNext){ current = (v==='.'? '0.' : v); resetNext=false; }
  else if(current==='0' && v !== '.') current = v;
  else current += v;
  updateScreen();
}));

$all('.op').forEach(b=> b.addEventListener('click', ()=>{
  const op = b.dataset.op;
  if(operand==null){ operand = parseFloat(current); }
  else if(!resetNext){ operand = compute(operand, parseFloat(current), operator) }
  operator = op; resetNext = true; current = String(operand);
  updateScreen();
}));

function compute(a,b,op){
  if(op=='+') return a+b; if(op=='-') return a-b; if(op=='*') return a*b; if(op=='/') return a/b;
  return b;
}

$('#clear').addEventListener('click', ()=>{ current='0'; operand=null; operator=null; updateScreen(); });

$('#equals').addEventListener('click', ()=>{
  if(operator){ current = String(compute(operand, parseFloat(current), operator)); operator=null; operand=null; updateScreen(); resetNext=true; }
});

// Scientific
const sciScreen = $('#sci-screen');
$('#sci-eval').addEventListener('click', ()=>{
  const expr = $('#sci-input').value.trim();
  if(!expr) return alert('Enter expression');
  try{
    // safe-eval limited: we map to Math functions
    const safe = expr.replace(/([a-zA-Z]+)/g, (m)=> 'Math.'+m);
    const val = Function('"use strict"; return ('+safe+')')();
    sciScreen.textContent = String(val);
  }catch(e){ sciScreen.textContent = 'Error'; }
});
$all('.fn').forEach(b=> b.addEventListener('click', ()=>{
  const fn = b.dataset.fn;
  const v = parseFloat($('#sci-input').value) || 0;
  try{
    let out=0;
    if(fn==='sin') out = Math.sin(v);
    if(fn==='cos') out = Math.cos(v);
    if(fn==='tan') out = Math.tan(v);
    if(fn==='ln') out = Math.log(v);
    if(fn==='sqrt') out = Math.sqrt(v);
    if(fn==='pow'){ const y = parseFloat(prompt('power y value','2')); out = Math.pow(v, parseFloat(y)); }
    if(fn==='fact'){ out = factorial(Math.floor(v)); }
    $('#sci-screen').textContent = String(out);
  }catch(e){ $('#sci-screen').textContent='Error' }
}));

function factorial(n){ if(n<=1) return 1; let r=1; for(let i=2;i<=n;i++) r*=i; return r; }

// FX & Crypto
const FX_API = 'https://api.exchangerate.host/latest'; // no-key
const CG_API = 'https://api.coingecko.com/api/v3/simple/price';

async function fetchFx(base='USD'){
  try{
    const res = await fetch(FX_API + '?base='+base);
    if(!res.ok) throw new Error('fx fetch failed');
    const json = await res.json();
    state.fxRates = json.rates;
    state.fxLast = new Date().toISOString();
    localStorage.setItem('fxRates', JSON.stringify({rates: state.fxRates, ts: state.fxLast, base}));
    $('#fx-last').textContent = 'Last update: '+state.fxLast;
    return state.fxRates;
  }catch(e){
    // fallback to stored
    const s = localStorage.getItem('fxRates');
    if(s){ const obj = JSON.parse(s); state.fxRates = obj.rates; state.fxLast = obj.ts; $('#fx-last').textContent='Last update: '+state.fxLast; return state.fxRates; }
    throw e;
  }
}

async function fetchCg(ids='bitcoin,ethereum', vs='usd,inr'){
  try{
    const res = await fetch(CG_API + '?ids='+encodeURIComponent(ids)+'&vs_currencies='+encodeURIComponent(vs));
    if(!res.ok) throw new Error('cg fetch failed');
    const json = await res.json();
    state.cgData = json; state.cgLast = new Date().toISOString();
    localStorage.setItem('cgData', JSON.stringify({data: state.cgData, ts: state.cgLast, ids, vs}));
    $('#cg-last').textContent = 'Last update: '+state.cgLast;
    renderCg();
    return json;
  }catch(e){
    const s = localStorage.getItem('cgData');
    if(s){ const obj = JSON.parse(s); state.cgData = obj.data; state.cgLast = obj.ts; $('#cg-last').textContent='Last update: '+state.cgLast; renderCg(); return state.cgData; }
    throw e;
  }
}

$('#fx-convert').addEventListener('click', async ()=>{
  const amt = parseFloat($('#fx-amount').value) || 1;
  const from = ($('#fx-from').value || 'USD').toUpperCase();
  const to = ($('#fx-to').value || 'INR').toUpperCase();
  try{
    const rates = await fetchFx(from);
    const rate = rates[to] || (rates[to.toUpperCase()]||null) ;
    if(!rate) return $('#fx-result').textContent = 'Rate not found for '+to;
    const out = amt * rate;
    $('#fx-result').textContent = amt+' '+from+' = '+out.toFixed(4)+' '+to;
  }catch(e){ $('#fx-result').textContent = 'Exchange fetch failed (offline?)'; }
});

$('#cg-fetch').addEventListener('click', ()=>{
  const ids = $('#cg-ids').value || 'bitcoin,ethereum';
  const vs = $('#cg-vs').value || 'usd,inr';
  fetchCg(ids, vs);
});

function renderCg(){
  const el = $('#cg-list'); el.innerHTML='';
  if(!state.cgData) return el.textContent = 'No data';
  for(const k of Object.keys(state.cgData)){
    const row = document.createElement('div'); row.className='cg-row';
    row.innerHTML = '<strong>'+k+'</strong>: '+ JSON.stringify(state.cgData[k]);
    el.appendChild(row);
  }
}

// Service Worker registration (app will cache on install)
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    try{
      await navigator.serviceWorker.register('sw.js');
      console.log('sw registered');
    }catch(e){ console.warn('sw failed', e); }
  });
}

// UI keyboard support for basic calc
document.addEventListener('keydown', (e)=>{
  if(document.querySelector('.tab.active').dataset.tab !== 'calc') return;
  if(/\d/.test(e.key) || e.key === '.') document.querySelector('[data-val="'+e.key+'"]')?.click();
  if(['+','-','*','/'].includes(e.key)) document.querySelector('[data-op="'+e.key+'"]')?.click();
  if(e.key === 'Enter') $('#equals').click();
  if(e.key === 'Escape') $('#clear').click();
});
