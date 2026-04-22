import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Install Security Certificate — FamilyShield',
  description: 'Download and install the FamilyShield CA certificate on your child\'s device.',
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CERT_DOWNLOAD_URL = `${API_BASE}/cert`

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-xs font-bold text-accent-400">
      {n}
    </span>
  )
}

function PlatformCard({
  icon,
  title,
  badge,
  steps,
  note,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  steps: string[]
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {badge && (
            <span className="text-xs text-slate-500">{badge}</span>
          )}
        </div>
      </div>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <StepNumber n={i + 1} />
            <span dangerouslySetInnerHTML={{ __html: step }} />
          </li>
        ))}
      </ol>
      {note && (
        <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-500 border border-slate-700/40">
          {note}
        </p>
      )}
    </div>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function MacIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C14.15 1.23 13.1 1 12 1c-1.1 0-2.15.23-3.12.63L7.4.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.74-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5.175L11 3.5V12h9zM3 13h6v6.43L3 17.25V13zm17 0h-9v8.5l9-1.675V13z" />
    </svg>
  )
}

export default function CertPage() {
  return (
    <div className="space-y-8 max-w-3xl" data-testid="cert-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-slate-100">
          Install Security Certificate
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          FamilyShield uses a local certificate authority (CA) to inspect HTTPS traffic from enrolled
          devices. You must install this certificate on each child&apos;s device once. It cannot be used
          to access other websites and does not collect any personal data.
        </p>
      </div>

      {/* Download button */}
      <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-slate-100">FamilyShield CA Certificate</p>
          <p className="text-xs text-slate-500">
            PEM format · Valid for this FamilyShield installation only ·{' '}
            <span className="text-slate-400 font-medium">familyshield-ca.pem</span>
          </p>
        </div>
        <a
          href={CERT_DOWNLOAD_URL}
          download="familyshield-ca.pem"
          data-testid="cert-download-link"
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-600 active:scale-[0.98] shrink-0"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Certificate
        </a>
      </div>

      {/* Security notice */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 flex items-start gap-3">
        <svg className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-slate-500 leading-relaxed">
          This certificate only applies to devices enrolled in FamilyShield. It enables content ID
          extraction (video titles, game names) — no message content, passwords, or personal data are
          stored. The CA private key never leaves the FamilyShield server.
        </p>
      </div>

      {/* Installation instructions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Installation Instructions</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PlatformCard
            icon={<AppleIcon />}
            title="iPhone / iPad"
            badge="iOS 14 or later"
            steps={[
              'Download the certificate above on the device (opens in Safari).',
              'Tap <strong>Allow</strong> when iOS asks to download a configuration profile.',
              'Go to <strong>Settings → General → VPN &amp; Device Management</strong>.',
              'Tap <strong>FamilyShield CA</strong> under Downloaded Profile, then tap <strong>Install</strong>.',
              'Go to <strong>Settings → General → About → Certificate Trust Settings</strong>.',
              'Toggle <strong>FamilyShield CA</strong> to fully trust the root certificate.',
            ]}
            note="Steps 5–6 (Certificate Trust Settings) are required. Without them, HTTPS sites will show certificate errors even after install."
          />

          <PlatformCard
            icon={<MacIcon />}
            title="MacBook / Mac"
            badge="macOS 12 Monterey or later"
            steps={[
              'Download the certificate above.',
              'Double-click <strong>familyshield-ca.pem</strong> — Keychain Access opens.',
              'Select <strong>System</strong> keychain (not Login) and click <strong>Add</strong>.',
              'Find <strong>FamilyShield CA</strong> in the list (Category: Certificates).',
              'Double-click it → expand <strong>Trust</strong> → set <strong>When using this certificate</strong> to <strong>Always Trust</strong>.',
              'Close and authenticate with your Mac password.',
            ]}
            note="Must be added to the System keychain (not Login) so it applies to all users on the Mac."
          />

          <PlatformCard
            icon={<AndroidIcon />}
            title="Android"
            badge="Android 9 or later"
            steps={[
              'Download the certificate above.',
              'Go to <strong>Settings → Security → More security settings → Install from storage</strong> (exact path varies by manufacturer).',
              'Select <strong>familyshield-ca.pem</strong>.',
              'Choose <strong>CA certificate</strong> as the credential type.',
              'Name it <strong>FamilyShield CA</strong> and confirm.',
            ]}
            note="Android 11+ may require enabling 'Allow management of user certificates' in Settings → About Phone → Build (developer options) first."
          />

          <PlatformCard
            icon={<WindowsIcon />}
            title="Windows"
            badge="Windows 10 / 11"
            steps={[
              'Download the certificate above.',
              'Right-click <strong>familyshield-ca.pem</strong> → <strong>Install Certificate</strong>.',
              'Select <strong>Local Machine</strong> (requires admin), click <strong>Next</strong>.',
              'Choose <strong>Place all certificates in the following store</strong> → click <strong>Browse</strong>.',
              'Select <strong>Trusted Root Certification Authorities</strong> → <strong>OK</strong> → <strong>Next</strong> → <strong>Finish</strong>.',
            ]}
            note="Must install to Local Machine → Trusted Root Certification Authorities (not Current User) for system-wide trust."
          />
        </div>
      </div>

      {/* Verify section */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Verify Installation</h2>
        <p className="text-sm text-slate-400">
          After installing the cert, visit{' '}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-accent-400">
            http://mitm.it
          </code>{' '}
          from the enrolled device while connected to FamilyShield VPN. If the certificate is
          working correctly, you will see the mitmproxy certificate download page instead of a
          browser error. If you see <em>&quot;traffic is not going through mitmproxy&quot;</em>, ensure
          the device is connected to FamilyShield VPN (Tailscale) and try again.
        </p>
      </div>

      {/* Next steps */}
      <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-700/40 pt-6">
        <a href="/devices" className="hover:text-accent-400 transition-colors">
          ← Back to Devices
        </a>
        <span>·</span>
        <a href="/" className="hover:text-accent-400 transition-colors">
          Dashboard
        </a>
      </div>
    </div>
  )
}
