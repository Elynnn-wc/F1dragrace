import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

/** 车队配置（链接可替换为你的落地页） */
const TEAMS = [
  { id: "redbull",  name: "Red Bull",  color: "#1E90FF", car: "https://media.formula1.com/image/upload/c_lfill,w_600/q_auto/v1740000000/common/f1/2025/redbullracing/2025redbullracingcarright.webp", link: "https://promo.redbull.com" },
  { id: "ferrari",  name: "Ferrari",  color: "#DC0000",  car: "https://media.formula1.com/image/upload/c_lfill,w_600/q_auto/v1740000000/common/f1/2025/ferrari/2025ferraricarright.webp",      link: "https://promo.ferrari.com" },
  { id: "mercedes", name: "Mercedes", color: "#00D2BE",  car: "https://media.formula1.com/image/upload/c_lfill,w_600/q_auto/v1740000000/common/f1/2025/mercedes/2025mercedescarright.webp",   link: "https://promo.mercedes.com" },
  { id: "mclaren",  name: "McLaren",  color: "#FF8700",  car: "https://media.formula1.com/image/upload/c_lfill,w_600/q_auto/v1740000000/common/f1/2025/mclaren/2025mclarencarright.webp",    link: "https://promo.mclaren.com" },
  { id: "alpine",   name: "Alpine",   color: "#0061FF",  car: "https://media.formula1.com/image/upload/c_lfill,w_600/q_auto/v1740000000/common/f1/2025/alpine/2025alpinecarright.webp",     link: "https://promo.alpine.com" },
];

const TRACK_LEN = 1600;      // 赛道长度（px，越大越久）
const BASE_MS   = 5600;      // 基础完赛时间（毫秒）

