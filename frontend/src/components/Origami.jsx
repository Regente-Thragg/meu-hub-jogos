import React, { useEffect, useState } from 'react';

// Duração de cada movimento (abrir e fechar) do origami, em ms
export const PASSO_MS = 700;

// Tempo total da animação para N movimentos (+ uma pequena pausa no final)
export const duracaoAnimacao = (repeticoes) => (Number(repeticoes) || 0) * PASSO_MS + 300;

const Q = 60; // lado de cada "bolso" do origami

// sx / sy: em qual canto o bolso fica (-1 = esquerda/cima, 1 = direita/baixo)
const BOLSOS = [
  { cor: 'Vermelho', sx: -1, sy: -1, claro: '#f87171', escuro: '#dc2626' },
  { cor: 'Azul',     sx:  1, sy: -1, claro: '#60a5fa', escuro: '#2563eb' },
  { cor: 'Verde',    sx: -1, sy:  1, claro: '#34d399', escuro: '#059669' },
  { cor: 'Amarelo',  sx:  1, sy:  1, claro: '#fcd34d', escuro: '#f59e0b' },
];

// ox / oy: afastamento dos bolsos | hx: deslocamento horizontal das mãos
// ind / pol: ângulo (graus) do indicador e do polegar
const POSES = {
  neutro: { ox: 8,  oy: 8,  hx: 0,   ind: 0,     pol: 0 },
  h:      { ox: 30, oy: 1,  hx: -22, ind: 4,     pol: -4 },   // abre para os lados
  v:      { ox: 1,  oy: 30, hx: 7,   ind: -15,   pol: 15 },   // abre para cima e para baixo
};

const CONTORNO = '#c58b66';
const TRANSICAO = `transform ${PASSO_MS * 0.42}ms cubic-bezier(0.4, 0, 0.2, 1)`;

