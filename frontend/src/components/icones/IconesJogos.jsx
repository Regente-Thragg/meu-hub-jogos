import React from 'react';

// Ícones próprios de cada jogo (SVG), usados no menu.
// Para um novo jogo, crie um novo ícone aqui e registre em src/games/catalogo.js

export function IconeOrigami({ size = 64, className = '' }) {
  const bolsos = [
    { x: 6,  y: 6,  c1: '#f87171', c2: '#dc2626' },
    { x: 34, y: 6,  c1: '#60a5fa', c2: '#2563eb' },
    { x: 6,  y: 34, c1: '#34d399', c2: '#059669' },
    { x: 34, y: 34, c1: '#fcd34d', c2: '#f59e0b' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        {bolsos.map((b, i) => (
          <linearGradient key={i} id={`ico-ori-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={b.c1} />
            <stop offset="1" stopColor={b.c2} />
          </linearGradient>
        ))}
      </defs>
      <path d="M32,22 L42,32 L32,42 L22,32 Z" fill="#0f172a" />
      {bolsos.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width="24" height="24" rx="5" fill={`url(#ico-ori-${i})`} />
          <path d={`M${b.x + 2},${b.y + 2} L${b.x + 22},${b.y + 2} L${b.x + 2},${b.y + 22} Z`} fill="rgba(0,0,0,0.16)" />
          <path d={`M${b.x + 22},${b.y + 2} L${b.x + 2},${b.y + 22}`} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

export function IconeStop({ size = 64, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ico-stop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path d="M22,4 H42 L60,22 V42 L42,60 H22 L4,42 V22 Z" fill="url(#ico-stop)" stroke="#fde68a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M24,9 H40 L55,24 V40 L40,55 H24 L9,40 V24 Z" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1e293b" fontFamily="system-ui, sans-serif">STOP</text>
    </svg>
  );
}