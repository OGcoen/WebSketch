import React, {useEffect, useRef, useState} from "react";

type Candle = { t:string; o:number; h:number; l:number; c:number };
type GridLevel = { price: number; contracts: number; filled: boolean; side: 'buy' | 'sell' };

interface TVChartProps {
  candles?: Candle[];
  gridLevels?: GridLevel[];
  currentPrice?: number;
  onChartClick?: (price: number) => void;
  drawMode?: boolean;
  pendingOpen?: number | null;
}

const css = `
.wrap{max-width:1200px;margin:16px auto;padding:12px;font:14px/1.5 system-ui;color:#e5e7eb}
.toolbar{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}
.btn{border:1px solid #253456;background:#0d172c;color:#dbe2ee;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px}
.btn:hover{background:#1a2847}
.btn.active{background:#3b82f6;color:white}
.canvas{position:relative;width:100%;height:520px;background:#0a1326;border:1px solid #1b2746;border-radius:12px;overflow:hidden}
.canvas>canvas{position:absolute;inset:0}
.note{position:absolute;right:8px;top:8px;color:#9fb0c7;font-size:12px;z-index:10}
.draw-indicator{position:absolute;left:8px;top:8px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.5);color:#3b82f6;padding:6px 12px;border-radius:8px;font-size:12px;z-index:10}
body{background:linear-gradient(180deg,#0b1020,#0d1328 55%,#0b1224)}
`;

