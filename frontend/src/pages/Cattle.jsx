import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CattleCard from '../components/CattleCard'
import { currentYearMonth, getMonthBounds } from '../lib/utils'
import { parseSpreadsheet, rowsToCattle, downloadCattleImportTemplate } from '../lib/import-export'

export default function Cattle() {
  const [cattle, setCattle] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [monthStats, setMonthStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  function emptyForm() {
    return { name: '', breed: '', category: 'cow', active: true }
  }

  useEffect(() => { loadCattle() }, [])

  async function loadCattle() {
    setLoading(true)
    const { data } = await supabase.from('cattle').select('*').order('name')
    const stats = await loadMonthStats(data || [], currentYearMonth())
    setCattle(data || [])
    setMonthStats(stats)
    setLoading(false)
  }

  async function loadMonthStats(list, month) {
    const { start, end } = getMonthBounds(month)
    const { data: entries } = await supabase
      .from('cattle_milk_entries')
      .select('cattle_id, total_litres')
      .gte('date', start)
      .lte('date', end)

    const map = {}
    for (const c of list) map[c.id] = 0
    for (const e of entries || []) {
      map[e.cattle_id] = (map[e.cattle_id] || 0) + Number(e.total_litres)
    }
    return map
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name,
      breed: item.breed || '',
      category: item.category,
      active: item.active
    })
    setShowModal(true)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')

    try {
      const rows = await parseSpreadsheet(file)
      const items = rowsToCattle(rows)

      if (!items.length) {
        setImportMsg('No valid rows. Need name + category (cow or buffalo).')
        setImporting(false)
        return
      }

      const { error } = await supabase.from('cattle').insert(items)
      if (error) throw error

      setImportMsg(`Imported ${items.length} cattle ✓`)
      loadCattle()
    } catch (err) {
      setImportMsg('Import failed: ' + err.message)
    }

    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave(e) {
    e.preventDefault()
    const payload = { ...form, breed: form.breed || null }

    if (editing) {
      const { error } = await supabase.from('cattle').update(payload).eq('id', editing.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from('cattle').insert(payload)
      if (error) { alert(error.message); return }
    }

    setShowModal(false)
    loadCattle()
  }

  async function handleDelete() {
    if (!editing) return
    if (!window.confirm(`Delete "${editing.name}"? All milk records for this cattle will also be removed.`)) return

    const { error } = await supabase.from('cattle').delete().eq('id', editing.id)
    if (error) { alert(error.message); return }

    setShowModal(false)
    loadCattle()
  }

  const filtered = cattle.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.breed || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Cattle</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadCattleImportTemplate()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Download Template
          </button>
          <label className="cursor-pointer rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
            {importing ? 'Importing...' : 'Import CSV/XLSX'}
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
          <button onClick={openAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Add Cattle
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <strong>Import columns:</strong> name, breed, category (cow or buffalo). Extra columns saved as custom fields.
      </div>

      {importMsg && (
        <p className={`text-sm ${importMsg.includes('failed') || importMsg.includes('No valid') ? 'text-red-600' : 'text-green-600'}`}>
          {importMsg}
        </p>
      )}

      <input
        type="search"
        placeholder="Search by name or breed..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-2"
      />

      {loading ? (
        <p className="text-center text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No cattle yet. Add manually or import from Excel.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CattleCard key={c.id} cattle={c} monthLitres={monthStats[c.id] || 0} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">{editing ? 'Edit Cattle' : 'Add Cattle'}</h2>

            <div className="space-y-3">
              <input required placeholder="Name * (unique)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border px-3 py-2">
                <option value="cow">Cow</option>
                <option value="buffalo">Buffalo</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active (show in daily production entry)
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white">Save</button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border py-2">Cancel</button>
            </div>

            {editing && (
              <button type="button" onClick={handleDelete} className="mt-3 w-full rounded-lg border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50">
                Delete cattle
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
