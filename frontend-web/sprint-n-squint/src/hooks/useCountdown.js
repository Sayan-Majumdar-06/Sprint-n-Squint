import { useEffect, useState } from 'react';

// Seconds left until endsAt (a timestamp in ms), or null when there is no round.
export function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!endsAt) { 
      setSecondsLeft(null);
      return;
    }

    const update = () => setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    update();

    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}