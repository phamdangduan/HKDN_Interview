import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  Headphones,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { getPosition, getRound } from '@/data/positions'
import { getSpeechRecognition, speak, speechSupported, stopSpeaking } from '@/lib/speech'
import type { Message, SkillScore } from '@/types'
import { cn, formatTime, seededScore, sleep } from '@/lib/utils'

interface LocationState {
  language?: 'English' | 'Tiếng Việt'
}

const REPORT_CRITERIA: Array<{ key: 'session.reportStructure' | 'session.reportEvidence' | 'session.reportClarity'; id: string }> = [
  { key: 'session.reportStructure', id: 'structure' },
  { key: 'session.reportEvidence', id: 'evidence' },
  { key: 'session.reportClarity', id: 'clarity' },
]

export function SessionPage() {
  const { id, roundId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, pick, lang, speechLang } = useI18n()

  const position = getPosition(id)
  const round = getRound(position, roundId)
  const selectedLanguage = (location.state as LocationState | null)?.language

  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 'm-0', role: 'ai', text: round ? pick(round.questions[0]) : '' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [started, setStarted] = useState(false)
  const [remaining, setRemaining] = useState(() => (round?.durationMin ?? 30) * 60)
  const [muted, setMuted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeUp, setTimeUp] = useState(false)

  const questionIndex = useRef(0)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<ReturnType<typeof getSpeechRecognition>>(null)
  const baseInputRef = useRef('')

  const canSpeak = useMemo(() => speechSupported(), [])
  const answeredCount = messages.filter((m) => m.role === 'user').length

  /* ---------------- Đồng hồ đếm ngược ---------------- */
  useEffect(() => {
    if (!started || finished) return
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [started, finished])

  /* Hết giờ → tự động kết thúc phiên */
  useEffect(() => {
    if (!started || remaining > 0 || finished) return
    setTimeUp(true)
    setFinished(true)
    stopRecording()
    stopSpeaking()
  }, [started, remaining, finished])

  /* ---------------- Cuộn xuống đáy ---------------- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  /* ---------------- Đọc tin nhắn AI bằng TTS ---------------- */
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'ai' || muted || finished) return
    speak(last.text, selectedLanguage === 'Tiếng Việt' ? 'vi-VN' : speechLang)
  }, [messages, muted, finished, selectedLanguage, speechLang])

  useEffect(() => {
    if (muted) stopSpeaking()
  }, [muted])

  useEffect(() => () => stopSpeaking(), [])

  /* ---------------- Gửi câu trả lời ---------------- */
  const sendMessage = async (raw: string) => {
    const text = raw.trim()
    if (!text || typing || finished || !round) return

    setInput('')
    setStarted(true)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
    ])

    setTyping(true)
    const wait = 900 + Math.min(2200, text.length * 18)
    await sleep(wait)

    questionIndex.current = Math.min(questionIndex.current + 1, round.questions.length - 1)
    const next = round.questions[questionIndex.current]
    setTyping(false)
    setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'ai', text: next[lang] }])
  }

  /* ---------------- Voice input ---------------- */
  const stopRecording = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
  }

  const toggleRecording = () => {
    if (recording) {
      stopRecording()
      return
    }
    if (!canSpeak) {
      setNotice(t('session.micUnsupported'))
      return
    }

    const recognition = getSpeechRecognition()
    if (!recognition) {
      setNotice(t('session.micUnsupported'))
      return
    }

    recognition.lang = selectedLanguage === 'Tiếng Việt' ? 'vi-VN' : speechLang
    recognition.continuous = true
    recognition.interimResults = true
    baseInputRef.current = input

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setInput(`${baseInputRef.current}${baseInputRef.current ? ' ' : ''}${transcript}`)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setNotice(t('session.micDenied'))
      }
      stopRecording()
    }
    recognition.onend = () => setRecording(false)

    try {
      recognition.start()
      recognitionRef.current = recognition
      setRecording(true)
      setNotice(null)
    } catch {
      setNotice(t('session.micUnsupported'))
    }
  }

  /* ---------------- Báo cáo demo ---------------- */
  const report: SkillScore[] = useMemo(() => {
    if (!round) return []
    const seedBase = `${round.id}-${answeredCount}`
    return REPORT_CRITERIA.map((criterion) => ({
      id: criterion.id,
      name: { vi: t(criterion.key), en: t(criterion.key) },
      score: seededScore(`${seedBase}-${criterion.id}`, 5.4, 9.4),
      note: {
        vi: answeredCount >= 2 ? 'Có minh chứng, nên thêm số liệu định lượng.' : 'Câu trả lời còn ngắn, hãy dùng khung STAR.',
        en: answeredCount >= 2 ? 'Has evidence; add quantified numbers.' : 'Answer is short — use the STAR framework.',
      },
    }))
  }, [round, answeredCount, t])

  const overall = useMemo(() => {
    if (report.length === 0) return 0
    const sum = report.reduce((acc, item) => acc + item.score, 0)
    return Math.round((sum / report.length) * 10) / 10
  }, [report])

  /* ---------------- Render ---------------- */
  if (!position || !round) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-lg font-bold text-foreground">{t('prep.notFound')}</p>
          <Link to="/positions" className="pill mt-5 bg-primary px-5 py-2.5 text-white">
            {t('prep.backToList')}
          </Link>
        </div>
      </div>
    )
  }

  const scorePassed = overall >= round.passScore

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Thanh trên */}
      <header className="sticky top-0 z-30 border-border bg-card">
        <div className="container-page flex h-[76px] items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={t('session.back')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-secondary-foreground transition-colors hover:bg-border hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground sm:text-base">
              Round {round.index}: {round.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {position.company} ·{' '}
              <span className="font-semibold text-primary">{round.type}</span>
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-1.5">
              <span
                className="animate-pulse-ring h-2 w-2 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <div className="leading-none">
                <p className="font-mono text-sm font-bold text-foreground tabular-nums">
                  {formatTime(remaining)}
                </p>
                <p className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  {t('session.remaining')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMuted((prev) => !prev)}
              aria-label={muted ? t('session.unmute') : t('session.mute')}
              aria-pressed={muted}
              title={muted ? t('session.unmute') : t('session.mute')}
              className="grid h-10 w-10 place-items-center rounded-full bg-muted text-secondary-foreground transition-colors hover:bg-border hover:text-primary"
            >
              {muted ? (
                <VolumeX className="h-4.5 w-4.5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={finished}
              className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('session.end')}
            </button>
          </div>
        </div>
      </header>

      {/* Thân trang */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 lg:py-8">
        {/* Khu chat */}
        <section className="flex min-h-[70vh] w-full flex-1 flex-col">
          <div className="scroll-slim flex-1 space-y-4 pb-4">
            {messages.map((message) =>
              message.role === 'ai' ? (
                <article
                  key={message.id}
                  className="max-w-[92%] rounded-2xl rounded-tl-md border border-border bg-card p-4 shadow-sm sm:max-w-[85%]"
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('session.speaker')}
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {message.text}
                  </p>
                </article>
              ) : (
                <article
                  key={message.id}
                  className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-white shadow-sm sm:max-w-[85%]"
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                </article>
              )
            )}

            {typing && (
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5 w-fit">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="animate-typing-dot h-2 w-2 rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${dot * 0.16}s` }}
                  />
                ))}
                <span className="sr-only">{t('session.typing')}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Thanh nhập liệu */}
          <div className="sticky bottom-0 border-border bg-background/95 pt-2 pb-4 backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs text-primary">{t('session.voiceHint')}</p>
              {notice && (
                <p className="flex items-center gap-1 text-xs font-semibold text-destructive">
                  <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  {notice}
                </p>
              )}
              {recording && (
                <p className="flex items-center gap-1 text-xs font-bold text-destructive">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
                  {t('session.listening')}
                </p>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void sendMessage(input)
              }}
              className="relative"
            >
              <div className="pointer-events-none absolute -top-9 left-4 hidden rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg sm:block">
                {t('session.micTooltip')}
                <span
                  className="absolute top-full left-6 h-0 w-0 border-t-4 border-t-foreground border-r-4 border-r-transparent border-l-4 border-l-transparent"
                  aria-hidden="true"
                />
              </div>

              <div className="flex items-center gap-2 rounded-full bg-muted p-2 pl-4 ring-1 ring-transparent transition-shadow focus-within:ring-primary/40">
                <button
                  type="button"
                  onClick={toggleRecording}
                  aria-label={t('session.micTooltip')}
                  aria-pressed={recording}
                  title={t('session.micTooltip')}
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors',
                    recording
                      ? 'bg-destructive text-white'
                      : 'text-secondary-foreground hover:bg-border hover:text-destructive'
                  )}
                >
                  {recording ? (
                    <MicOff className="h-4.5 w-4.5" aria-hidden="true" />
                  ) : (
                    <Mic className="h-4.5 w-4.5" aria-hidden="true" />
                  )}
                </button>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                  rows={1}
                  placeholder={t('session.placeholder')}
                  aria-label={t('session.placeholder')}
                  className="scroll-slim max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
                />

                <button
                  type="submit"
                  disabled={input.trim().length === 0 || typing}
                  aria-label={t('session.send')}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Modal xác nhận kết thúc */}
      {confirmOpen && !finished && (
        <EndConfirmModal
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            stopRecording()
            stopSpeaking()
            setFinished(true)
          }}
        />
      )}

      {/* Báo cáo */}
      {finished && (
        <ReportOverlay
          overall={overall}
          passScore={round.passScore}
          passed={scorePassed}
          timeUp={timeUp}
          answered={answeredCount}
          durationMin={round.durationMin}
          report={report}
          onRestart={() => window.location.reload()}
          onBack={() => navigate('/positions')}
        />
      )}
    </div>
  )
}

function EndConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onCancel}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-extrabold text-foreground">{t('session.endTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('session.endDesc')}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="pill border border-border bg-muted px-5 py-2.5 text-secondary-foreground"
          >
            {t('session.keepGoing')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="pill bg-destructive px-5 py-2.5 text-white"
          >
            {t('session.confirmEnd')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportOverlay({
  overall,
  passScore,
  passed,
  timeUp,
  answered,
  durationMin,
  report,
  onRestart,
  onBack,
}: {
  overall: number
  passScore: number
  passed: boolean
  timeUp: boolean
  answered: number
  durationMin: number
  report: SkillScore[]
  onRestart: () => void
  onBack: () => void
}) {
  const { t, pick } = useI18n()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="card p-6 sm:p-8">
          <p className="label-caps text-primary">{t('session.reportTitle')}</p>
          <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            {timeUp ? t('session.timeUp') : t('session.endTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {timeUp ? t('session.timeUpDesc') : t('session.reportDesc')}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <p className="label-caps">{t('session.reportOverall')}</p>
              <p
                className={cn(
                  'mt-2 font-mono text-3xl font-extrabold',
                  passed ? 'text-success' : 'text-destructive'
                )}
              >
                {overall.toFixed(1)}
                <span className="text-base text-muted-foreground">/10</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('session.passLine')}: {passScore}/10
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <p className="label-caps">{t('session.answered')}</p>
              <p className="mt-2 font-mono text-3xl font-extrabold text-foreground">{answered}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <p className="label-caps">{t('session.duration')}</p>
              <p className="mt-2 font-mono text-3xl font-extrabold text-foreground">
                {durationMin}
                <span className="text-base text-muted-foreground"> min</span>
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {report.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">{pick(item.name)}</p>
                  <p className="font-mono text-sm font-bold text-primary">
                    {item.score.toFixed(1)}/10
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(item.score / 10) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{pick(item.note)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onBack}
              className="pill border border-border bg-muted px-5 py-2.5 text-secondary-foreground"
            >
              {t('session.reportBack')}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="pill bg-primary px-5 py-2.5 text-white"
            >
              {t('session.reportAgain')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}