export default function F1DragRace() {
  const [selected, setSelected] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [lights, setLights]   = useState(0);
  const [winner, setWinner]   = useState(null);
  const [showModal, setShowModal] = useState(false);

  // DOM refs
  const carRefs = useRef(Array(TEAMS.length).fill(null));
  const contentRef = useRef(null);   // 相机跟随的容器
  const viewRef    = useRef(null);
  const dimsRef    = useRef({ vw: 0, cw: 0 });

  // 重置
  const reset = () => {
    setIsRacing(false); setWinner(null); setShowModal(false); setLights(0);
    carRefs.current.forEach(el => el && (el.style.transform = "translateX(0px)"));
    if (contentRef.current) contentRef.current.style.transform = "translate3d(0,0,0)";
  };

  // 发车红灯
  const startLights = () => {
    if (!selected || isRacing) return;
    setLights(1);
    let step = 1;
    const timer = setInterval(() => {
      step++;
      if (step <= 5) setLights(step);
      else { clearInterval(timer); setLights(0); requestAnimationFrame(startRace); }
    }, 650);
  };

  // 比赛：动态加减速 + 相机跟随 + 冲线彩带
  const startRace = () => {
    setIsRacing(true);

    // 相机尺寸
    if (viewRef.current && contentRef.current) {
      const vw = viewRef.current.getBoundingClientRect().width;
      const cw = Math.max(TRACK_LEN + 200, vw);
      dimsRef.current = { vw, cw };
    }

    const winIdx = Math.floor(Math.random() * TEAMS.length);
    const start  = performance.now();
    const laneDur = TEAMS.map((_, i) => BASE_MS * (i === winIdx ? 0.88 : 0.96 + Math.random()*0.22));

    const ease = (x) => 1 - Math.pow(1 - x, 3);

    const step = (now) => {
      const t = now - start;
      let finished = -1;

      // 车体移动
      for(let i=0;i<TEAMS.length;i++){
        const el = carRefs.current[i]; if(!el) continue;
        const p = Math.min(1, t / laneDur[i]);
        // 动态波动：越前期波动越大
        const wave = Math.sin((t/140) + i) * 0.04 * (1 - p) + Math.sin(t/330 + i*2) * 0.02 * (1 - p);
        const eased = Math.min(1, Math.max(0, ease(p) + wave));
        const x = eased * (TRACK_LEN - 110);
        el.style.transform = `translateX(${x}px)`;
        if (finished === -1 && p >= 1) finished = i;
      }

      // 相机跟随：优先玩家选中，否则跟随胜者
      if (contentRef.current){
        const followIdx = selected ? TEAMS.findIndex(t => t.id === selected) : winIdx;
        const followEl = carRefs.current[followIdx];
        if (followEl){
          const m = /translateX\(([-0-9.]+)px\)/.exec(followEl.style.transform);
          const carX = m ? parseFloat(m[1]) : 0;
          const { vw, cw } = dimsRef.current;
          const target = clamp(carX + 160 - vw * 0.5, 0, cw - vw);
          contentRef.current.style.transition = "transform 60ms linear";
          contentRef.current.style.transform = `translate3d(${-target}px,0,0)`;
        }
      }

      // 发光的终点线（快到了就加 glow）
      const wp = Math.min(1, t / laneDur[winIdx]);
      const strip = viewRef.current?.querySelector(".finish-strip");
      if (strip) strip.classList.toggle("glow", wp > 0.9);

      if (finished !== -1){
        setWinner(TEAMS[finished]);
        setIsRacing(false);
        setTimeout(() => {
          // 彩带
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 } });
          setShowModal(true);
        }, 450);
        return;
      }
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  useEffect(()=>()=>reset(),[]);

  return (
    <div className="relative z-10">
      {/* 背景速度线 */}
      <div className="bg-speeds"></div>

      {/* 标题 & 选择 */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🏁 F1 Drag Race</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {TEAMS.map((t, i)=>(
            <button key={t.id}
              onClick={()=>!isRacing && setSelected(t.id)}
              className={`rounded-2xl border bg-slate-800/60 hover:bg-slate-800 transition p-3 ${selected===t.id?'ring-2 ring-yellow-400 border-transparent':'border-slate-600/60'}`}>
              <img src={t.car} alt={t.name} className="h-10 mx-auto object-contain" />
              <div className="mt-2 text-center text-sm font-medium" style={{color:t.color}}>{t.name}</div>
            </button>
          ))}
        </div>

        {/* 控制区 + 发车灯 */}
        <div className="flex items-center gap-3 mb-4">
          <button disabled={!selected || isRacing}
            onClick={startLights}
            className={`px-4 py-2 rounded-xl font-semibold transition
              ${(!selected||isRacing)?'bg-slate-600 cursor-not-allowed':'bg-red-600 hover:bg-red-700'}`
            }>
            START RACE
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-slate-600">Reset</button>

          <div className="ml-4 start-grid">
            {[1,2,3,4,5].map(n=>(
              <span key={n} className={`start-dot ${n<=lights?'on':''}`}></span>
            ))}
          </div>
        </div>

        {/* 赛道（相机视窗 + 可平移内容） */}
        <div className="track-wrap">
          <div className="px-4 py-3 text-sm text-slate-300">2) Watch them sprint down the track ➝</div>

          <div ref={viewRef} className="track-window">
            <div ref={contentRef} className="track-content track-pad" style={{minWidth: `${TRACK_LEN+200}px`}}>
              {TEAMS.map((t, i)=>(
                <div key={t.id} className="lane">
                  <div className="lane-label">{t.name}</div>

                  {/* 车体 + 尾气 + 火花 */}
                  <div className="car-wrap">
                    <div className="heat" />
                    <img ref={el => carRefs.current[i]=el} src={t.car} alt={t.name} className="car-img" />
                    {isRacing && <Sparks />}
                  </div>

                  {/* 终点线 */}
                  <div className="finish-col">
                    <div className="finish-flag">FINISH</div>
                    <div className="finish-strip" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 结果弹窗 */}
      {showModal && winner && (
        <div className="modal-bg" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="text-lg font-bold mb-2">🏁 {winner.name} wins the sprint!</div>
            {selected===winner.id ? (
              <a href={winner.link} target="_blank" rel="noreferrer"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold">
                🎉 恭喜！点击领取奖励
              </a>
            ) : (
              <div className="text-slate-700">差一点点！再来一局～</div>
            )}
            <div className="mt-3 text-right">
              <button onClick={()=>setShowModal(false)} className="px-3 py-1 rounded bg-slate-800 text-white">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sparks(){
  const nodes = [];
  for(let i=0;i<8;i++){
    const y = Math.random()*16; const x = - (8 + Math.random()*26);
    const size = 2 + Math.random()*3;
    const colors = ['#FFA500','#FFC107','#FFD166','#FF6A00','#FFB703','#FFE14D'];
    const c = colors[(Math.random()*colors.length)|0];
    const delay = Math.random()*180; const dur = 280 + Math.random()*360;
    const blur = Math.random()<0.5 ? 1 : 0;
    nodes.push(
      <span key={i} className="spark"
        style={{
          left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
          background: c, boxShadow:`0 0 ${Math.max(2,size)}px ${c}`,
          filter: blur?`blur(${blur}px)`:'none',
          animation: `sparkFade ${dur}ms ease-out ${delay}ms infinite`
        }}/>
    );
  }
  return <div className="sparkbox">{nodes}</div>;
}
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
