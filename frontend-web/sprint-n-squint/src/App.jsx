import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import RoundCard from './components/RoundCard';
import PhotoButton from './components/PhotoButton';
import StatusCard from './components/StatusCard';

export default function App() {
  const [name, setName] = useState(() => localStorage.getItem('sns-name') || '');

  useEffect(() => {
    localStorage.setItem('sns-name', name);
  }, [name]);

  const { phase, target, endsAt, message, preview, connected, startRound, submitPhoto } = useGame(name);

  return (
    <main>
      <h1 className='press-start-2p'>SPRINT-N-SQUINT</h1>
      <p className="tag">Find it. Photograph it. Convince the judge.</p>

      <input
        className="name"
        type="text"
        placeholder="Your name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {phase === 'idle' && (
        <button className="btn press-start-2p" onClick={startRound} disabled={!connected}>
          START ROUND
        </button>
      )}

      {target && <RoundCard target={target} endsAt={endsAt} />} 

      <PhotoButton disabled={phase !== 'playing'} onPick={submitPhoto} />

      <StatusCard message={connected ? message : 'Disconnected from the server.'} preview={preview} />
    </main>
  );
}