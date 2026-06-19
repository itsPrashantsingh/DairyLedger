import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO, formatDate } from '../lib/utils'
import Toast from '../components/Toast'
import QtyControl from '../components/QtyControl'

export default function MilkProduction() {
  const [date, setDate] = useState(todayISO())
  const [production, setProduction] = useState({ morning_litres: '', evening_litres: '', notes: '' })
  const [recent, setRecent] = useState([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  useEffect(() => { loadData() }, [date])

  async function loadData() {
    const [{ data: prod }, { data: history }] = await Promise.all([
      supabase.from('milk_production').select('*').eq('date', date).maybeSingle(),
      supabase.from('milk_production').select('*').order('date', { ascending: false }).limit(7)
    ])

    setProduction(prod
      ? { morning_litres: Number(prod.morning_litres), evening_litres: Number(prod.evening_litres), notes: prod.notes || '' }
      : { morning_litres: '', evening_litres: '', notes: '' }
    )
    setRecent(history || [])
    setDirty(false)
  }

  function updateField(field, value) {
    setProduction((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  async function saveProduction() {
    setSaving(true)
    const { error } = await supabase.from('milk_production').upsert({
      date,
      morning_litres: Number(production.morning_litres) || 0,
      evening_litres: Number(production.evening_litres) || 0,
      notes: production.notes || null
    }, { onConflict: 'date' })

    setSaving(false)

    if (error) {
      setToast({ message: error.message, type: 'error' })
    } else {
      const total = (Number(production.morning_litres) || 0) + (Number(production.evening_litres) || 0)
      setToast({ message: `✓ Saved ${total.toFixed(1)} L for ${formatDate(date)}`, type: 'success' })
      setDirty(false)
      loadData()
    }
  }

  const total = (Number(production.morning_litres) || 0) + (Number(production.evening_litres) || 0)

  return (
    <div className="pb-28">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Milk Production</h1>
          <p className="text-sm text-slate-500">Total litres collected at the dairy</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="mb-3 text-sm font-semibold text-blue-900">🐄 How much milk today?</p>
        <div className="grid grid-cols-2 gap-3">
          <QtyControl label="Morning (L)" value={production.morning_litres} onChange={(v) => updateField('morning_litres', v)} />
          <QtyControl label="Evening (L)" value={production.evening_litres} onChange={(v) => updateField('evening_litres', v)} color="amber" />
        </div>
        <p className="mt-3 text-center text-lg font-bold text-blue-900">{total.toFixed(1)} L total</p>
        <textarea
          placeholder="Notes (optional)"
          value={production.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Recent days</h2>
          <div className="space-y-2">
            {recent.map((row) => (
              <button
                key={row.date}
                type="button"
                onClick={() => setDate(row.date)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm ${
                  row.date === date ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <span className="font-medium">{formatDate(row.date)}</span>
                <span className="text-slate-600">
                  ☀️ {Number(row.morning_litres)} L · 🌙 {Number(row.evening_litres)} L
                  <span className="ml-2 font-bold text-blue-800">{Number(row.total_litres)} L</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur md:bottom-0 md:left-56">
        <button
          onClick={saveProduction}
          disabled={saving}
          className={`w-full rounded-xl py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-50 ${
            dirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-700'
          }`}
        >
          {saving ? 'Saving...' : dirty ? '💾 Save Production' : '💾 Saved'}
        </button>
      </div>
    </div>
  )
}
