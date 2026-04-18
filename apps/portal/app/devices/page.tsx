'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { DeviceCard } from '../../components/DeviceCard'
import { SkeletonCard } from '../../components/SkeletonCard'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { DEMO_DEVICES, isDemoMode } from '../../lib/demo-data'
import type { Device, DeviceProfile } from '../../lib/types'

interface EnrollFormData {
  device_ip: string
  device_name: string
  profile: DeviceProfile
}

const PROFILE_OPTIONS: { value: DeviceProfile; label: string; age: string; desc: string }[] = [
  { value: 'strict', label: 'Strict', age: '6–10', desc: 'Maximum filtering' },
  { value: 'moderate', label: 'Moderate', age: '11–14', desc: 'Balanced filtering' },
  { value: 'guided', label: 'Guided', age: '15–17', desc: 'Light filtering' },
]

const PROFILE_COLORS: Record<DeviceProfile, { selected: string; dot: string }> = {
  strict: {
    selected: 'border-emerald-500/60 bg-emerald-500/8 ring-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  moderate: {
    selected: 'border-cyan-500/60 bg-cyan-500/8 ring-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  guided: {
    selected: 'border-blue-500/60 bg-blue-500/8 ring-blue-500/20',
    dot: 'bg-blue-400',
  },
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ShieldPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v8M8 12h8" />
    </svg>
  )
}

function EnrollModal({
  onClose,
  onEnrolled,
}: {
  onClose: () => void
  onEnrolled: (device: Device) => void
}) {
  const [form, setForm] = useState<EnrollFormData>({
    device_ip: '',
    device_name: '',
    profile: 'moderate',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Connect Supabase to enroll devices.')
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    setError(null)

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(form.device_ip)) {
      setError('Enter a valid IPv4 address (e.g. 192.168.1.50)')
      setSubmitting(false)
      return
    }

    const newDevice: Device = {
      ...form,
      enrolled_at: new Date().toISOString(),
    }

    const { error: dbError } = await getSupabase().from('devices').insert(newDevice)
    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
      return
    }

    onEnrolled(newDevice)
    setSubmitting(false)
  }

  return (
    <div
      data-testid="enroll-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enroll-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700/50 px-6 py-5">
          <div>
            <h2 id="enroll-modal-title" className="text-base font-semibold text-slate-100">
              Enroll a Device
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Add a child&apos;s device to FamilyShield
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            aria-label="Close modal"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Device Name */}
          <div>
            <label htmlFor="device-name-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              Device Name <span className="text-slate-600">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="device-name-input"
              data-testid="input-device-name"
              type="text"
              required
              placeholder="e.g. Emma's iPad"
              value={form.device_name}
              onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-accent-500/60 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
            />
          </div>

          {/* IP Address */}
          <div>
            <label htmlFor="device-ip-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              Static IP Address <span className="text-slate-600">*</span>
            </label>
            <input
              id="device-ip-input"
              data-testid="input-device-ip"
              type="text"
              required
              placeholder="192.168.1.50"
              value={form.device_ip}
              onChange={(e) => setForm({ ...form, device_ip: e.target.value })}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-accent-500/60 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
            />
            <p className="mt-1.5 text-[11px] text-slate-600">
              Set a static DHCP lease in your router first, then enter that IP here.
            </p>
          </div>

          {/* Age Profile */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">
              Age Profile <span className="text-slate-600">*</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PROFILE_OPTIONS.map((opt) => {
                const colors = PROFILE_COLORS[opt.value]
                const selected = form.profile === opt.value
                return (
                  <label
                    key={opt.value}
                    data-testid={`profile-option-${opt.value}`}
                    className={[
                      'relative flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-all',
                      selected
                        ? `${colors.selected} ring-1`
                        : 'border-slate-700/60 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setForm({ ...form, profile: opt.value })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      <span className="text-xs font-semibold text-slate-200">{opt.label}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{opt.age}</span>
                    <span className="text-[10px] text-slate-600">{opt.desc}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              data-testid="enroll-error"
              className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            data-testid="submit-enroll"
            disabled={submitting}
            className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Enrolling…' : 'Enroll Device'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (!isSupabaseConfigured()) {
      setDevices(DEMO_DEVICES)
      setLoading(false)
      return
    }

    async function loadDevices() {
      setLoading(true)
      setLoadError(null)

      const { data, error } = await getSupabase()
        .from('devices')
        .select('*')
        .order('enrolled_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
      } else {
        setDevices((data ?? []) as Device[])
      }

      setLoading(false)
    }

    void loadDevices()

    const channel = getSupabase()
      .channel('devices-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'devices' }, (payload) => {
        const incoming = payload.new as Device
        setDevices((prev) => [incoming, ...prev.filter((d) => d.device_ip !== incoming.device_ip)])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices' }, (payload) => {
        const incoming = payload.new as Device
        setDevices((prev) => prev.map((d) => (d.device_ip === incoming.device_ip ? incoming : d)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'devices' }, (payload) => {
        const removed = payload.old as Pick<Device, 'device_ip'>
        setDevices((prev) => prev.filter((d) => d.device_ip !== removed.device_ip))
      })
      .subscribe()

    return () => {
      isMounted = false
      void getSupabase().removeChannel(channel)
    }
  }, [])

  const isDemo = isDemoMode([], devices)

  return (
    <div className="space-y-6" data-testid="devices-page">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Devices</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? 'Loading…'
              : devices.length === 0
              ? 'No devices protected yet'
              : `${devices.length} device${devices.length !== 1 ? 's' : ''} under protection`}
          </p>
        </div>

        <button
          data-testid="open-enroll-modal"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-600 active:scale-[0.98]"
        >
          <PlusIcon />
          Enroll Device
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="loading-devices">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} rows={3} />
          ))}
        </div>
      ) : loadError ? (
        <div
          className="rounded-2xl border border-red-500/20 bg-red-500/5 py-10 text-center"
          data-testid="devices-load-error"
        >
          <p className="text-sm text-red-400">Failed to load devices: {loadError}</p>
        </div>
      ) : devices.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/50 bg-gradient-to-b from-slate-800/20 to-transparent px-8 py-20 text-center"
          data-testid="empty-devices"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-500/10 ring-1 ring-accent-500/20">
            <ShieldPlusIcon className="h-10 w-10 text-accent-500/70" />
          </div>

          <h2 className="text-xl font-semibold text-slate-100">No devices enrolled yet</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Start protecting your family. Add a child&apos;s device in minutes — no advanced setup required.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600 transition-all active:scale-[0.98]"
            >
              <PlusIcon />
              Enroll Your First Device
            </button>
            <a
              href="#"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Read setup guide →
            </a>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="devices-grid"
        >
          {devices.map((device) => (
            <DeviceCard key={device.device_ip} device={device} isDemo={isDemo} />
          ))}
        </div>
      )}

      {showModal && (
        <EnrollModal
          onClose={() => setShowModal(false)}
          onEnrolled={(device) => {
            setDevices((prev) => [device, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
