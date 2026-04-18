'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { DeviceCard } from '../../components/DeviceCard'
import { SkeletonCard } from '../../components/SkeletonCard'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { DEMO_DEVICES, isDemoMode } from '../../lib/demo-data'
import type { Device, DeviceProfile } from '../../lib/types'

interface EnrolFormData {
  device_ip: string
  device_name: string
  profile: DeviceProfile
}

const PROFILE_OPTIONS: { value: DeviceProfile; label: string; desc: string }[] = [
  { value: 'strict', label: 'Strict', desc: 'Ages 6–10 — maximum filtering' },
  { value: 'moderate', label: 'Moderate', desc: 'Ages 11–14 — balanced filtering' },
  { value: 'guided', label: 'Guided', desc: 'Ages 15–17 — minimal filtering' },
]

function EnrolModal({
  onClose,
  onEnrolled,
}: {
  onClose: () => void
  onEnrolled: (device: Device) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<EnrolFormData>({
    device_ip: '',
    device_name: '',
    profile: 'moderate',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isSupabaseConfigured()) {
      setError('Supabase is inactive. Activate Supabase before enrolling devices.')
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
      data-testid="enrol-modal"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="enrol-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="enrol-modal-title" className="font-semibold text-slate-100">Enrol a Device</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="device-name-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              Device Name
            </label>
            <input
              id="device-name-input"
              data-testid="input-device-name"
              type="text"
              required
              placeholder="e.g. Emma's iPad"
              value={form.device_name}
              onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
            />
          </div>

          <div>
            <label htmlFor="device-ip-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              Static IP Address
            </label>
            <input
              id="device-ip-input"
              data-testid="input-device-ip"
              type="text"
              required
              placeholder="192.168.1.50"
              value={form.device_ip}
              onChange={(e) => setForm({ ...form, device_ip: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Assign a static IP in your router's DHCP settings first
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Age Profile
            </label>
            <div className="space-y-2">
              {PROFILE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  data-testid={`profile-option-${opt.value}`}
                  className={[
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    form.profile === opt.value
                      ? 'border-teal-500/50 bg-teal-500/5'
                      : 'border-slate-700 hover:border-slate-600',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={opt.value}
                    checked={form.profile === opt.value}
                    onChange={() => setForm({ ...form, profile: opt.value })}
                    className="mt-0.5 accent-teal-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p
              data-testid="enrol-error"
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            data-testid="submit-enrol"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enrolling…' : 'Enrol Device'}
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
      // Show demo mode
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'devices' },
        (payload) => {
          const incoming = payload.new as Device
          setDevices((prev) => [incoming, ...prev.filter((d) => d.device_ip !== incoming.device_ip)])
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices' },
        (payload) => {
          const incoming = payload.new as Device
          setDevices((prev) => prev.map((d) => (d.device_ip === incoming.device_ip ? incoming : d)))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'devices' },
        (payload) => {
          const removed = payload.old as Pick<Device, 'device_ip'>
          setDevices((prev) => prev.filter((d) => d.device_ip !== removed.device_ip))
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      void getSupabase().removeChannel(channel)
    }
  }, [])

  const isDemo = isDemoMode([], devices)

  return (
    <div className="space-y-5" data-testid="devices-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Devices</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {devices.length} device{devices.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>

        <button
          data-testid="open-enrol-modal"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
        >
          <span aria-hidden="true">+</span> Enrol Device
        </button>
      </div>

      {/* Device grid */}
      {loading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="loading-devices"
        >
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} rows={3} />
          ))}
        </div>
      ) : loadError ? (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/5 py-8 text-center"
          data-testid="devices-load-error"
        >
          <p className="text-sm text-red-300">Failed to load devices: {loadError}</p>
        </div>
      ) : devices.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-slate-700 p-8 text-center space-y-4"
          data-testid="empty-devices"
        >
          <div className="flex justify-center">
            <svg className="h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4s4-2 4-6c0 0 2 2 2 6v7c0 4-2 6-6 6s-6-2-6-6V4c0-4 2-6 2-6-4 4-4 6-4 6" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Protect your first device</h3>
            <p className="mt-1 text-sm text-slate-500">Enrol a child's device to start monitoring internet activity and receiving safety alerts.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
            >
              Enrol a device
            </button>
            <a
              href="#"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Read setup guide →
            </a>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="devices-grid"
        >
          {devices.map((device) => (
            <DeviceCard key={device.device_ip} device={device} isDemo={isDemo} />
          ))}
        </div>
      )}

      {/* Enrol modal */}
      {showModal && (
        <EnrolModal
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
