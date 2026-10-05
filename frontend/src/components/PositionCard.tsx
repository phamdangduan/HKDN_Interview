import { Link } from 'react-router-dom'
import {
  Atom,
  Binary,
  Braces,
  ChartNoAxesColumn,
  ClipboardList,
  Coffee,
  Compass,
  FileCode,
  FileCode2,
  Flame,
  Languages,
  Layers,
  Lightbulb,
  MapPin,
  PanelsTopLeft,
  Triangle,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Position, Specialty } from '@/types'
import { useI18n } from '@/i18n/I18nProvider'
import { SPECIALTY_LABEL } from '@/data/filters'

const SPECIALTY_ICON: Record<Specialty, LucideIcon> = {
  Backend: Braces,
  Frontend: PanelsTopLeft,
  Fullstack: Layers,
  Java: Coffee,
  TypeScript: FileCode2,
  JavaScript: FileCode,
  Python: Binary,
  React: Atom,
  Angular: Triangle,
  'Product Manager': Compass,
  'Business Analyst': ChartNoAxesColumn,
  'Product Owner': ClipboardList,
  'Data Analyst': Lightbulb,
}

const MAX_VISIBLE_SKILLS = 3

export function PositionCard({ position }: { position: Position }) {
  const { t, pick, lang } = useI18n()
  const Icon = SPECIALTY_ICON[position.specialty]

  const visibleSkills = position.skills.slice(0, MAX_VISIBLE_SKILLS)
  const hiddenSkills = position.skills.length - visibleSkills.length

  const to = `/positions/${position.id}/rounds/${position.rounds[0].id}`

  return (
    <Link
      to={to}
      aria-label={t('card.open', { title: position.title })}
      className="group card flex h-full flex-col p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 pr-16">
          <p className="truncate text-xs font-semibold text-muted-foreground">{position.company}</p>
          <h3 className="truncate text-[15px] font-bold text-foreground group-hover:text-primary">
            {position.title}
          </h3>
        </div>

        {position.hot && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive uppercase">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {t('card.hot')}
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {pick(position.summary)}
      </p>

      <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <li className="inline-flex items-center gap-1 text-xs font-bold text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {SPECIALTY_LABEL[position.specialty][lang]}
        </li>
        <li className="inline-flex items-center gap-1 text-xs font-bold text-primary">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          {position.level}
        </li>
        <li className="chip bg-muted text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {position.location}
        </li>
        <li className="chip bg-muted text-muted-foreground">
          <Users className="h-3 w-3" aria-hidden="true" />
          {t('card.applicants', { n: position.applicants })}
        </li>
        <li className="chip bg-muted text-muted-foreground">
          <Languages className="h-3 w-3" aria-hidden="true" />
          {position.languages.join(' / ')}
        </li>
      </ul>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {visibleSkills.map((skill) => (
          <li key={skill} className="chip rounded-md bg-accent text-accent-foreground">
            {skill}
          </li>
        ))}
        {hiddenSkills > 0 && (
          <li className="chip rounded-md bg-accent text-accent-foreground">+{hiddenSkills}</li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between border-border pt-4">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          {t('card.rounds', { n: position.rounds.length })}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-chart-3">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          {t('card.hints')}
        </span>
      </div>
    </Link>
  )
}

export function PositionCardSkeleton() {
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-auto h-3 w-24 animate-pulse rounded bg-muted pt-5" />
    </div>
  )
}