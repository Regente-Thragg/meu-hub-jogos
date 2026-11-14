import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, ArrowLeft, Send, Sparkles, Search, Plus, CheckCircle2, Users, Check, X, Clock } from 'lucide-react';

// totalJogadores e lider vêm do App (atualizados pelo servidor).
// No Stop, o líder é sempre o admin (quem criou a sala).
export default function StopGame({ socket, codigoSala, voltarHome, totalJogadores = 1, lider = '' }) {
  const souAdmin = lider === socket.id;
  const souAdminRef = useRef(souAdmin);
  souAdminRef.current = souAdmin;

  // CONFIGURAR (só admin) | ESPERANDO (lobby) | JOGANDO | REVISAO
  const [etapa, setEtapa] = useState(souAdmin ? 'CONFIGURAR' : 'ESPERANDO');
  const etapaRef = useRef(etapa);
  etapaRef.current = etapa;

  const [letraSorteada, setLetraSorteada] = useState('');

  // Banco robusto de categorias brasileiras para o Stop
  // (os ids precisam ser os mesmos de CATEGORIAS_VALIDAS_STOP no server.js)
  const bancoCategorias = [
    { id: 'nome', label: 'Nome (Pessoa)' },
    { id: 'cep', label: 'Cidade, Estado ou País (CEP)' },
    { id: 'animal', label: 'Animal' },
    { id: 'objeto', label: 'Objeto' },
    { id: 'filme', label: 'Filme ou Série' },
    { id: 'cor', label: 'Cor' },
    { id: 'comida', label: 'Comida / Fruta' },
    { id: 'profissao', label: 'Profissão' },
    { id: 'esporte', label: 'Esporte' },
    { id: 'marca', label: 'Marca / Empresa' },
    { id: 'famoso', label: 'Celebridade / Cantor' },
    { id: 'flor', label: 'Flor / Planta' },
    { id: 'carro', label: 'Carro / Meio de Transporte' },
    { id: 'parte_corpo', label: 'Parte do Corpo Humano' },
    { id: 'musica', label: 'Música / Banda' },
    { id: 'sogra', label: 'Minha Sogra é... (Adjetivo)' }
  ];

  const [buscaCategoria, setBuscaCategoria] = useState('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([
    'nome', 'cep', 'animal', 'objeto', 'filme', 'cor', 'comida', 'profissao'
  ]);
  const [avisoCategorias, setAvisoCategorias] = useState('');

  // Estado do lobby (vem do servidor)
  const [configurada, setConfigurada] = useState(false); // admin já confirmou as categorias?
  const [emRodada, setEmRodada] = useState(false);
  const [lobby, setLobby] = useState([]); // [{ id, nome, pronto }]

  const [respostas, setRespostas] = useState({});
  const [todasRespostas, setTodasRespostas] = useState({}); // { socketId: { nomeJogador, respostas } }
  const [validacoes, setValidacoes] = useState({}); // { `${socketId}-${catId}`: true/false }
  const [tempo, setTempo] = useState(60);

  // Refs para o envio automático pegar sempre o estado mais recente
  const respostasRef = useRef(respostas);
  respostasRef.current = respostas;
  const jaEnviouRef = useRef(false);

  useEffect(() => {
    const aoReceberEstado = ({ categorias, configurada, emRodada, lobby }) => {
      setCategoriasSelecionadas(categorias);
      setConfigurada(configurada);
      setEmRodada(emRodada);
      setLobby(lobby);
      if (souAdminRef.current && !configurada && etapaRef.current === 'ESPERANDO') setEtapa('CONFIGURAR');
    };

    const aoConfigurarCategorias = ({ categorias }) => setCategoriasSelecionadas(categorias);

    const aoConfirmarConfig = ({ categorias }) => {
      setCategoriasSelecionadas(categorias);
      setConfigurada(true);
      if (etapaRef.current === 'CONFIGURAR') setEtapa('ESPERANDO');
    };

    const aoReabrirConfig = () => {
      setConfigurada(false);
      if (souAdminRef.current && etapaRef.current === 'ESPERANDO') setEtapa('CONFIGURAR');
    };

    const aoAtualizarLobby = ({ lobby }) => setLobby(lobby);

    const aoComecarRodada = ({ letra, categorias }) => {
      setCategoriasSelecionadas(categorias);
      setLetraSorteada(letra);
      jaEnviouRef.current = false;

      const respostasIniciais = {};
      categorias.forEach((cat) => { respostasIniciais[cat] = ''; });
      setRespostas(respostasIniciais);
      setTodasRespostas({});
      setValidacoes({});

      setEmRodada(true);
      setEtapa('JOGANDO');
      setTempo(60);
    };

    const aoStopAcionado = () => {
      setEmRodada(false);
      setLobby((atual) => atual.map((j) => ({ ...j, pronto: false })));
      // Só quem estava jogando envia respostas (quem chegou no meio da rodada não)
      if (etapaRef.current === 'JOGANDO' && !jaEnviouRef.current) {
        jaEnviouRef.current = true;
        socket.emit('enviar-respostas-stop', { codigoSala, respostas: respostasRef.current });
        setEtapa('REVISAO');
      }
    };

    const aoReceberRespostas = ({ socketId, nomeJogador, respostas: respJogador }) => {
      setTodasRespostas((prev) => ({
        ...prev,
        [socketId]: {
          nomeJogador: socketId === socket.id ? `${nomeJogador} (Você)` : nomeJogador,
          respostas: respJogador,
        },
      }));
    };

    socket.on('estado-stop', aoReceberEstado);
    socket.on('configurar-categorias', aoConfigurarCategorias);
    socket.on('config-stop-confirmada', aoConfirmarConfig);
    socket.on('config-stop-reaberta', aoReabrirConfig);
    socket.on('lobby-stop', aoAtualizarLobby);
    socket.on('comecar-rodada-stop', aoComecarRodada);
    socket.on('stop-acionado', aoStopAcionado);
    socket.on('jogador-enviou-respostas', aoReceberRespostas);

    // Pede ao servidor o estado atual (quem entra depois precisa disso)
    socket.emit('sincronizar-stop', { codigoSala });

    // Cada listener é removido pelo próprio handler: não derruba os listeners do App
    return () => {
      socket.off('estado-stop', aoReceberEstado);
      socket.off('configurar-categorias', aoConfigurarCategorias);
      socket.off('config-stop-confirmada', aoConfirmarConfig);
      socket.off('config-stop-reaberta', aoReabrirConfig);
      socket.off('lobby-stop', aoAtualizarLobby);
      socket.off('comecar-rodada-stop', aoComecarRodada);
      socket.off('stop-acionado', aoStopAcionado);
      socket.off('jogador-enviou-respostas', aoReceberRespostas);
    };
  }, [socket, codigoSala]);

  const acionarStop = () => {
    if (jaEnviouRef.current) return;
    jaEnviouRef.current = true;
    socket.emit('apertar-stop', { codigoSala });
    socket.emit('enviar-respostas-stop', { codigoSala, respostas: respostasRef.current });
    setEtapa('REVISAO');
  };

  // Timer da rodada de 60 segundos
  useEffect(() => {
    if (etapa !== 'JOGANDO') return;
    if (tempo <= 0) {
      acionarStop();
      return;
    }
    const timer = setTimeout(() => setTempo((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [etapa, tempo]);

  const mostrarAviso = (texto) => {
    setAvisoCategorias(texto);
    setTimeout(() => setAvisoCategorias(''), 3000);
  };

  // Só o admin configura; o servidor repassa as mudanças aos demais
  const toggleCategoria = (id) => {
    if (!souAdmin) return;
    let novas;
    if (categoriasSelecionadas.includes(id)) {
      if (categoriasSelecionadas.length <= 3) {
        mostrarAviso('A sala precisa ter pelo menos 3 categorias!');
        return;
      }
      novas = categoriasSelecionadas.filter((c) => c !== id);
    } else {
      if (categoriasSelecionadas.length >= 8) {
        mostrarAviso('Você pode selecionar no máximo 8 categorias!');
        return;
      }
      novas = [...categoriasSelecionadas, id];
    }
    setCategoriasSelecionadas(novas);
    socket.emit('acao-config-stop', { codigoSala, categorias: novas });
  };

  const confirmarCategorias = () => {
    socket.emit('confirmar-config-stop', { codigoSala });
  };

  const editarCategorias = () => {
    socket.emit('reabrir-config-stop', { codigoSala });
  };

  const euPronto = lobby.find((j) => j.id === socket.id)?.pronto ?? false;
  const totalProntos = lobby.filter((j) => j.pronto).length;
  const poucosJogadores = totalJogadores < 2;

  // "Sortear Letra e Iniciar!": marca/desmarca este jogador como pronto.
  // A rodada só começa quando TODOS os jogadores da sala estiverem prontos.
  const alternarPronto = () => {
    socket.emit('pronto-stop', { codigoSala, pronto: !euPronto });
  };

  const handleChange = (cat, valor) => {
    setRespostas({ ...respostas, [cat]: valor });
  };

  const alternarValidacao = (chave) => {
    setValidacoes((prev) => ({
      ...prev,
      [chave]: prev[chave] === false ? true : false,
    }));
  };

  const categoriasFiltradas = bancoCategorias.filter((c) =>
    c.label.toLowerCase().includes(buscaCategoria.toLowerCase())
  );

  const listaJogadoresRespostas = Object.entries(todasRespostas);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <button
        onClick={voltarHome}
        className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft size={20} /> Sair da Sala
      </button>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700">
        <h1 className="text-3xl font-bold mb-1 text-emerald-400 flex items-center justify-center gap-2 text-center">
          <Sparkles className="text-amber-400" /> Stop! (Adedonha)
        </h1>

        <div className="flex items-center justify-center gap-4 text-sm text-slate-400 mb-6">
          <span>Sala: <span className="font-mono text-emerald-300 font-bold">{codigoSala}</span></span>
          <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-xs text-amber-300">
            <Users size={14} /> {totalJogadores} / 4 jogadores
          </span>
        </div>

        {/* ETAPA DE CONFIGURAÇÃO DE CATEGORIAS (SÓ O ADMIN) */}
        {etapa === 'CONFIGURAR' && souAdmin && (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-amber-300 mb-2">Configurar Categorias (Até 8)</h2>
              <p className="text-xs text-slate-400 mb-4">Selecione as categorias que farão parte desta partida:</p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar categoria..."
                  value={buscaCategoria}
                  onChange={(e) => setBuscaCategoria(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {categoriasFiltradas.map((cat) => {
                  const selecionada = categoriasSelecionadas.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategoria(cat.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer border ${
                        selecionada
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selecionada ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Plus size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-2 flex justify-between items-center text-sm">
              <span className="text-slate-400">Categorias ativas na sala:</span>
              <span className="font-bold text-emerald-400 font-mono">{categoriasSelecionadas.length} / 8</span>
            </div>
            <p className="text-xs text-rose-400 h-5 mb-2 text-center">{avisoCategorias}</p>

            <button
              onClick={confirmarCategorias}
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition font-bold py-3 rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 text-lg"
            >
              Avançar para o Jogo <Play size={20} />
            </button>
          </div>
        )}

        {/* LOBBY: TODOS PRECISAM ESTAR PRONTOS PARA A RODADA COMEÇAR */}
        {etapa === 'ESPERANDO' && (
          <div className="text-center py-2 max-w-xl mx-auto">
            {!configurada ? (
              <p className="text-lg text-amber-300 animate-pulse mb-6 py-6">
                O admin está escolhendo as categorias...
              </p>
            ) : (
              <>
                <p className="text-lg text-slate-300 mb-4">
                  Tudo pronto! O tempo de cada rodada será de <strong className="text-amber-400">60 segundos</strong>.
                </p>
                <div className="mb-6 flex flex-wrap gap-2 justify-center">
                  {categoriasSelecionadas.map((id) => {
                    const catObj = bancoCategorias.find((c) => c.id === id);
                    return <span key={id} className="bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded-full text-slate-300">{catObj?.label}</span>;
                  })}
                </div>
              </>
            )}

            {/* Vagas da sala (2 a 4 jogadores) */}
            <div className="text-left mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300">Jogadores</h3>
              <span className="text-xs text-slate-400">
                {emRodada ? 'Rodada em andamento' : `${totalProntos} / ${lobby.length || totalJogadores} prontos`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {[0, 1, 2, 3].map((i) => {
                const j = lobby[i];
                return j ? (
                  <div
                    key={j.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      j.pronto ? 'border-emerald-500/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    <span className="font-semibold truncate">{j.nome}{j.id === socket.id ? ' (Você)' : ''}</span>
                    {j.pronto ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-xs"><Check size={14} /> Pronto</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1 text-xs"><Clock size={14} /> Aguardando</span>
                    )}
                  </div>
                ) : (
                  <div
                    key={`vaga-${i}`}
                    className="flex items-center justify-between rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-500"
                  >
                    <span>Vaga livre</span>
                    <Plus size={14} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mb-6 text-left">
              A rodada começa quando todos os jogadores da sala estiverem prontos. Mínimo de 2 e máximo de 4 jogadores.
            </p>

            {configurada && (
              <div className="flex gap-3">
                {souAdmin && (
                  <button
                    onClick={editarCategorias}
                    disabled={emRodada}
                    className="w-1/3 bg-slate-700 hover:bg-slate-600 transition font-semibold py-3 rounded-xl cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Editar Categorias
                  </button>
                )}

                {emRodada ? (
                  <button disabled className="flex-1 bg-slate-700 text-slate-400 font-bold py-3 rounded-xl cursor-not-allowed">
                    Rodada em andamento...
                  </button>
                ) : poucosJogadores ? (
                  <button disabled className="flex-1 bg-slate-700 text-slate-400 font-bold py-3 rounded-xl cursor-not-allowed">
                    Aguardando mais jogadores (mín. 2)
                  </button>
                ) : euPronto ? (
                  <button
                    onClick={alternarPronto}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 transition font-semibold py-3 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Clock size={18} className="animate-pulse" /> Aguardando os outros ({totalProntos}/{lobby.length}) · Cancelar
                  </button>
                ) : (
                  <button
                    onClick={alternarPronto}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 transition font-bold text-lg py-3 rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play size={22} /> Sortear Letra e Iniciar!
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TELA DO JOGO (COM 60 SEGUNDOS E CATEGORIAS DINÂMICAS) */}
        {etapa === 'JOGANDO' && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center bg-slate-900 px-6 py-4 rounded-xl mb-6 border border-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">LETRA SORTEADA</span>
                <span className="text-4xl font-extrabold text-amber-400 font-mono">{letraSorteada}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">TEMPO RESTANTE</span>
                <span className={`text-2xl font-bold font-mono ${tempo <= 10 ? 'text-rose-500 animate-bounce' : 'text-emerald-400'}`}>
                  {tempo}s
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-2">
              {categoriasSelecionadas.map((catId) => {
                const catObj = bancoCategorias.find((c) => c.id === catId);
                return (
                  <div key={catId} className="flex flex-col">
                    <label className="text-xs text-slate-300 mb-1">{catObj?.label}:</label>
                    <input
                      type="text"
                      placeholder={`Com ${letraSorteada}... (completa e correta)`}
                      value={respostas[catId] || ''}
                      onChange={(e) => handleChange(catId, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={acionarStop}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition font-bold py-3 rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 text-lg"
            >
              <Send size={20} /> STOP! (Parar Tudo)
            </button>
          </div>
        )}

        {/* TELA DE REVISÃO E VALIDAÇÃO MULTI-JOGADOR (ATÉ 4 JOGADORES) */}
        {etapa === 'REVISAO' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-amber-400 mb-1">Fim da Rodada! 🏁</h2>
            <p className="text-xs text-slate-300 mb-4">
              Letra: <strong className="text-emerald-400">{letraSorteada}</strong> — Clique nas respostas para validar se estão completas e corretas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-left mb-6 max-h-96 overflow-y-auto">
              {listaJogadoresRespostas.map(([socketId, dadosJogador]) => {
                // Calcula pontos simples: 10 pts por resposta válida iniciando com a letra certa
                let pontos = 0;
                categoriasSelecionadas.forEach((catId) => {
                  const texto = (dadosJogador.respostas?.[catId] || '').trim();
                  const chave = `${socketId}-${catId}`;
                  const comecaCerto = texto.toUpperCase().startsWith(letraSorteada);
                  const invalidaManualmente = validacoes[chave] === false;
                  if (texto.length >= 2 && comecaCerto && !invalidaManualmente) {
                    pontos += 10;
                  }
                });

                return (
                  <div key={socketId} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2">
                        <h3 className="font-bold text-emerald-400 text-xs truncate">{dadosJogador.nomeJogador}</h3>
                        <span className="bg-amber-500/20 text-amber-300 font-mono text-xs px-2 py-0.5 rounded font-bold">
                          {pontos} pts
                        </span>
                      </div>
                      <ul className="text-xs space-y-2 text-slate-300">
                        {categoriasSelecionadas.map((id) => {
                          const catObj = bancoCategorias.find((c) => c.id === id);
                          const valor = (dadosJogador.respostas?.[id] || '').trim();
                          const chave = `${socketId}-${id}`;
                          const comecaCerto = valor.toUpperCase().startsWith(letraSorteada);
                          const valida = valor.length >= 2 && comecaCerto && validacoes[chave] !== false;

                          return (
                            <li
                              key={id}
                              onClick={() => valor && alternarValidacao(chave)}
                              className={`p-1.5 rounded border cursor-pointer transition flex items-center justify-between ${
                                !valor
                                  ? 'border-slate-800 text-slate-500'
                                  : valida
                                  ? 'border-emerald-500/40 bg-emerald-950/30 text-slate-200'
                                  : 'border-rose-500/40 bg-rose-950/30 text-rose-300 line-through'
                              }`}
                            >
                              <div className="truncate pr-1">
                                <span className="text-[10px] text-slate-400 block">{catObj?.label}</span>
                                <span>{valor || '-'}</span>
                              </div>
                              {valor && (valida ? <Check size={14} className="text-emerald-400 shrink-0" /> : <X size={14} className="text-rose-400 shrink-0" />)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEtapa('ESPERANDO')}
              className="max-w-md mx-auto w-full bg-emerald-600 hover:bg-emerald-500 transition font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw size={18} /> Jogar Nova Rodada
            </button>
          </div>
        )}
      </div>
    </div>
  );
}