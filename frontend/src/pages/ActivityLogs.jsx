import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'

const MODULES = [
  { value: 'all', label: 'All modules' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'customers', label: 'Customers' },
  { value: 'production', label: 'Production' },
  { value: 'cattle', label: 'Cattle' },
  { value: 'bills', label: 'Bills' },
  { value: 'payments', label: 'Payments' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'products', label: 'Products' },
  { value: 'sales', label: 'Sales' },
  { value: 'reminders', label: 'Reminders' }
]

const ACTION_LABELS = {
  daily_entry_unlocked: 'Unlocked deliveries',
  daily_entry_locked: 'Locked deliveries',
  daily_entry_finalized: 'Saved final delivery',
  customers_insert: 'Created customer',
  customers_update: 'Updated customer',
  customers_delete: 'Deleted customer',
  deliveries_insert: 'Created delivery',
  deliveries_update: 'Updated delivery',
  deliveries_delete: 'Deleted delivery',
  production_insert: 'Added production',
  production_update: 'Updated production',
  production_delete: 'Deleted production',
  cattle_insert: 'Added cattle',
  cattle_update: 'Updated cattle',
  cattle_delete: 'Deleted cattle',
  bills_insert: 'Created bill',
  bills_update: 'Updated bill',
  bills_delete: 'Deleted bill',
  payments_insert: 'Added payment',
  payments_update: 'Updated payment',
  payments_delete: 'Deleted payment',
  expenses_insert: 'Added expense',
  expenses_update: 'Updated expense',
  expenses_delete: 'Deleted expense',
  products_insert: 'Added product',
  products_update: 'Updated product',
  products_delete: 'Deleted product',
  sales_insert: 'Created sale',
  sales_update: 'Updated sale',
  sales_delete: 'Deleted sale',
  reminders_insert: 'Sent reminder',
  reminders_update: 'Updated reminder',
  reminders_delete: 'Deleted reminder'
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatDetails(details = {}) {
  const parts = []
  if (details.operation) parts.push(details.operation.toLowerCase())
  if (details.totalCustomers != null) parts.push(`${details.totalCustomers} customers`)
  if (details.customCustomers != null) parts.push(`${details.customCustomers} custom`)
  if (details.deliveredCustomers != null) parts.push(`${details.deliveredCustomers} delivered`)
  if (details.skippedCustomers != null) parts.push(`${details.skippedCustomers} skipped`)
  if (details.totalLitres != null) parts.push(`${Number(details.totalLitres).toFixed(1)} L`)
  if (Array.isArray(details.changedFields) && details.changedFields.length) {
    parts.push(`fields: ${details.changedFields.slice(0, 5).join(', ')}`)
  }
  return parts.join(' · ') || 'No extra details'
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('all')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (module !== 'all') params.set('entityType', module)
      const { data } = await apiGet(`/api/logs?${params.toString()}`)
      setLogs(data.logs || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not load logs')
    } finally {
      setLoading(false)
    }
  }, [module])

  useEffect(() => {
    const timer = setTimeout(() => { loadLogs() }, 0)
    return () => clearTimeout(timer)
  }, [loadLogs])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return logs
    return logs.filter((log) => {
      const haystack = [
        log.user_email,
        log.action,
        log.entity_type,
        log.entity_date,
        JSON.stringify(log.details || {})
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [logs, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Activity Logs</h1>
          <p className="text-sm text-slate-500">Choose a module to review timestamped user activity</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {MODULES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-64"
          />
          <button
            type="button"
            onClick={loadLogs}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">Loading logs...</p>}

      {!loading && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.3fr_1fr_1fr_1.5fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid">
            <span>Action</span>
            <span>User</span>
            <span>Time</span>
            <span>Details</span>
          </div>

          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No logs found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1.3fr_1fr_1fr_1.5fr] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{ACTION_LABELS[log.action] || log.action}</p>
                    <p className="text-xs text-slate-500">
                      {log.entity_type}
                      {log.entity_date ? ` · ${log.entity_date}` : ''}
                    </p>
                  </div>
                  <p className="truncate text-slate-600">{log.user_email || 'Unknown user'}</p>
                  <p className="text-slate-600">{formatDateTime(log.created_at)}</p>
                  <p className="text-slate-600">{formatDetails(log.details)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
