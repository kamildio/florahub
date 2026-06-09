import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Phone } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { cn } from '@/lib/utils'

const CODE_LENGTH = 4

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuth((s) => s.login)

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  // 10 national digits after the +7 prefix.
  const digits = phone.replace(/\D/g, '').slice(0, 10)
  const phoneValid = digits.length === 10
  const fullPhone = `+7${digits}`

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  const formatPhone = (d: string) => {
    const p = d.padEnd(10, '_')
    return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 8)}-${p.slice(8, 10)}`.replace(/_/g, '·')
  }

  async function sendCode() {
    setLoading(true)
    setError('')
    try {
      await api.requestCode(fullPhone)
      setStep('code')
      setResendIn(30)
      setCode(Array(CODE_LENGTH).fill(''))
      setTimeout(() => codeRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function verify(value: string[]) {
    const joined = value.join('')
    if (joined.length !== CODE_LENGTH) return
    setLoading(true)
    setError('')
    try {
      const user = await api.verifyCode(fullPhone, joined)
      login(user)
      navigate('/profile')
    } catch {
      setError(t('auth.wrongCode'))
      setCode(Array(CODE_LENGTH).fill(''))
      codeRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  function onCodeChange(idx: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[idx] = char
    setCode(next)
    if (char && idx < CODE_LENGTH - 1) codeRefs.current[idx + 1]?.focus()
    if (next.every((c) => c !== '')) void verify(next)
  }

  function onCodeKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) codeRefs.current[idx - 1]?.focus()
  }

  return (
    <div className="container grid min-h-[calc(100dvh-9rem)] place-items-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft animate-fade-in">
        <div className="flex justify-center"><Logo /></div>

        {step === 'phone' ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (phoneValid) void sendCode() }}
            className="mt-8"
          >
            <h1 className="text-center font-display text-2xl font-bold">{t('auth.loginTitle')}</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>

            <div className="mt-7">
              <Label htmlFor="phone">{t('auth.phoneLabel')}</Label>
              <div className="flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center gap-1.5 border-r border-border px-3 text-sm font-semibold text-muted-foreground">
                  <Phone className="h-4 w-4" /> +7
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  value={formatPhone(digits)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(700) 000-00-00"
                  className="h-11 flex-1 rounded-r-xl bg-transparent px-3 text-sm tabular focus:outline-none"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-5 w-full" disabled={!phoneValid || loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth.sendCode')}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
          </form>
        ) : (
          <div className="mt-8">
            <button onClick={() => setStep('phone')} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {t('auth.changeNumber')}
            </button>
            <h1 className="mt-4 text-center font-display text-2xl font-bold">{t('auth.codeTitle')}</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t('auth.codeSubtitle')} <span className="font-semibold text-foreground">+7 {formatPhone(digits)}</span>
            </p>

            <div className="mt-7 flex justify-center gap-3" role="group" aria-label={t('auth.codeTitle')}>
              {code.map((c, i) => (
                <input
                  key={i}
                  ref={(el) => (codeRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={c}
                  onChange={(e) => onCodeChange(i, e.target.value)}
                  onKeyDown={(e) => onCodeKey(i, e)}
                  aria-label={`${t('auth.codeTitle')} ${i + 1}`}
                  className={cn(
                    'h-16 w-14 rounded-2xl border-2 bg-background text-center font-display text-2xl font-bold tabular transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    error ? 'border-destructive' : c ? 'border-primary' : 'border-input',
                  )}
                />
              ))}
            </div>

            {error && <p role="alert" className="mt-4 text-center text-sm font-medium text-destructive">{error}</p>}

            <Button size="lg" className="mt-6 w-full" disabled={loading || code.some((c) => !c)} onClick={() => void verify(code)}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth.verify')}
            </Button>

            <div className="mt-4 text-center text-sm">
              {resendIn > 0 ? (
                <span className="text-muted-foreground">{t('auth.resendIn', { seconds: resendIn })}</span>
              ) : (
                <button onClick={() => void sendCode()} className="font-semibold text-primary hover:underline">
                  {t('auth.resend')}
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
