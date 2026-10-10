import { io } from 'socket.io-client';

// No URL = same origin as the page. In dev, Vite proxies /socket.io to the Node server.
// autoConnect is off so the game hook can attach listeners before connecting.
export const socket = io({ autoConnect: false }); 