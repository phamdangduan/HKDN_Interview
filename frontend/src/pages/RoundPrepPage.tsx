import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Languages,
  Layers,
  Lightbulb,
  Play,
  Target,
} from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { getPosition, getRound } from '@/data/positions'

const ROUND_TYPE_LABEL: Record<string, string> = {
  TECHNICAL: 'TECHNICAL',
  BEHAVIORAL: 'BEHAVIORAL',
  'CASE STUDY': 'CASE STUDY',
  'SYSTEM DESIGN': 'SYSTEM DESIGN',
}

export function RoundPrepPage() {
  const { id, roundId } = useParams()
  const navigate = useNavigate()
  const { t, pick, lang } = useI18n()

  const position = getPosition(id)
  const round = getRound(position, roundId)
  const [language, setLanguage] = useState<'English' | 'Tiếng Việt'>(round?.language ?? 'Tiếng Việt')

  if (!position || !round) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-lg font-bold text-foreground">{t('prep.notFound')}</p>
          <Link
            to="/positions"
            className="pill mt-5 bg-primary px-5 py-2.5 text-white"
          >
            {t('prep.backToList')}
          </Link>
        </div>
      </div>
    )
  }

  const languageOptions: Array<'English' | 'Tiếng Việt'> = ['English', 'Tiếng Việt']
  const languageHint: Record<'English' | 'Tiếng Việt', string> = {
    English: lang === 'vi' ? 'Tiếng Anh' : 'English',
    'Tiếng Việt': lang === 'vi' ? 'Tiếng Việt' : 'Vietnamese',
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="sticky top-0 z-30 border-border bg-card/95 backdrop-blur">
        <div className="container-page flex h-14 items-center">
          <Link
            to="/positions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-secondary-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('prep.back')}
          </Link>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[800px] px-4 pt-10 pb-40">
        <header>
          <p className="label-caps text-primary">{t('prep.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-extrabold text-foreground">
            Round {round.index}: {round.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{position.company}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="pill bg-accent px-3 py-1.5 text-xs text-primary">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {t('prep.roundOf', { i: round.index, n: position.rounds.length })}
            </span>
            <span className="pill bg-muted px-3 py-1.5 text-xs text-secondary-foreground">
              {ROUND_TYPE_LABEL[round.type]}
            </span>
            <span className="pill border border-success/40 bg-success-soft px-3 py-1.5 text-xs text-success">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {t('prep.limit', { n: round.durationMin })}
            </span>
            <span className="pill px-3 py-1.5 text-xs font-bold text-foreground">
              {t('prep.passScore', { score: round.passScore })}
            </span>
            <span className="pill bg-muted px-3 py-1.5 text-xs text-secondary-foreground">
              {languageHint[language]}
            </span>
          </div>
        </header>

        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Languages className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('prep.languageTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('prep.languageDesc')}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {languageOptions.map((option) => {
              const selected = option === language
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  aria-pressed={selected}
                  className={`relative flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-accent'
                      : 'border-border bg-muted hover:border-foreground/20'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-foreground">{option}</span>
                    <span className="block text-xs text-muted-foreground">{languageHint[option]}</span>
                  </span>
                  {selected && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Lightbulb className="h-5 w-5 text-chart-3" aria-hidden="true" />
            {t('prep.prepTitle')}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {round.prep.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-secondary-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{pick(item)}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {round.skills.map((skill) => (
              <li key={skill} className="chip rounded-md bg-accent text-accent-foreground">
                {skill}
              </li>
            ))}
          </ul>
        </section>

        <section className="relative mt-5 overflow-hidden rounded-2xl border border-primary/20 bg-linear-135 from-accent to-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('prep.focusTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary-foreground">{pick(round.focus)}</p>
          <p className="mt-3 text-xs font-semibold text-primary">
            {position.title} · {round.interviewer}
          </p>
        </section>

        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('prep.jdTitle')}
          </h2>
          <div className="scroll-slim mt-4 h-80 overflow-y-auto rounded-2xl bg-muted p-5 text-sm leading-relaxed whitespace-pre-line text-secondary-foreground">
            {pick(round.jd)}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[800px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">{t('prep.actionNote')}</p>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/positions/${position.id}/rounds/${round.id}/session`,
                { state: { language } }
              )
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </span>
            {t('prep.start')}
          </button>
        </div>
      </div>
    </div>
  )
}