export default function PhotoButton({ disabled, onPick }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // lets you pick the same file again
    if (file) onPick(file);
  };

  return (
    <label className={`btn${disabled ? ' disabled' : ''}`}>
      Take photo
      <input
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}