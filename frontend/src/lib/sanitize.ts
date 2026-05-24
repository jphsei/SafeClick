import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitiza HTML para renderização segura como conteúdo de email de phishing.
 *
 * Usado pelos componentes que renderizam o `corpo_email` das simulações
 * (que pode incluir `<a>` para a "armadilha", `<img>` para o logo falso,
 * `<style>` inline para mimicar marketing emails). O conteúdo vem da BD
 * mas qualquer um com permissão de escrita nas simulações poderia
 * introduzir `<script>` ou handlers `onerror`, daí esta camada.
 *
 * **Importante**: chamar SEMPRE no servidor antes de passar ao cliente.
 * O `isomorphic-dompurify` corre em Node e no browser, mas se chamarmos
 * só no cliente, o payload HTML "sujo" chega ao browser antes de ser
 * limpo — uma fração de segundo é suficiente para alguns ataques.
 */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    // ── Tags permitidas ──────────────────────────────────────
    // Mantemos só formatação visual + links e imagens (necessários
    // para simular phishing realista). Listas, tabelas e divs/spans
    // são úteis para emails marketing-style.
    ALLOWED_TAGS: [
      'p', 'br', 'hr',
      'a', 'img',
      'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li',
      'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'blockquote', 'code', 'pre',
    ],

    // ── Atributos permitidos ─────────────────────────────────
    // `href`, `src`, `alt`, `title`, `style` são os essenciais.
    // `target` e `rel` permitem indicar abertura noutra aba mas
    // são reforçados a seguir pelo hook.
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'style',
      'target', 'rel',
      'width', 'height',
      'class',
    ],

    // ── Schemes permitidos em URLs ───────────────────────────
    // Excluímos `javascript:` (clássico vetor de XSS) e `data:`
    // para scripts embedded. Permitimos `http`, `https`, `mailto`,
    // e fragmentos (`#`) — todos os usados nos seeds existentes.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[#/])/i,

    // ── Garantias adicionais ─────────────────────────────────
    // Como definimos ALLOWED_TAGS, qualquer tag fora da lista é removida
    // automaticamente. FORBID_TAGS aqui é defesa em profundidade (zero
    // confiança que a lista acima esteja completa). Importante: a tag
    // `<style>` é banida, mas o ATRIBUTO `style="..."` continua permitido.
    KEEP_CONTENT: true,         // se uma tag for removida, mantém o texto
    ALLOW_DATA_ATTR: false,     // sem `data-*`
    ALLOW_ARIA_ATTR: false,     // sem `aria-*` (não precisamos)
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction'],
  })
}
