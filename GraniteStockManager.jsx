import React, { useEffect, useState } from 'react';

const DEFAULT_COLORS = ['Black Granite','Red Galaxy','Fantasy','Sadu Pink'];
const DEFAULT_WIDTHS = ['12','18','24','30','36'];

const STORAGE_KEYS = { SLABS:'granite_slabs_v2', BLOCKS:'granite_block_numbers_v2' };
function uid(){ return Math.random().toString(36).slice(2,9); }

const isClient = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export default function GraniteStockManager() {
  const [colors] = useState(DEFAULT_COLORS);
  const [widths] = useState(DEFAULT_WIDTHS);
  const [selectedColor,setSelectedColor]=useState(colors[0]);
  const [selectedWidth,setSelectedWidth]=useState(widths[0]);
  const [blockNumber,setBlockNumber]=useState('');
  const [length,setLength]=useState('');
  const [blockNumbers,setBlockNumbers]=useState([]);
  const [slabs,setSlabs]=useState([]);

  useEffect(()=>{
    if(!isClient) return;
    try{
      const s=localStorage.getItem(STORAGE_KEYS.SLABS);
      const b=localStorage.getItem(STORAGE_KEYS.BLOCKS);
      if(s) setSlabs(JSON.parse(s));
      if(b) setBlockNumbers(JSON.parse(b));
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{
    if(!isClient) return;
    localStorage.setItem(STORAGE_KEYS.SLABS,JSON.stringify(slabs));
  },[slabs]);

  useEffect(()=>{
    if(!isClient) return;
    localStorage.setItem(STORAGE_KEYS.BLOCKS,JSON.stringify(blockNumbers));
  },[blockNumbers]);

  function clearForm(){ setBlockNumber(''); setLength(''); setSelectedColor(colors[0]); setSelectedWidth(widths[0]); }

  function handleAddSlab(){
    if(!blockNumber.trim()){ if(isClient) window.alert('Block number required'); return;}
    if(!length||isNaN(Number(length))){ if(isClient) window.alert('Length required (numeric, inches)'); return;}
    const L=Number(length), W=Number(selectedWidth), sqft=((L*W)/144).toFixed(2);
    const newSlab={id:uid(), color:selectedColor, width:W, blockNumber:blockNumber.trim(), length:L, sqft:Number(sqft), createdAt:new Date().toISOString()};
    setSlabs(prev=>[newSlab,...prev]);
    setBlockNumbers(prev=>{if(prev.includes(newSlab.blockNumber))return prev; return [newSlab.blockNumber,...prev].slice(0,500);});
    clearForm();
  }

  function handleDeleteSlab(id){
    if(isClient){
      if(!window.confirm('Are you sure?')) return;
    } else {
      console.warn('confirm unavailable during build/SSR — deleting without confirmation');
    }
    setSlabs(prev=>prev.filter(s=>s.id!==id));
  }

  function exportCSV(){
    if(!isClient){
      console.warn('exportCSV unavailable during build/SSR');
      return;
    }
    const header=['id,color,width_in,width_ft,blockNumber,length_in,length_ft,sqft,createdAt'];
    const rows=slabs.map(s=>{ const widthFt=(s.width/12).toFixed(2); const lengthFt=(s.length/12).toFixed(2); return `${s.id},"${s.color}",${s.width},${widthFt},"${s.blockNumber}",${s.length},${lengthFt},${s.sqft},${s.createdAt}`; });
    const csv=header.concat(rows).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='granite_slabs_export.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function importJSON(file){
    if(!isClient){
      console.warn('importJSON unavailable during build/SSR');
      return;
    }
    if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const data=JSON.parse(e.target.result);
        if(Array.isArray(data)){
          setSlabs(prev=>[...data,...prev]);
          const newBlocks=data.map(d=>d.blockNumber).filter(Boolean);
          setBlockNumbers(prev=>Array.from(new Set([...newBlocks,...prev])));
          if(isClient) window.alert('Import complete');
        }else{
          if(isClient) window.alert('JSON must be array');
        }
      }catch(err){
        if(isClient) window.alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
  }

  function handleCopy(s){
    if(isClient && navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(JSON.stringify(s)).then(()=>{ if(isClient) window.alert('Copied JSON for slab'); }).catch(()=>{ console.warn('clipboard write failed'); });
      return;
    }
    console.log('Slab JSON (clipboard unavailable):', s);
    if(isClient) window.alert('Copied JSON for slab (fallback logged to console)');
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Granite Stock Manager</h1>
      <div className="bg-white p-4 rounded-2xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium">Color / Type</label>
            <select className="mt-1 block w-full border rounded p-2" value={selectedColor} onChange={e=>setSelectedColor(e.target.value)}>{colors.map(c=><option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium">Width (inches)</label>
            <select className="mt-1 block w-full border rounded p-2" value={selectedWidth} onChange={e=>setSelectedWidth(e.target.value)}>{widths.map(w=><option key={w} value={w}>{w}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium">Block Number</label>
            <input list="blocks" className="mt-1 block w-full border rounded p-2" value={blockNumber} onChange={e=>setBlockNumber(e.target.value)} placeholder="e.g. BLK-102" />
            <datalist id="blocks">{blockNumbers.map(b=><option key={b} value={b}/>)}</datalist>
          </div>
          <div>
            <label className="block text-sm font-medium">Length (inches)</label>
            <input className="mt-1 block w-full border rounded p-2" value={length} onChange={e=>setLength(e.target.value)} placeholder="e.g. 96" inputMode="decimal" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="px-4 py-2 rounded-xl shadow bg-blue-600 text-white" onClick={handleAddSlab}>Done / Add Slab</button>
          <button className="px-4 py-2 rounded-xl shadow border" onClick={clearForm}>Clear</button>
          <button className="px-4 py-2 rounded-xl shadow border" onClick={exportCSV}>Export CSV</button>
          <label className="px-4 py-2 rounded-xl shadow border cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={e=>{if(e.target.files && e.target.files[0]) importJSON(e.target.files[0]);}} />
          </label>
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-3">Current Stock ({slabs.length})</h2>
        {slabs.length===0?(<p className="text-sm text-gray-500">No slabs added yet — use the form above to add slabs.</p>):
        (<div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead><tr className="text-left border-b"><th className="p-2">Color</th><th className="p-2">Width (in)</th><th className="p-2">Length (in)</th><th className="p-2">Sq. Ft</th><th className="p-2">Block #</th><th className="p-2">Added</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{slabs.map(s=>(<tr key={s.id} className="border-b"><td className="p-2">{s.color}</td><td className="p-2">{s.width}</td><td className="p-2">{s.length}</td><td className="p-2">{s.sqft}</td><td className="p-2">{s.blockNumber}</td><td className="p-2">{new Date(s.createdAt).toLocaleString()}</td><td className="p-2"><button className="px-2 py-1 rounded border mr-2" onClick={()=>handleCopy(s)}>Copy</button><button className="px-2 py-1 rounded border" onClick={()=>handleDeleteSlab(s.id)}>Delete</button></td></tr>))}</tbody>
          </table>
        </div>)}
      </div>
      <div className="text-sm text-gray-500 mt-3">Data is saved locally. Sq.ft = (Length × Width) / 144.</div>
    </div>
  );
}