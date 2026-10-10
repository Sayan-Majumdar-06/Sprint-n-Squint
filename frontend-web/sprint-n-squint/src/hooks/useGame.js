import { useCallback, useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { resizeImage } from '../lib/resizeImage';

// phase: 'idle' | 'waiting' (joined mid-round) | 'playing' | 'judging'
export function useGame(playerName) {
  const [phase, setPhase] = useState('idle');
  const [target, setTarget] = useState('');
  const [endsAt, setEndsAt] = useState(null);
  const [message, setMessage] = useState('Waiting for a round to start.');
  const [preview, setPreview] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onStarted = ({ target, durationSeconds }) => {
      setTarget(target);
      setEndsAt(Date.now() + durationSeconds * 1000);
      setPreview(null);
      setPhase('playing');

      if(durationSeconds < 290) {
        setMessage(`Joined mid-round! Hurry and find ${target}`);
      } else {
        setMessage('Go! Find it, photograph it.');
      }
    }; 

    const onJudging = () => {
      setPhase('judging');
      setMessage('The judge is squinting at your photo...');
    };

    const onRejected = ({ reason }) => {
      setPhase('playing');
      setMessage(reason);
    };

    const onOver = ({ winner, target }) => {
      setPhase('idle');
      setEndsAt(null);
      setMessage(winner ? `🏆 ${winner} found ${target} first!` : `⏰ Time's up. Nobody found ${target}.`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game-started', onStarted);
    socket.on('judging-in-progress', onJudging);
    socket.on('submission-rejected', onRejected);
    socket.on('game-over', onOver);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game-started', onStarted);
      socket.off('judging-in-progress', onJudging);
      socket.off('submission-rejected', onRejected);
      socket.off('game-over', onOver);
      socket.disconnect();
    };
  }, []);

  const startRound = useCallback(() => socket.emit('start-game'), []);

  const submitPhoto = useCallback(
    async (file) => {
      setPhase('judging');
      setMessage('Shrinking your photo...');

      try {
        const image = await resizeImage(file);
        setPreview(image);
        socket.emit('submit-photo', { image, playerName });
      } catch (err) {
        setPhase('playing');
        setMessage(err.message);
      }
    },
    [playerName]
  );

  return { phase, target, endsAt, message, preview, connected, startRound, submitPhoto };
}