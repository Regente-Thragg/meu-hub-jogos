import AdivinhaGame from './adivinha/AdivinhaGame';
import StopGame from './stop/StopGame';
import { IconeOrigami, IconeStop } from '../components/icones/IconesJogos';

// =====================================================================
// CATÁLOGO DE JOGOS
// Para publicar um novo jogo no menu:
//   1. crie o componente em src/games/<nome>/ (ele recebe: socket,
//      codigoSala, voltarHome, totalJogadores e lider)
//   2. crie um ícone em components/icones/IconesJogos.jsx
//   3. adicione um objeto aqui embaixo
//   4. no backend/server.js, inclua o id do jogo em LIMITES
// As classes do Tailwind precisam estar escritas por extenso (não montar
// com template string), senão o Tailwind não as encontra.
// =====================================================================
export const JOGOS = [
  {
    id: 'adivinha',
    nome: 'Origami Adivinha',
    descricao: 'O clássico do recreio: escolha uma cor e um número e descubra o seu destino.',
    jogadores: '2 jogadores',
    Icone: IconeOrigami,
    Componente: AdivinhaGame,
    tema: {
      faixa: 'from-emerald-500/25 to-teal-500/5',
      borda: 'hover:border-emerald-500/60',
      botao: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      chip: 'text-emerald-300',
    },
  },
  {
    id: 'stop',
    nome: 'Stop! (Adedonha)',
    descricao: 'Uma letra é sorteada e você preenche as categorias antes que alguém grite Stop!',
    jogadores: '2 a 4 jogadores',
    Icone: IconeStop,
    Componente: StopGame,
    tema: {
      faixa: 'from-amber-500/25 to-orange-500/5',
      borda: 'hover:border-amber-500/60',
      botao: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
      chip: 'text-amber-300',
    },
  },
];