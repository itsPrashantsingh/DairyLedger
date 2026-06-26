export default function QtyControl({ value, onChange, label, color = 'green', disabled = false }) {
  const btn = color === 'amber' ? 'bg-amber-500' : 'bg-green-600'

  function step(delta) {
    if (disabled) return
    onChange(Math.max(0, Math.round((Number(value || 0) + delta) * 2) / 2))
  }

  return (
    <div>
      <p className="mb-1 text-center text-[10px] font-medium uppercase text-slate-500">{label}</p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={disabled} onClick={() => step(-0.5)} className={`h-9 w-9 shrink-0 rounded-lg ${btn} text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40`}>−</button>
        <input
          type="number"
          step="0.5"
          min="0"
          disabled={disabled}
          value={parseFloat(Number(value || 0).toFixed(2))}
          onChange={(e) => onChange(Math.round(Number(e.target.value || 0) * 100) / 100)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white text-center text-base font-bold disabled:bg-slate-100 disabled:text-slate-500"
        />
        <button type="button" disabled={disabled} onClick={() => step(0.5)} className={`h-9 w-9 shrink-0 rounded-lg ${btn} text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40`}>+</button>
      </div>
    </div>
  )
}