function useDPRCanvas(canvas: HTMLCanvasElement|null){
  useEffect(()=>{
    if(!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height= Math.max(1, Math.floor(r.height* dpr));
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  });
}

export default function TVChart({ 
  candles: propCandles, 
  gridLevels: propGridLevels = [], 
  currentPrice: propCurrentPrice,
  onChartClick,
  drawMode = false,
  pendingOpen
}: TVChartProps){
  const chartRef = useRef<HTMLCanvasElement>(null);
  const ovRef = useRef<HTMLCanvasElement>(null);

  const [candles,setCandles] = useState<Candle[]>(()=>{
    if (propCandles && propCandles.length > 0) {
      return propCandles.map(c => ({
        t: c.t || new Date().toISOString().slice(0, 10),
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c
      }));
    }
    // dummy 90 dagen als fallback
    const out:Candle[]=[]; let p=13;
    const start=new Date(); start.setDate(start.getDate()-89);
    for(let i=0;i<90;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      const o=p, h=o*(1+0.01*Math.random()+Math.random()*0.004), l=o*(1-0.01*Math.random()-Math.random()*0.004);
      const c=l+(h-l)*Math.random(); p=c*(1+(Math.random()-0.5)*0.02);
      out.push({t:d.toISOString().slice(0,10), o:+o.toFixed(4), h:+h.toFixed(4), l:+l.toFixed(4), c:+c.toFixed(4)});
    }
    return out;
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [cursorPrice, setCursorPrice] = useState<number>(propCurrentPrice || candles.at(-1)!.c);

  // Update when props change
  useEffect(() => {
    if (propCandles && propCandles.length > 0) {
      setCandles(propCandles.map(c => ({
        t: c.t || new Date().toISOString().slice(0, 10),
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c
      })));
    }
  }, [propCandles]);

  useEffect(() => {
    if (propCurrentPrice !== undefined) {
      setCursorPrice(propCurrentPrice);
    }
  }, [propCurrentPrice]);

  // viewstate (tradingview-achtig)
  const view = useRef({ i0:0, i1: Math.max(0, candles.length-1), lockY:false, yMin:0, yMax:0 });

  useDPRCanvas(chartRef.current);
  useDPRCanvas(ovRef.current);

  // tekenen
  const draw = ()=>{
    const cnv = chartRef.current!, ov = ovRef.current!;
    const ctx = cnv.getContext("2d")!, octx = ov.getContext("2d")!;
    const W = cnv.clientWidth, H = cnv.clientHeight;
    const gutter=80, X0=50, X1=W-10-gutter, Y0=10, Y1=H-30;

    ctx.clearRect(0,0,W,H); ctx.fillStyle="#0a1326"; ctx.fillRect(0,0,W,H);
    
    // Grid lines
    ctx.strokeStyle="#132048"; 
    for(let i=0;i<6;i++){ 
      const y=(Y1-Y0)*i/5+Y0; 
      ctx.beginPath(); 
      ctx.moveTo(X0,y); 
      ctx.lineTo(X1+gutter,y); 
      ctx.stroke(); 
    }

    const i0=Math.floor(view.current.i0), i1=Math.ceil(view.current.i1);
    const list=candles.slice(i0, i1+1);
    const nVis=Math.max(1, i1-i0+1), step=(X1-X0)/nVis;

    let lo=+Infinity, hi=-Infinity;
    list.forEach(k=>{ lo=Math.min(lo,k.l); hi=Math.max(hi,k.h); });
    propGridLevels.forEach(L=>{ lo=Math.min(lo,L.price); hi=Math.max(hi,L.price); });
    if (propCurrentPrice) { lo=Math.min(lo,propCurrentPrice); hi=Math.max(hi,propCurrentPrice); }
    if(!isFinite(lo)||!isFinite(hi)){ lo=10; hi=15; }
    if(view.current.lockY){ lo=view.current.yMin; hi=view.current.yMax; }
    const pad=(hi-lo)*0.08||1; lo-=pad; hi+=pad;
    const yAt=(p:number)=> Y1 - (p - lo)/(hi - lo) * (Y1 - Y0);

    // Draw grid levels from props
    if(propGridLevels && propGridLevels.length > 0) {
      propGridLevels.forEach(level => {
        const y = yAt(level.price);
        
        ctx.save();
        // Line style based on filled status - transparent green for filled, gray for unfilled
        if (level.filled) {
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // Transparent green for filled
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)'; // Gray for unfilled
          ctx.lineWidth = 1;
        }
        
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(X0, y);
        ctx.lineTo(X1, y);
        ctx.stroke();
        ctx.restore();
      });

      // Right boxes for contracts
      propGridLevels.forEach(level => {
        const y = yAt(level.price);
        const filled = level.filled;
        
        // Contract box
        ctx.fillStyle = filled ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,1)";
        const bx=X1+12,bw=gutter-24,bh=12; 
        ctx.fillRect(bx,y-bh/2,bw,bh);
        
        // Contract count text
        ctx.fillStyle = filled ? "#ffffff" : "#0a1326";
        ctx.textAlign="center"; 
        ctx.font="10px monospace"; 
        ctx.fillText(String(level.contracts), bx+bw/2, y+3);
        
        // Price label
        ctx.textAlign="right";
        ctx.fillStyle = filled ? "rgba(34,197,94,0.8)" : "#94a3b8";
        ctx.font="9px monospace";
        ctx.fillText(`$${level.price.toFixed(4)}`, bx-2, y+3);
        ctx.textAlign="left";
      });
    }

    // candles
    const w=Math.max(2, step*0.6);
    list.forEach((k,rel)=>{
      const up=k.c>=k.o, col=up?"#22c55e":"#ef4444"; // Green/Red like TradingView
      const x=X0 + rel*step + step*0.5;
      
      // Wick
      ctx.strokeStyle=col; 
      ctx.lineWidth=1;
      ctx.beginPath(); 
      ctx.moveTo(x, yAt(k.h)); 
      ctx.lineTo(x, yAt(k.l)); 
      ctx.stroke();
      
      // Body
      const y1=yAt(k.o), y2=yAt(k.c); 
      const yTop=Math.min(y1,y2), h=Math.max(1,Math.abs(y1-y2));
      
      if (up) {
        // Green candle - hollow body
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.fillRect(x-w/2, yTop, w, h);
        ctx.strokeRect(x-w/2, yTop, w, h);
      } else {
        // Red candle - filled body
        ctx.fillStyle = col;
        ctx.fillRect(x-w/2, yTop, w, h);
      }
    });

    // Draw current price line
    if (propCurrentPrice) {
      const currentY = yAt(propCurrentPrice);
      ctx.save();
      ctx.strokeStyle = '#f59e0b'; // Yellow like TradingView
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(X0, currentY);
      ctx.lineTo(X1, currentY);
      ctx.stroke();
      
      // Current price label
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillRect(X1 + 2, currentY - 8, 70, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`$${propCurrentPrice.toFixed(4)}`, X1 + 6, currentY + 2);
      ctx.restore();
    }

    // clear overlay
    octx.clearRect(0,0,W,H);

    // store for events
    (cnv as any)._scale = { X0,X1,Y0,Y1, step, lo, hi, i0:view.current.i0, i1:view.current.i1 };
  };

  useEffect(()=>{ draw(); }, [candles, cursorPrice, propGridLevels, propCurrentPrice]);

  // events
  useEffect(()=>{
    const c = chartRef.current!, o = ovRef.current!;
    const onResize = ()=>{ draw(); };
    window.addEventListener("resize", onResize);

    const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
    function zoomXAt(px:number, dir:number){
      const s=(c as any)._scale; if(!s) return;
      const frac = clamp((px - s.X0)/Math.max(1,(s.X1-s.X0)), 0, 1);
      const center = view.current.i0 + frac*(view.current.i1 - view.current.i0);
      const factor = dir<0?0.85:1.15; let span=(view.current.i1 - view.current.i0 + 1)*factor;
      span = Math.max(5, Math.min(span, Math.max(1, candles.length)));
      view.current.i0 = center - span*frac; view.current.i1 = center + span*(1-frac); draw();
    }
    function zoomY(dir:number){
      const s=(c as any)._scale; if(!s) return;
      const mid=(s.lo+s.hi)/2; const factor=dir<0?0.85:1.15; const half=(s.hi-s.lo)/2*factor;
      view.current.lockY=true; view.current.yMin=mid-half; view.current.yMax=mid+half; draw();
    }
    function panBy(px:number){
      const s=(c as any)._scale; if(!s) return; const bars=px/s.step;
      view.current.i0 -= bars; view.current.i1 -= bars; draw();
    }

    const wheel=(e:WheelEvent)=>{ e.preventDefault(); if(e.ctrlKey) zoomY(e.deltaY); else zoomXAt(e.clientX-c.getBoundingClientRect().left, e.deltaY); };
    c.addEventListener("wheel", wheel, {passive:false});

    let drag: null | {x0:number;y0:number;shift:boolean;panning:boolean} = null;
    const mdown=(e:MouseEvent)=>{ 
      const r=c.getBoundingClientRect(); 
      drag={x0:e.clientX-r.left,y0:e.clientY-r.top,shift:e.shiftKey,panning:!e.shiftKey}; 
      
      // Handle chart click for drawing mode
      if (onChartClick && !e.shiftKey) {
        const s=(c as any)._scale;
        if (s) {
          const y = e.clientY - r.top;
          const price = s.hi - ((y - s.Y0) / (s.Y1 - s.Y0)) * (s.hi - s.lo);
          onChartClick(price);
        }
      }
    };
    
    const mmove=(e:MouseEvent)=>{ 
      if(!drag) return; 
      const r=c.getBoundingClientRect(); 
      const x=e.clientX-r.left, y=e.clientY-r.top;
      if(drag.panning){ panBy(x-drag.x0); drag.x0=x; }
      else{ 
        const oc=o.getContext("2d")!; 
        oc.clearRect(0,0,o.width,o.height);
        oc.fillStyle="rgba(124,58,237,0.15)"; 
        oc.strokeStyle="rgba(124,58,237,0.8)";
        oc.fillRect(Math.min(drag.x0,x),Math.min(drag.y0,y),Math.abs(x-drag.x0),Math.abs(y-drag.y0));
        oc.strokeRect(Math.min(drag.x0,x),Math.min(drag.y0,y),Math.abs(x-drag.x0),Math.abs(y-drag.y0)); 
      } 
    };
    
    const mup=(e:MouseEvent)=>{ 
      if(!drag) return; 
      const r=c.getBoundingClientRect(); 
      const x=e.clientX-r.left, y=e.clientY-r.top;
      if(!drag.panning){ 
        const s=(c as any)._scale; 
        const clamp2=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
        const xa=clamp2(Math.min(drag.x0,x),s.X0,s.X1), xb=clamp2(Math.max(drag.x0,x),s.X0,s.X1);
        const ya=clamp2(Math.min(drag.y0,y),s.Y0,s.Y1), yb=clamp2(Math.max(drag.y0,y),s.Y0,s.Y1);
        const fracA=(xa-s.X0)/Math.max(1,(s.X1-s.X0)), fracB=(xb-s.X0)/Math.max(1,(s.X1-s.X0));
        const span=(view.current.i1-view.current.i0); 
        const A=view.current.i0+fracA*span, B=view.current.i0+fracB*span;
        view.current.i0=Math.min(A,B); view.current.i1=Math.max(A,B);
        const pTop=s.hi - ((ya-s.Y0)/(s.Y1-s.Y0))*(s.hi-s.lo), pBot=s.hi - ((yb-s.Y0)/(s.Y1-s.Y0))*(s.hi-s.lo);
        view.current.lockY=true; view.current.yMin=Math.min(pTop,pBot); view.current.yMax=Math.max(pTop,pBot);
        o.getContext("2d")!.clearRect(0,0,o.width,o.height); 
      }
      drag=null; draw(); 
    };
    
    c.addEventListener("mousedown", mdown); 
    window.addEventListener("mousemove", mmove); 
    window.addEventListener("mouseup", mup);
    
    const dbl=()=>{ 
      view.current.i0=0; 
      view.current.i1=Math.max(0,candles.length-1); 
      view.current.lockY=false; 
      draw(); 
    };
    c.addEventListener("dblclick", dbl);

    return ()=>{ 
      window.removeEventListener("resize", onResize); 
      c.removeEventListener("wheel", wheel); 
      c.removeEventListener("mousedown", mdown);
      window.removeEventListener("mousemove", mmove); 
      window.removeEventListener("mouseup", mup); 
      c.removeEventListener("dblclick", dbl); 
    };
  }, [candles, onChartClick]);

  useEffect(()=>{ draw(); }, []);

  return (
    <div className="wrap">
      <style>{css}</style>
      <div className="toolbar">
        {/* Timeframe buttons */}
        {['1m', '5m', '15m', '1h', '4h', '1D', '1W'].map((tf) => (
          <button 
            key={tf}
            className={`btn ${selectedTimeframe === tf ? 'active' : ''}`}
            onClick={() => setSelectedTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
        
        <div style={{width: '1px', height: '20px', background: '#253456', margin: '0 8px'}}></div>
        
        {/* Zoom controls */}
        <button className="btn" onClick={()=>{ 
          view.current.i0=0; 
          view.current.i1=Math.max(0,candles.length-1); 
          draw(); 
        }}>
          Fit
        </button>
        <button className="btn" onClick={()=>{ 
          view.current.i0=0; 
          view.current.i1=Math.max(0,candles.length-1); 
          view.current.lockY=false; 
          draw(); 
        }}>
          Reset
        </button>
        
        <label style={{display:"inline-flex",alignItems:"center",gap:6,color:"#9fb0c7",fontSize:"12px"}}>
          <input 
            type="checkbox" 
            onChange={(e)=>{ 
              view.current.lockY=e.target.checked; 
              if(!e.target.checked){ draw(); } 
            }} 
          /> 
          Lock-Y
        </label>
        
        <span style={{color:"#9fb0c7",fontSize:"11px"}}>
          Scroll=zoom • CTRL+scroll=Y-zoom • Sleep=pan • SHIFT+sleep=box-zoom • Dubbelklik=reset
        </span>
      </div>

      <div className="canvas">
        <div className="note">
          Grid Orders: Doorzichtig groen = filled • Solid groen = unfilled
        </div>
        
        {drawMode && (
          <div className="draw-indicator">
            🎨 {pendingOpen === null 
              ? "Klik om OPEN prijs te zetten" 
              : `Open: $${pendingOpen.toFixed(4)} - Klik om CLOSE prijs te zetten`}
          </div>
        )}
        
        <canvas ref={chartRef} />
        <canvas ref={ovRef} />
      </div>
    </div>
  );
}