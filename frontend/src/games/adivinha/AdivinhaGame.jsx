import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, ArrowLeft, RefreshCw, Play } from 'lucide-react';
import Origami, { duracaoAnimacao } from '../../components/Origami';

// totalJogadores e lider vêm do App (fonte única da verdade, atualizada pelo servidor)
export default function AdivinhaGame({ socket, codigoSala, voltarHome, totalJogadores = 1, lider = '' }) {
  const [etapa, setEtapa] = useState('ESCOLHER_COR');
  const [corEscolhida, setCorEscolhida] = useState('');
  const [numeroEscolhido, setNumeroEscolhido] = useState(null);
  const [abaEscolhida, setAbaEscolhida] = useState(null);
  const [corTemp, setCorTemp] = useState('');
  const [numTemp, setNumTemp] = useState(null);

  const souOLider = lider === socket.id; // lider = admin (quem roda o origami)

  const cores = [
    { nome: 'Vermelho', cor: 'bg-red-500 hover:bg-red-600 text-white' },
    { nome: 'Azul', cor: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { nome: 'Verde', cor: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { nome: 'Amarelo', cor: 'bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold' }
  ];

  const abasInternas = {
    1: "Você vai tirar 10 na próxima prova! 🎯",
    2: "Vai pagar 10 flexões agora mesmo! 💪",
    3: "O amor da sua vida começa com a letra J ❤️",
    4: "Vai ganhar um chocolate hoje 🍫",
    5: "Alguém secreto está pensando em você... 👀",
    6: "Sorte grande: ganhe um abraço! 🤗",
    7: "Cuidado: dia de fofocas! 🤐",
    8: "Você será o líder da turma amanhã 👑"
  };

  const reiniciarEstadoLocal = () => {
    setEtapa('ESCOLHER_COR');
    setCorEscolhida('');
    setNumeroEscolhido(null);
    setAbaEscolhida(null);
    setCorTemp('');
    setNumTemp(null);
  };

  // Sincroniza o estado do jogo entre os dois jogadores
  useEffect(() => {
    const aoAtualizarJogo = (dados) => {
      if (dados.etapa !== undefined) setEtapa(dados.etapa);
      if (dados.corEscolhida !== undefined) setCorEscolhida(dados.corEscolhida);
      if (dados.numeroEscolhido !== undefined) setNumeroEscolhido(dados.numeroEscolhido);
      if (dados.abaEscolhida !== undefined) setAbaEscolhida(dados.abaEscolhida);
      // Reset completo vindo do outro jogador
      if (dados.etapa === 'ESCOLHER_COR') {
        setCorTemp('');
        setNumTemp(null);
      }
    };

    socket.on('atualizar-jogo', aoAtualizarJogo);
    return () => socket.off('atualizar-jogo', aoAtualizarJogo);
  }, [socket]);

  // Troca de líder: reinicia a rodada
  useEffect(() => {
    reiniciarEstadoLocal();
  }, [lider]);

  // Participante saiu: volta ao início da rodada
  useEffect(() => {
    if (totalJogadores < 2) reiniciarEstadoLocal();
  }, [totalJogadores]);

  const enviarAcao = (novosDados) => {
    socket.emit('acao-jogo', { codigoSala, dados: novosDados });
  };

  const confirmarEscolhaInicial = () => {
    if (!corTemp || !numTemp) return;
    setCorEscolhida(corTemp);
    setNumeroEscolhido(numTemp);
    const proximaEtapa = 'AGUARDANDO_RODAR_1';
    setEtapa(proximaEtapa);
    enviarAcao({ etapa: proximaEtapa, corEscolhida: corTemp, numeroEscolhido: numTemp });
  };

  const rodarPrimeiraFase = () => {
    const proximaEtapa = 'ANIMANDO_1';
    setEtapa(proximaEtapa);
    enviarAcao({ etapa: proximaEtapa });

    setTimeout(() => {
      const etapaAbas = 'ESCOLHER_ABA';
      setEtapa(etapaAbas);
      enviarAcao({ etapa: etapaAbas });
    }, duracaoAnimacao(numeroEscolhido));
  };

  const selecionarAba = (numAba) => {
    setAbaEscolhida(numAba);
    const proximaEtapa = 'AGUARDANDO_RODAR_2';
    setEtapa(proximaEtapa);
    enviarAcao({ etapa: proximaEtapa, abaEscolhida: numAba });
  };

  const rodarSegundaFase = () => {
    const proximaEtapa = 'ANIMANDO_2';
    setEtapa(proximaEtapa);
    enviarAcao({ etapa: proximaEtapa });

    setTimeout(() => {
      const etapaRevelar = 'REVELAR';
      setEtapa(etapaRevelar);
      enviarAcao({ etapa: etapaRevelar });
    }, duracaoAnimacao(abaEscolhida));
  };

  const reiniciarJogo = () => {
    reiniciarEstadoLocal();
    enviarAcao({ etapa: 'ESCOLHER_COR', corEscolhida: '', numeroEscolhido: null, abaEscolhida: null });
  };

  const pedirTrocaLideranca = () => {
    socket.emit('pedir-lideranca', { codigoSala });
  };

  // Status mostrado no topo, de acordo com o papel de quem está vendo
  const renderStatus = () => {
    const base = 'font-semibold flex items-center gap-1.5';
    const dot = (c) => <span className={`w-2 h-2 rounded-full ${c}`}></span>;

    if (totalJogadores < 2) {
      return (
        <span className={`${base} text-rose-500`}>
          {dot('bg-rose-500')} {souOLider ? 'Nenhum participante ainda' : 'Aguardando o admin...'}
        </span>
      );
    }

    if (!souOLider) {
      return (
        <span className={`${base} text-blue-400`}>
          {dot('bg-blue-400')} Conectado ao admin
        </span>
      );
    }

    // Visão do admin
    if (etapa === 'ESCOLHER_COR' || etapa === 'ESCOLHER_ABA') {
      return (
        <span className={`${base} text-amber-400 animate-pulse`}>
          {dot('bg-amber-400')} Participante fazendo as escolhas
        </span>
      );
    }
    if (etapa === 'AGUARDANDO_RODAR_1' || etapa === 'AGUARDANDO_RODAR_2') {
      return (
        <span className={`${base} text-emerald-400`}>
          {dot('bg-emerald-400')} Participante pronto: sua vez de rodar
        </span>
      );
    }
    return (
      <span className={`${base} text-blue-400`}>
        {dot('bg-blue-400')} Participante online
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <button
        onClick={voltarHome}
        className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft size={20} /> Sair da Sala
      </button>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-emerald-400 flex items-center justify-center gap-2">
          <Sparkles className="text-amber-400" /> Origami Adivinha
        </h1>
        <p className="text-sm text-slate-400 mb-2">Sala: <span className="font-mono text-emerald-300 font-bold">{codigoSala}</span></p>

        <div className="mb-6 inline-block bg-slate-900 px-4 py-1.5 rounded-full border border-slate-700 text-xs">
          {renderStatus()}
        </div>

        {/* ORIGAMI COM AS MÃOS: fica montado do "aguardando" até o fim da animação */}
        {['AGUARDANDO_RODAR_1', 'ANIMANDO_1', 'AGUARDANDO_RODAR_2', 'ANIMANDO_2'].includes(etapa) && (
          <Origami
            animando={etapa === 'ANIMANDO_1' || etapa === 'ANIMANDO_2'}
            repeticoes={etapa.endsWith('_1') ? numeroEscolhido : abaEscolhida}
            corDestaque={corEscolhida}
          />
        )}

        {/* ETAPA 1: ESCOLHER COR E NÚMERO */}
        {etapa === 'ESCOLHER_COR' && (
          <div>
            {!souOLider ? (
              <div className="space-y-4">
                <p className="text-lg font-medium text-emerald-300">Faça as suas escolhas:</p>
                <div>
                  <p className="text-sm text-slate-400 mb-2">1. Escolha uma cor:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {cores.map((item) => (
                      <button
                        key={item.nome}
                        onClick={() => setCorTemp(item.nome)}
                        className={`p-4 rounded-xl shadow font-bold transition cursor-pointer border-2 ${
                          corTemp === item.nome ? 'border-white scale-105' : 'border-transparent'
                        } ${item.cor}`}
                      >
                        {item.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {corTemp && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">2. Escolha o número de repetições (1 a 10):</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setNumTemp(num)}
                          className={`p-2 rounded-lg font-bold transition cursor-pointer ${
                            numTemp === num ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {corTemp && numTemp && (
                  <button
                    onClick={confirmarEscolhaInicial}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 transition font-semibold py-3 rounded-xl cursor-pointer shadow-lg"
                  >
                    Confirmar Escolhas para o Admin
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8">
                {totalJogadores < 2 ? (
                  <p className="text-slate-400 text-sm">Aguardando o participante entrar na sala...</p>
                ) : (
                  <p className="text-xl font-medium animate-pulse text-amber-300">
                    O participante está escolhendo a cor e o número...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AGUARDANDO ADMIN RODAR (Fase 1) */}
        {etapa === 'AGUARDANDO_RODAR_1' && (
          <div>
            <div className="bg-slate-900 p-4 rounded-xl mb-6 border border-slate-700">
              <p className="text-sm text-slate-400">Escolhas feitas:</p>
              <p className="text-lg font-bold text-emerald-400">Cor: {corEscolhida} | Número: {numeroEscolhido}</p>
            </div>

            {souOLider ? (
              <button
                onClick={rodarPrimeiraFase}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 transition font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg text-lg animate-bounce"
              >
                <Play size={22} /> Rodar Origami ({numeroEscolhido}x)
              </button>
            ) : (
              <p className="text-slate-400 italic animate-pulse">Aguardando o Admin rodar o origami...</p>
            )}
          </div>
        )}

        {/* ANIMANDO */}
        {(etapa === 'ANIMANDO_1' || etapa === 'ANIMANDO_2') && (
          <p className="text-xl font-medium animate-pulse text-emerald-300 mt-2">
            Movendo o origami {etapa === 'ANIMANDO_1' ? numeroEscolhido : abaEscolhida} vezes...
          </p>
        )}

        {/* ESCOLHER ABA INTERNA */}
        {etapa === 'ESCOLHER_ABA' && (
          <div>
            {!souOLider ? (
              <div>
                <p className="text-lg font-medium mb-4 text-emerald-300">Escolha um dos números de dentro:</p>
                <div className="grid grid-cols-2 gap-4">
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => selecionarAba(num)}
                      className="bg-indigo-600 hover:bg-indigo-500 transition p-6 rounded-xl text-2xl font-bold shadow-lg cursor-pointer"
                    >
                      Aba {num}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8">
                <p className="text-xl font-medium animate-pulse text-amber-300">
                  O participante está escolhendo a aba interna...
                </p>
              </div>
            )}
          </div>
        )}

        {/* AGUARDANDO ADMIN RODAR (Fase 2) */}
        {etapa === 'AGUARDANDO_RODAR_2' && (
          <div>
            <div className="bg-slate-900 p-4 rounded-xl mb-6 border border-slate-700">
              <p className="text-sm text-slate-400">Aba escolhida pelo participante:</p>
              <p className="text-xl font-bold text-indigo-400">Aba {abaEscolhida}</p>
            </div>

            {souOLider ? (
              <button
                onClick={rodarSegundaFase}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 transition font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg text-lg animate-bounce"
              >
                <Play size={22} /> Rodar e Revelar Destino
              </button>
            ) : (
              <p className="text-slate-400 italic animate-pulse">Aguardando o Admin rodar para revelar o destino...</p>
            )}
          </div>
        )}

        {/* REVELAR */}
        {etapa === 'REVELAR' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-emerald-500/50">
            <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2">O destino revelou:</h3>
            <p className="text-2xl font-bold text-emerald-300 mb-6">
              "{abasInternas[abaEscolhida] || "Muita sorte no seu futuro!"}"
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={reiniciarJogo}
                className="w-full bg-emerald-600 hover:bg-emerald-500 transition font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw size={18} /> Jogar Novamente
              </button>

              <button
                onClick={pedirTrocaLideranca}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-sm py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} /> Inverter Papéis (Segurar o Origami)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}