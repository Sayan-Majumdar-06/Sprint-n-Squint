import { useCountdown } from '../hooks/useCountdown';

const formatTime = (s) =>
  s === null ? '--:--' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RoundCard({ target, endsAt }) {
  const secondsLeft = useCountdown(endsAt);

  return (
    <div className="card">
      <small>Find</small>
      <div className="target">{target}</div>
      <div>
        Time left: <span className="timer">{formatTime(secondsLeft)}</span>
      </div>
    </div> 
  );
}