import React from 'react';
import { Users, ArrowRight, LogIn, Plus } from 'lucide-react';
import { JOGOS } from '../games/catalogo';

export default function MenuJogos({ conectado, aoCriarSala, inputSala, setInputSala, aoEntrarSala }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Cabeçalho */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg">
              🎲
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-bold text-emerald-400">Hub de Jogos Clássicos</h1>
              <p className="text-xs text-slate-400">Relembre os clássicos do recreio online!</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${conectado ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-xs text-slate-300">{conectado ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Menu de jogos */}
        <section>
          <h2 className="text-2xl font-bold mb-1">Escolha um jogo</h2>
          <p className="text-sm text-slate-400 mb-6">Crie uma sala e compartilhe o código com seus amigos.</p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {JOGOS.map(({ id, nome, descricao, jogadores, Icone, tema }) => (
              <article
                key={id}
                className={`group flex flex-col bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg transition hover:-translate-y-1 hover:shadow-2xl ${tema.borda}`}
              >
                <div className={`h-36 bg-linear-to-br ${tema.faixa} flex items-center justify-center`}>
                  <div className="transition duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-lg">
                    <Icone size={80} />
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold mb-1">{nome}</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">{descricao}</p>

                  <span className={`inline-flex items-center gap-1.5 self-start bg-slate-900 border border-slate-700 rounded-full px-3 py-1 text-xs mb-4 ${tema.chip}`}>
                    <Users size={14} /> {jogadores}
                  </span>

                  <button
                    onClick={() => aoCriarSala(id)}
                    disabled={!conectado}
                    className={`w-full ${tema.botao} font-semibold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Criar sala <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                  </button>
                </div>
              </article>
            ))}

            {/* Espaço reservado para os próximos jogos */}
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-700 rounded-2xl p-8 text-slate-500 min-h-64">
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                <Plus size={26} />
              </div>
              <p className="font-semibold text-slate-400">Mais jogos em breve</p>
              <p className="text-xs mt-1">Novos clássicos chegando ao hub.</p>
            </div>
          </div>
        </section>

        {/* Entrar em uma sala */}
        <section className="mt-10 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 md:flex-1">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center shrink-0">
              <LogIn size={22} />
            </div>
            <div>
              <h2 className="font-bold">Já tem um código?</h2>
              <p className="text-sm text-slate-400">Digite o código da sala para entrar na partida de um amigo.</p>
            </div>
          </div>

          <form onSubmit={aoEntrarSala} className="flex gap-2 md:w-96">
            <input
              type="text"
              placeholder="Código da Sala"
              value={inputSala}
              onChange={(e) => setInputSala(e.target.value)}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white uppercase focus:outline-none focus:border-indigo-500 font-mono"
              maxLength={4}
            />
            <button
              type="submit"
              disabled={!conectado}
              className="bg-indigo-600 hover:bg-indigo-500 transition px-6 py-2 rounded-xl font-semibold cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Entrar
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}