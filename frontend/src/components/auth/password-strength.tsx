'use client'

import { Check, X } from 'lucide-react'
import {
  getPasswordChecks,
  passwordStrength,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
} from '@/lib/auth/password'

interface PasswordStrengthProps {
  password: string
}

/**
 * Mostra a força da palavra-passe e a lista de regras cumpridas/falhadas.
 *
 * Render-se a si próprio como `null` quando a password está vazia, para
 * o caller não precisar de o esconder explicitamente. Não tem props
 * adicionais — toda a configuração (regras, labels, cores) vive em
 * `lib/auth/password.ts`.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (password.length === 0) return null

  const checks = getPasswordChecks(password)
  const strength = passwordStrength(checks)

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 h-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${
                i <= strength ? STRENGTH_COLORS[strength] : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-xs font-medium ${
            strength === 3
              ? 'text-green-600'
              : strength === 2
                ? 'text-yellow-600'
                : strength === 1
                  ? 'text-orange-500'
                  : 'text-red-500'
          }`}
        >
          {STRENGTH_LABELS[strength]}
        </span>
      </div>
      <ul className="space-y-0.5">
        {Object.values(checks).map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.ok ? (
              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-slate-400 flex-shrink-0" />
            )}
            <span className={`text-xs ${c.ok ? 'text-green-700' : 'text-slate-500'}`}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
