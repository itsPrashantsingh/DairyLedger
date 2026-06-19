export default function QtyControl({ value, onChange, label, color = 'green' }) {
  const btn = color === 'amber' ? 'bg-amber-500' : 'bg-green-600'

  function step(delta) {
    onChange(Math.max(0, Math.round((Number(value || 0) + delta) * 2) / 2))
  }

  return (
    <div>
      <p className="mb-1 text-center text-[10px] font-medium uppercase text-slate-500">{label}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => step(-0.5)} className={`h-9 w-9 shrink-0 rounded-lg ${btn} text-base font-bold text-white`}>−</button>
        <input
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white text-center text-base font-bold"
        />
        <button type="button" onClick={() => step(0.5)} className={`h-9 w-9 shrink-0 rounded-lg ${btn} text-base font-bold text-white`}>+</button>
      </div>
    </div>
  )
}
