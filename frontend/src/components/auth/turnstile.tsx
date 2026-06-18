'use client'

import { useEffect, useRef } from 'react'

/**
 * Widget Cloudflare Turnstile.
 *
 * Renderiza o widget se `NEXT_PUBLIC_TURNSTILE_SITEKEY` estiver definido.
 * Em dev sem sitekey, devolve null (e a server action aceita por defeito,
 * ver `lib/auth/captcha.ts`).
 *
 * Como usar:
 *   const [token, setToken] = useState('')
 *   <Turnstile onVerify={setToken} />
 *   ...
 *   // depois enviar `token` na request ao backend
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileOptions) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  action?: string
}

interface TurnstileProps {
  /** Callback com o token quando o widget verifica com sucesso */
  onVerify: (token: string) => void
  /** Callback quando o token expira (~5min) — deves chamar reset() ou refazer fluxo */
  onExpire?: () => void
  /** Identificador da action (segregar metrics no dashboard CF) */
  action?: 'login' | 'signup' | 'recover'
}

export function Turnstile({ onVerify, onExpire, action }: TurnstileProps) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY
  const ref = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sitekey) return
    if (!ref.current) return

    // Injectar script da Cloudflare se ainda não foi
    const SCRIPT_ID = 'cf-turnstile-script'
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script')
      s.id = SCRIPT_ID
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      document.head.appendChild(s)
    }

    // Esperar pelo `turnstile` ficar disponível e renderizar
    const tryRender = () => {
      if (!window.turnstile || !ref.current) {
        setTimeout(tryRender, 100)
        return
      }
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onExpire,
        theme: 'light',
        size: 'normal',
        action,
      })
    }
    tryRender()

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore — widget pode já estar removido
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey, action])

  // Sem sitekey configurado: não renderiza nada (modo dev)
  if (!sitekey) return null

  return <div ref={ref} className="my-3" />
}
