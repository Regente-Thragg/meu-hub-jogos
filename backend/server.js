import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const salas = new Map();

// Limite máximo de jogadores por jogo (inclui o admin)
const LIMITES = { adivinha: 2, stop: 4 };

// --- CONFIGURAÇÕES DO STOP ---
const MINIMO_STOP = 2;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CATEGORIAS_VALIDAS_STOP = [
  'nome', 'cep', 'animal', 'objeto', 'filme', 'cor', 'comida', 'profissao',
  'esporte', 'marca', 'famoso', 'flor', 'carro', 'parte_corpo', 'musica', 'sogra',
];
const CATEGORIAS_PADRAO_STOP = ['nome', 'cep', 'animal', 'objeto', 'filme', 'cor', 'comida', 'profissao'];

function novoEstadoStop() {
  return {
    categorias: [...CATEGORIAS_PADRAO_STOP],
    configurada: false,     // true quando o admin confirma as categorias
    emRodada: false,        // true enquanto uma rodada está acontecendo
    prontos: new Set(),     // quem já apertou "Sortear Letra e Iniciar"
  };
}

function montarLobbyStop(sala) {
  return sala.jogadores.map((id, i) => ({
    id,
    nome: i === 0 ? 'Admin' : `Jogador ${i + 1}`,
    pronto: sala.stop.prontos.has(id),
  }));
}

function emitirLobbyStop(codigo, sala) {
  io.to(codigo).emit('lobby-stop', { lobby: montarLobbyStop(sala) });
}

// Inicia a rodada se (e somente se) todos os jogadores da sala estiverem prontos
function tentarIniciarStop(codigo, sala) {
  const st = sala.stop;
  if (!st || !st.configurada || st.emRodada) return;
  if (sala.jogadores.length < MINIMO_STOP) return;
  if (!sala.jogadores.every((id) => st.prontos.has(id))) return;

  const letra = ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  st.emRodada = true;
  st.prontos.clear();
  io.to(codigo).emit('comecar-rodada-stop', { letra, categorias: st.categorias });
  emitirLobbyStop(codigo, sala);
  console.log(`🔤 Stop [${codigo}] iniciado com a letra ${letra} (${sala.jogadores.length} jogadores)`);
}

function categoriasStopValidas(categorias) {
  return (
    Array.isArray(categorias) &&
    categorias.length >= 3 &&
    categorias.length <= 8 &&
    new Set(categorias).size === categorias.length &&
    categorias.every((c) => CATEGORIAS_VALIDAS_STOP.includes(c))
  );
}

