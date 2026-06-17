import type { NextConfig } from 'next'

/**
 * Headers HTTP de segurança aplicados a TODAS as rotas.
 *
 * - X-Frame-Options: impede a app de ser embutida em <iframe> (clickjacking)
 * - X-Content-Type-Options: impede MIME sniffing (segurança contra
 *   ataques que injectam ficheiros com Content-Type errado)
 * - Referrer-Policy: limita info partilhada com sites externos
 * - Permissions-Policy: desactiva APIs do browser que não usamos
 *   (camera, microfone, geolocalização, pagamentos)
 *
 * TODO: Content-Security-Policy. Requer mais cuidado porque o Next.js
 * usa inline scripts/styles para hydration; uma CSP estrita pode partir
 * a app. Para activar, gerar nonces via middleware e injectar em CSP.
 * Ver https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // {
  //   key: 'Content-Security-Policy',
  //   value: "default-src 'self'; ...", // TODO: implementar com nonce
  // },
]

const nextConfig: NextConfig = {
  // Esconder o header "X-Powered-By: Next.js" (não dá info útil a
  // utilizadores legítimos e ajuda scanners a fazer fingerprinting).
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Aplicar os headers a todas as rotas
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
