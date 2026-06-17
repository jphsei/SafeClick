import Link from 'next/link'
import { ShieldCheck, BookOpen, ShieldAlert, Award, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">SafeClick</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="#sobre"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sobre
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Entrar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-24 sm:py-32">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-cyan-500 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300 mb-6">
            <ShieldCheck className="h-4 w-4" />
            Plataforma de Cibersegurança para Escolas
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            SafeClick &mdash; Aprende a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              navegar em segurança
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Uma plataforma interativa de aprendizagem em cibersegurança desenvolvida para alunos e
            professores do ensino básico e secundário em Portugal. Protege-te online com
            conhecimento!
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/30"
            >
              Entrar na plataforma
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#sobre"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-6 py-3 text-base font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Saber mais
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: '7+', label: 'Módulos' },
              { value: '3+', label: 'Simulações' },
              { value: '7+', label: 'Badges' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="sobre" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">O que oferecemos</h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Ferramentas e conteúdos educativos para desenvolver competências em cibersegurança de
              forma divertida e eficaz.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="relative rounded-2xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 mb-6">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Módulos de aprendizagem</h3>
              <p className="text-slate-600 leading-relaxed">
                Conteúdos estruturados sobre segurança de passwords, phishing, redes sociais e
                privacidade online. Do básico ao avançado.
              </p>
              <ul className="mt-4 space-y-2">
                {['Aulas interativas', 'Quizzes de avaliação', 'Progresso guardado'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="relative rounded-2xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 mb-6">
                <ShieldAlert className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Simulações de phishing</h3>
              <p className="text-slate-600 leading-relaxed">
                Pratica a identificação de e-mails e websites fraudulentos em ambiente seguro.
                Aprende a reconhecer tentativas de engano.
              </p>
              <ul className="mt-4 space-y-2">
                {['Cenários reais', 'Feedback imediato', 'Diferentes níveis'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="relative rounded-2xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 mb-6">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Badges e conquistas</h3>
              <p className="text-slate-600 leading-relaxed">
                Ganha pontos e desbloqueias emblemas à medida que aprendes. Compara o teu desempenho
                com os colegas no leaderboard.
              </p>
              <ul className="mt-4 space-y-2">
                {['Sistema de pontos', 'Emblemas exclusivos', 'Ranking global'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Teachers Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 mb-4">
                Para professores
              </div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-6">
                Ferramentas para facilitar o ensino
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Os professores têm acesso a um painel de controlo completo para gerir turmas,
                acompanhar o progresso dos alunos e aceder a recursos pedagógicos.
              </p>
              <ul className="space-y-4">
                {[
                  'Gestão de turmas e alunos',
                  'Relatórios de progresso detalhados',
                  'Planos de aula e apresentações',
                  'Atribuição de módulos por turma',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-8 text-white">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Turmas', value: 'Gerir', icon: '👥' },
                  { label: 'Progresso', value: 'Monitorizar', icon: '📊' },
                  { label: 'Recursos', value: 'Aceder', icon: '📚' },
                  { label: 'Relatórios', value: 'Exportar', icon: '📋' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-sm font-medium text-white/80">{item.label}</div>
                    <div className="text-lg font-bold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">Pronto para começar?</h2>
          <p className="text-lg text-blue-100 mb-10">
            Junta-te à comunidade SafeClick e aprende a protegeres-te no mundo digital.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
          >
            Entrar na plataforma
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">SafeClick</span>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} SafeClick &mdash; Projeto académico &mdash;
              Universidade Lusófona CUP
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
