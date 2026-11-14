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
      console.log(`👋 ${socket.id} saiu da sala [${codigo}]`);
    }
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 Novo usuário conectado: ${socket.id}`);

  socket.on('criar-sala', ({ codigoSala, jogo }) => {
    socket.join(codigoSala);
    salas.set(codigoSala, {
      jogo,
      host: socket.id,
      liderAtual: socket.id,
      jogadores: [socket.id],
    });
    socket.emit('sala-criada', {
      codigoSala,
      eHost: true,
      lider: socket.id,
      totalJogadores: 1,
    });
    console.log(`🎮 Sala [${codigoSala}] criada por Host: ${socket.id}`);
  });

  socket.on('entrar-sala', (codigoSala) => {
    const sala = salas.get(codigoSala);
    if (!sala) {
      socket.emit('erro', { mensagem: 'Sala não encontrada!' });
      return;
    }

    if (!sala.jogadores.includes(socket.id)) {
      if (sala.jogadores.length >= 2) {
        socket.emit('erro', { mensagem: 'A sala já está cheia!' });
        return;
      }
      sala.jogadores.push(socket.id);
    }

    socket.join(codigoSala);

    // Confirma só para quem entrou (o App só abre o jogo depois disso)
    socket.emit('sala-entrada', {
      codigoSala,
      totalJogadores: sala.jogadores.length,
      lider: sala.liderAtual,
    });

    // Avisa todos (inclusive o admin) com contagem e líder atualizados
    io.to(codigoSala).emit('atualizar-sala', {
      totalJogadores: sala.jogadores.length,
      lider: sala.liderAtual,
    });
    console.log(`👥 Usuário ${socket.id} entrou na sala [${codigoSala}]`);
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

  socket.on('disconnect', () => {
    console.log(`❌ Usuário desconectado: ${socket.id}`);
    sairDaSala(socket);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});