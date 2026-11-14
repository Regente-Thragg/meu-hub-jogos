import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const estilos = {
  sucesso: { Icone: CheckCircle2, classe: 'border-emerald-500/60 text-emerald-300' },
  erro: { Icone: AlertCircle, classe: 'border-rose-500/60 text-rose-300' },
  info: { Icone: Info, classe: 'border-blue-500/60 text-blue-300' },
};

export default function ToastContainer({ toasts, remover }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const { Icone, classe } = estilos[t.tipo] || estilos.info;
        return (
          <div
            key={t.id}
            role="status"
            className={`toast-entrada pointer-events-auto flex items-start gap-3 bg-slate-800 border ${classe} rounded-xl px-4 py-3 shadow-2xl`}
          >
            <Icone size={20} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm text-slate-100 text-left">{t.mensagem}</p>
            <button
              onClick={() => remover(t.id)}
              className="text-slate-500 hover:text-white transition cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}