function Mao({ pose, espelhada }) {
  const p = POSES[pose];
  return (
    <g transform={espelhada ? 'translate(400,0) scale(-1,1)' : undefined}>
      <g style={{ transform: `translateX(${p.hx}px)`, transition: TRANSICAO }}>
        {/* Antebraço, manga e punho da blusa */}
        <rect x="-60" y="132" width="110" height="76" rx="10" fill="url(#og-pele)" stroke={CONTORNO} strokeWidth="1.5" />
        <path d="M-60,118 H24 Q34,118 34,128 V218 Q34,228 24,228 H-60 Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
        <rect x="24" y="116" width="14" height="114" rx="6" fill="#818cf8" stroke="#4f46e5" strokeWidth="1.5" />

        {/* Palma / costas da mão */}
        <path
          d="M40,132 Q40,112 62,110 L100,111 Q116,113 116,130 L116,192 Q116,218 94,220 L62,220 Q40,218 40,196 Z"
          fill="url(#og-pele)" stroke={CONTORNO} strokeWidth="1.5"
        />
        <path d="M50,150 Q75,146 102,142 M50,166 Q75,165 102,160" fill="none" stroke="#d6a07e" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
        <path d="M44,200 Q70,218 112,200 L112,205 Q80,226 44,206 Z" fill="rgba(160,90,50,0.14)" />

        {/* Base do polegar */}
        <ellipse cx="84" cy="196" rx="38" ry="22" fill="url(#og-pele)" />

        {/* Dedos dobrados (médio, anelar e mindinho) */}
        {[134, 145, 156].map((y) => (
          <g key={y}>
            <rect x="98" y={y} width="34" height="11" rx="5.5" fill="url(#og-pele)" stroke={CONTORNO} strokeWidth="1.2" />
            <path d={`M${106},${y + 3} H${124}`} stroke="#fff" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        ))}

        {/* Indicador */}
        <g style={{ transform: `rotate(${p.ind}deg)`, transformOrigin: '96px 119px', transition: TRANSICAO }}>
          <rect x="92" y="106" width="88" height="26" rx="13" fill="url(#og-pele)" stroke={CONTORNO} strokeWidth="1.5" />
          <path d="M122,110 Q119,119 122,128 M146,110 Q143,119 146,128" fill="none" stroke="#d6a07e" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="156" y="111" width="20" height="15" rx="6.5" fill="#fff1ea" stroke="#e5b7a1" strokeWidth="1.2" />
          <path d="M100,111 H148" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Polegar */}
        <g style={{ transform: `rotate(${p.pol}deg)`, transformOrigin: '96px 182px', transition: TRANSICAO }}>
          <rect x="88" y="167" width="94" height="31" rx="15.5" fill="url(#og-pele)" stroke={CONTORNO} strokeWidth="1.5" />
          <path d="M128,171 Q124,182 128,193" fill="none" stroke="#d6a07e" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="158" y="173" width="21" height="18" rx="7" fill="#fff1ea" stroke="#e5b7a1" strokeWidth="1.2" />
          <path d="M96,172 H150" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

export default function Origami({ animando = false, repeticoes = 0, corDestaque = '' }) {
  const [pose, setPose] = useState('neutro');
  const [contagem, setContagem] = useState(0);

  useEffect(() => {
    if (!animando || !repeticoes) {
      setPose('neutro');
      setContagem(0);
      return;
    }

    // Um movimento por repetição, alternando: abre para os lados, abre para cima/baixo...
    const timers = [];
    for (let i = 0; i < repeticoes; i++) {
      const inicio = i * PASSO_MS;
      timers.push(setTimeout(() => {
        setPose(i % 2 === 0 ? 'h' : 'v');
        setContagem(i + 1);
      }, inicio));
      timers.push(setTimeout(() => setPose('neutro'), inicio + PASSO_MS * 0.5));
    }
    return () => timers.forEach(clearTimeout);
  }, [animando, repeticoes]);

  const p = POSES[pose];

  return (
    <div className="mb-4">
      <svg viewBox="0 0 400 250" className="w-full max-w-sm mx-auto overflow-hidden" role="img" aria-label="Mãos movendo o origami">
        <defs>
          <linearGradient id="og-pele" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fddcc2" />
            <stop offset="1" stopColor="#f0b78f" />
          </linearGradient>
          {BOLSOS.map((b) => (
            <linearGradient key={b.cor} id={`og-${b.cor}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={b.claro} />
              <stop offset="1" stopColor={b.escuro} />
            </linearGradient>
          ))}
        </defs>

        <ellipse cx="200" cy="238" rx="86" ry="9" fill="#000" opacity="0.25" />

        {/* Origami */}
        <g transform="translate(200,150)">
          {/* Interior escuro, visível quando os bolsos se abrem */}
          <rect x="-30" y="-61" width="60" height="122" rx="6" fill="#0b1220" />
          <rect x="-61" y="-30" width="122" height="60" rx="6" fill="#0b1220" />
          <path d="M0,-24 L24,0 L0,24 L-24,0 Z" fill="#1e293b" />

          {BOLSOS.map((b) => {
            const destaque = corDestaque === b.cor;
            return (
              <g
                key={b.cor}
                style={{
                  transform: `translate(${b.sx * p.ox}px, ${b.sy * p.oy}px) scale(${b.sx}, ${b.sy})`,
                  transition: TRANSICAO,
                }}
              >
                <rect
                  width={Q} height={Q} rx="6" fill={`url(#og-${b.cor})`}
                  stroke={destaque ? '#ffffff' : 'rgba(0,0,0,0.25)'} strokeWidth={destaque ? 3 : 1.2}
                />
                {/* Dobra do papel */}
                <path d={`M3,3 L${Q - 4},3 L3,${Q - 4} Z`} fill="rgba(0,0,0,0.18)" />
                <path d={`M${Q - 3},3 L3,${Q - 3}`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Mãos (por cima do papel, segurando os bolsos) */}
        <Mao pose={pose} espelhada={false} />
        <Mao pose={pose} espelhada />
      </svg>

      {animando && (
        <p className="text-center text-xs font-semibold text-amber-300 mt-1">
          Movimento {contagem} de {repeticoes}
        </p>
      )}
    </div>
  );
}