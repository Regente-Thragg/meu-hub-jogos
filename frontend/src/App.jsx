import React, { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './services/socket';
import AdivinhaGame from './games/adivinha/AdivinhaGame';
import ToastContainer from './components/Toast';

export default function App() {
  const [conectado, setConectado] = useState(socket.connected);
  const [codigoSala, setCodigoSala] = useState('');
  const [inputSala, setInputSala] = useState('');
  const [emJogo, setEmJogo] = useState(false);
  const [totalJogadores, setTotalJogadores] = useState(1);
  const [lider, setLider] = useState('');
  const [toasts, setToasts] = useState([]);

  // Guarda o total anterior para saber se alguém entrou ou saiu
  const totalRef = useRef(1);

  const removerToast = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  // tipo: 'sucesso' | 'erro' | 'info'
  const notificar = useCallback((mensagem, tipo = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => removerToast(id), 4000);
  }, [removerToast]);

  useEffect(() => {
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Admin: sala criada
    socket.on('sala-criada', ({ codigoSala, lider, totalJogadores }) => {
      const total = totalJogadores ?? 1;
      totalRef.current = total;
      setCodigoSala(codigoSala);
      setLider(lider);
      setTotalJogadores(total);
      setEmJogo(true);
      notificar(`Sala ${codigoSala} criada! Compartilhe o código.`, 'sucesso');
    });

    // Participante: servidor confirmou a entrada
    socket.on('sala-entrada', ({ codigoSala, lider, totalJogadores }) => {
      totalRef.current = totalJogadores;
      setCodigoSala(codigoSala);
      setLider(lider);
      setTotalJogadores(totalJogadores);
      setEmJogo(true);
      notificar('Você entrou na sala!', 'sucesso');
    });

    // Contagem e líder atualizados (para todos na sala)
    socket.on('atualizar-sala', ({ totalJogadores, lider }) => {
      if (totalJogadores !== undefined) {
        if (totalJogadores > totalRef.current) notificar('O participante entrou na sala!', 'sucesso');
        if (totalJogadores < totalRef.current) notificar('O participante saiu da sala.', 'info');
        totalRef.current = totalJogadores;
        setTotalJogadores(totalJogadores);
      }
      if (lider) setLider(lider);
    });

    socket.on('mudar-lideranca', ({ novoLider }) => {
      setLider(novoLider);
      notificar('Os papéis foram invertidos!', 'info');
    });

    socket.on('sala-encerrada', () => {
      setEmJogo(false);
      setCodigoSala('');
      setLider('');
      totalRef.current = 1;
      notificar('O admin saiu e a sala foi encerrada.', 'info');
    });

    socket.on('erro', ({ mensagem }) => {
      notificar(mensagem, 'erro');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sala-criada');
      socket.off('sala-entrada');
      socket.off('atualizar-sala');
      socket.off('mudar-lideranca');
      socket.off('sala-encerrada');
      socket.off('erro');
    };
  }, [notificar]);

  const criarSala = () => {
    const codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit('criar-sala', { codigoSala: codigo, jogo: 'adivinha' });
  };

  const entrarSala = (e) => {
    e.preventDefault();
    if (!inputSala.trim()) return;
    // Só emite; o jogo abre quando o servidor responder 'sala-entrada'
    socket.emit('entrar-sala', inputSala.trim().toUpperCase());
  };

  const voltarHome = () => {
    socket.emit('sair-sala');
    setEmJogo(false);
    setCodigoSala('');
    setLider('');
    setTotalJogadores(1);
    totalRef.current = 1;
  };

  return (
    <>
      <ToastContainer toasts={toasts} remover={removerToast} />

      {emJogo ? (
        <AdivinhaGame
          socket={socket}
          codigoSala={codigoSala}
          voltarHome={voltarHome}
          totalJogadores={totalJogadores}
          lider={lider}
        />
      ) : (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-700">
            <h1 className="text-3xl font-bold mb-2 text-emerald-400">Hub de Jogos Clássicos</h1>
            <p className="text-slate-400 text-sm mb-6">Relembre os clássicos do recreio online!</p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className={`w-3 h-3 rounded-full ${conectado ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-sm text-slate-300">
                {conectado ? 'Conectado ao Servidor' : 'Desconectado'}
              </span>
            </div>

            <button
              onClick={criarSala}
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition font-semibold py-3 rounded-xl shadow-lg mb-6 cursor-pointer"
            >
              Criar Nova Sala (Adivinha)
            </button>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-sm">ou entrar em uma sala</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <form onSubmit={entrarSala} className="flex gap-2">
              <input
                type="text"
                placeholder="Código da Sala"
                value={inputSala}
                onChange={(e) => setInputSala(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white uppercase focus:outline-none focus:border-emerald-500 font-mono"
                maxLength={4}
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 transition px-6 py-2 rounded-xl font-semibold cursor-pointer shadow"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}