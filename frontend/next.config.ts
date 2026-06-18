import type { NextConfig } from 'next'

/**
 * Headers HTTP de segurança aplicados a TODAS as rotas.
 *
 * NOTA: a Content-Security-Policy é injectada dinamicamente pelo
 * middleware (`src/proxy.ts`) por request, com nonce per-request,
 * porque Next.js injecta inline scripts/styles para hydration. Não
 * está aqui (config estática) — está no proxy/middleware.
 *
 * Trade-offs documentados:
 *   - HSTS: o `preload` está activado, mas só registar no Chrome
 *     HSTS preload list depois de validar que o domínio nunca mais
 *     vai precisar de HTTP. Para já é seguro (max-age curto fora de
 *     prod via env).
 *   - COEP/COOP: COOP "same-origin" isola o BrowsingContext (anti
 *     Spectre / window.opener). COEP "require-corp" rejeita
 *     resources sem CORP header — pode partir embeds (YouTube,
 *     imagens externas). Usamos `unsafe-none` para já; quando
 *     auditarmos embeds, mudamos para "require-corp".
 *   - CORP "same-site" permite que outros sub-domínios do mesmo
 *     site reusem os recursos. "same-origin" seria mais estrito
 *     mas parte deployments com CDN cross-subdomain.
 */
const securityHeaders = [
  // HSTS — forçar HTTPS por 1 ano. includeSubDomains se controlas
  // todos os subdomínios. `preload` só ligar após inscrição em
  // hstspreload.org.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
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
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // Isolação cross-origin
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'unsafe-none', // TODO: 'require-corp' depois de auditar embeds
  },
]

const nextConfig: NextConfig = {
  // Esconder o header "X-Powered-By: Next.js"
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
