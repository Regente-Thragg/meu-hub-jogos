import { io } from 'socket.io-client';

// Se estiver em produção, usa a URL do Render. Se não, usa localhost.
const URL = import.meta.env.PROD 
  ? 'https://meu-hub-jogos-backend.onrender.com' 
  : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
});