// Remove o socket de qualquer sala em que esteja (usado em sair-sala e disconnect)
function sairDaSala(socket) {
  for (const [codigo, sala] of salas) {
    if (!sala.jogadores.includes(socket.id)) continue;

    if (sala.host === socket.id) {
      // Host saiu: encerra a sala para todos
      socket.to(codigo).emit('sala-encerrada');
      io.socketsLeave(codigo);
      salas.delete(codigo);
      console.log(`🗑️ Sala [${codigo}] encerrada (host saiu)`);
    } else {
      sala.jogadores = sala.jogadores.filter((id) => id !== socket.id);
      socket.leave(codigo);
      // Se o participante era o líder, a liderança volta para o host
      if (sala.liderAtual === socket.id) sala.liderAtual = sala.host;
      io.to(codigo).emit('atualizar-sala', {
        totalJogadores: sala.jogadores.length,
        lider: sala.liderAtual,
      });

      if (sala.stop) {
        sala.stop.prontos.delete(socket.id);
        emitirLobbyStop(codigo, sala);
        tentarIniciarStop(codigo, sala); // se só faltava quem saiu, a rodada começa
      }
      console.log(`👋 ${socket.id} saiu da sala [${codigo}]`);
    }
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 Novo usuário conectado: ${socket.id}`);

  socket.on('criar-sala', ({ codigoSala, jogo }) => {
    if (!(jogo in LIMITES)) {
      socket.emit('erro', { mensagem: 'Jogo desconhecido.' });
      return;
    }
    if (salas.has(codigoSala)) {
      socket.emit('erro', { mensagem: 'Esse código já está em uso. Tente criar a sala de novo.' });
      return;
    }

    socket.join(codigoSala);
    salas.set(codigoSala, {
      jogo,
      host: socket.id,
      liderAtual: socket.id,
      jogadores: [socket.id],
      stop: jogo === 'stop' ? novoEstadoStop() : null,
    });
    socket.emit('sala-criada', {
      codigoSala,
      jogo,
      eHost: true,
      lider: socket.id,
      totalJogadores: 1,
    });
    console.log(`🎮 Sala [${codigoSala}] (${jogo}) criada por Host: ${socket.id}`);
  });

  socket.on('entrar-sala', (codigoSala) => {
    const sala = salas.get(codigoSala);
    if (!sala) {
      socket.emit('erro', { mensagem: 'Sala não encontrada!' });
      return;
    }

    const limiteJogadores = LIMITES[sala.jogo] ?? 2;

    if (!sala.jogadores.includes(socket.id)) {
      if (sala.jogadores.length >= limiteJogadores) {
        socket.emit('erro', { mensagem: `A sala já está cheia! (Máximo de ${limiteJogadores} jogadores)` });
        return;
      }
      sala.jogadores.push(socket.id);
    }

    socket.join(codigoSala);

    // Confirma só para quem entrou (o App só abre o jogo depois disso)
    socket.emit('sala-entrada', {
      codigoSala,
      jogo: sala.jogo,
      totalJogadores: sala.jogadores.length,
      lider: sala.liderAtual,
    });

    // Avisa todos (inclusive o admin) com contagem e líder atualizados
    io.to(codigoSala).emit('atualizar-sala', {
      totalJogadores: sala.jogadores.length,
      lider: sala.liderAtual,
    });

    if (sala.stop) emitirLobbyStop(codigoSala, sala);
    console.log(`👥 Usuário ${socket.id} entrou na sala [${codigoSala}] (${sala.jogadores.length}/${limiteJogadores})`);
  });

  socket.on('sair-sala', () => sairDaSala(socket));

  socket.on('acao-jogo', ({ codigoSala, dados }) => {
    const sala = salas.get(codigoSala);
    if (sala) {
      io.to(codigoSala).emit('atualizar-jogo', dados);
    }
  });

  socket.on('pedir-lideranca', ({ codigoSala }) => {
    const sala = salas.get(codigoSala);
    if (sala) {
      const outroJogador = sala.jogadores.find((id) => id !== sala.liderAtual);
      if (outroJogador) {
        sala.liderAtual = outroJogador;
        io.to(codigoSala).emit('mudar-lideranca', { novoLider: sala.liderAtual });
      }
    }
  });

  // =========================================================
  // EVENTOS DO STOP (ADEDONHA: MÍNIMO 2, MÁXIMO 4 JOGADORES)
  // =========================================================

  // Quem entra depois (ou monta a tela depois) pede o estado atual da sala
  socket.on('sincronizar-stop', ({ codigoSala }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || !sala.jogadores.includes(socket.id)) return;
    socket.emit('estado-stop', {
      categorias: sala.stop.categorias,
      configurada: sala.stop.configurada,
      emRodada: sala.stop.emRodada,
      lobby: montarLobbyStop(sala),
    });
  });

  // Só o admin escolhe as categorias; os demais veem em tempo real
  socket.on('acao-config-stop', ({ codigoSala, categorias }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || sala.host !== socket.id || sala.stop.emRodada) return;
    if (!categoriasStopValidas(categorias)) {
      socket.emit('erro', { mensagem: 'Escolha de 3 a 8 categorias válidas.' });
      return;
    }
    sala.stop.categorias = categorias;
    socket.to(codigoSala).emit('configurar-categorias', { categorias });
  });

  socket.on('confirmar-config-stop', ({ codigoSala }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || sala.host !== socket.id || sala.stop.emRodada) return;
    sala.stop.configurada = true;
    sala.stop.prontos.clear();
    io.to(codigoSala).emit('config-stop-confirmada', { categorias: sala.stop.categorias });
    emitirLobbyStop(codigoSala, sala);
  });

  socket.on('reabrir-config-stop', ({ codigoSala }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || sala.host !== socket.id || sala.stop.emRodada) return;
    sala.stop.configurada = false;
    sala.stop.prontos.clear();
    io.to(codigoSala).emit('config-stop-reaberta');
    emitirLobbyStop(codigoSala, sala);
  });

  // "Sortear Letra e Iniciar": marca o jogador como pronto. Quando TODOS estiverem prontos, a rodada começa.
  socket.on('pronto-stop', ({ codigoSala, pronto }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || !sala.jogadores.includes(socket.id)) return;
    const st = sala.stop;

    if (!st.configurada) {
      socket.emit('erro', { mensagem: 'O admin ainda está escolhendo as categorias.' });
      return;
    }
    if (st.emRodada) {
      socket.emit('erro', { mensagem: 'Aguarde o fim da rodada atual.' });
      return;
    }

    if (pronto) {
      if (sala.jogadores.length < MINIMO_STOP) {
        socket.emit('erro', { mensagem: `São necessários pelo menos ${MINIMO_STOP} jogadores para iniciar.` });
        return;
      }
      st.prontos.add(socket.id);
    } else {
      st.prontos.delete(socket.id);
    }

    emitirLobbyStop(codigoSala, sala);
    tentarIniciarStop(codigoSala, sala);
  });

  socket.on('apertar-stop', ({ codigoSala }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || !sala.jogadores.includes(socket.id) || !sala.stop.emRodada) return;
    // A rodada acaba aqui; avisa todos para pararem de digitar e enviarem o que preencheram
    sala.stop.emRodada = false;
    io.to(codigoSala).emit('stop-acionado', { quemApertou: socket.id });
  });

  socket.on('enviar-respostas-stop', ({ codigoSala, respostas }) => {
    const sala = salas.get(codigoSala);
    if (!sala?.stop || !sala.jogadores.includes(socket.id)) return;
    const indiceJogador = sala.jogadores.indexOf(socket.id) + 1;
    io.to(codigoSala).emit('jogador-enviou-respostas', {
      socketId: socket.id,
      nomeJogador: indiceJogador === 1 ? 'Admin (Jogador 1)' : `Jogador ${indiceJogador}`,
      respostas,
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Usuário desconectado: ${socket.id}`);
    sairDaSala(socket);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});