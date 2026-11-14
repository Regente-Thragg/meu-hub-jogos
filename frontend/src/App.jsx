import React, { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './services/socket';
import { JOGOS } from './games/catalogo';
import ToastContainer from './components/Toast';
import MenuJogos from './components/MenuJogos';

export default function App() {
  const [conectado, setConectado] = useState(socket.connected);
  const [codigoSala, setCodigoSala] = useState('');
  const [inputSala, setInputSala] = useState('');
  const [emJogo, setEmJogo] = useState(false);
  const [jogoAtual, setJogoAtual] = useState(''); // id do jogo (veja src/games/catalogo.js)
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
    const aoConectar = () => setConectado(true);
    const aoDesconectar = () => setConectado(false);
    socket.on('connect', aoConectar);
    socket.on('disconnect', aoDesconectar);
    // O socket pode ter conectado ANTES deste efeito rodar; sincroniza o estado atual
    setConectado(socket.connected);

    // Admin: sala criada
    socket.on('sala-criada', ({ codigoSala, lider, totalJogadores, jogo }) => {
      const total = totalJogadores ?? 1;
      totalRef.current = total;
      setCodigoSala(codigoSala);
      setLider(lider);
      setTotalJogadores(total);
      if (jogo) setJogoAtual(jogo);
      setEmJogo(true);
      notificar(`Sala ${codigoSala} criada! Compartilhe o código.`, 'sucesso');
    });

    // Participante: servidor confirmou a entrada
    socket.on('sala-entrada', ({ codigoSala, lider, totalJogadores, jogo }) => {
      totalRef.current = totalJogadores;
      setCodigoSala(codigoSala);
      setLider(lider);
      setTotalJogadores(totalJogadores);
      if (jogo) setJogoAtual(jogo);
      setEmJogo(true);
      notificar('Você entrou na sala!', 'sucesso');
    });

    // Contagem e líder atualizados (para todos na sala)
    socket.on('atualizar-sala', ({ totalJogadores, lider }) => {
      if (totalJogadores !== undefined) {
        if (totalJogadores > totalRef.current) notificar('Novo participante entrou na sala!', 'sucesso');
        if (totalJogadores < totalRef.current) notificar('Um participante saiu da sala.', 'info');
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
      setJogoAtual('');
      totalRef.current = 1;
      notificar('O admin saiu e a sala foi encerrada.', 'info');
    });

    socket.on('erro', ({ mensagem }) => {
      notificar(mensagem, 'erro');
    });

    return () => {
      socket.off('connect', aoConectar);
      socket.off('disconnect', aoDesconectar);
      socket.off('sala-criada');
      socket.off('sala-entrada');
      socket.off('atualizar-sala');
      socket.off('mudar-lideranca');
      socket.off('sala-encerrada');
      socket.off('erro');
    };
  }, [notificar]);

  const criarSala = (idJogo) => {
    const codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit('criar-sala', { codigoSala: codigo, jogo: idJogo });
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
    setJogoAtual('');
    setTotalJogadores(1);
    totalRef.current = 1;
  };

  const JogoAtual = JOGOS.find((j) => j.id === jogoAtual)?.Componente;

  return (
    <>
      <ToastContainer toasts={toasts} remover={removerToast} />

      {emJogo && JogoAtual ? (
        <JogoAtual
          socket={socket}
          codigoSala={codigoSala}
          voltarHome={voltarHome}
          totalJogadores={totalJogadores}
          lider={lider}
        />
      ) : (
        <MenuJogos
          conectado={conectado}
          aoCriarSala={criarSala}
          inputSala={inputSala}
          setInputSala={setInputSala}
          aoEntrarSala={entrarSala}
        />
      )}
    </>
  );
}