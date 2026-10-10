export default function StatusCard({ message, preview }) {
  return (
    <>
      <div className="card status">{message}</div>
      {preview && <img className="preview" src={preview} alt="Your last photo" />}
    </>
  );
}