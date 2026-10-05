import { Flame, FolderClosed, Languages, RotateCcw, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TechKey } from '@/types'
import { useI18n } from '@/i18n/I18nProvider'
import { LANG_FILTERS, LEVEL_FILTERS, TECH_FILTERS } from '@/data/filters'
import { cn } from '@/lib/utils'

export type GroupFilter = 'all' | 'hot'
export type TechFilter = 'all' | TechKey
export type LevelFilter = 'all' | string
export type LanguageFilter = 'all' | string

interface FilterBarProps {
  group: GroupFilter
  tech: TechFilter
  level: LevelFilter
  language: LanguageFilter
  onGroupChange: (value: GroupFilter) => void
  onTechChange: (value: TechFilter) => void
  onLevelChange: (value: LevelFilter) => void
  onLanguageChange: (value: LanguageFilter) => void
  onClear: () => void
}

function StaticPill({
  icon: Icon,
  label,
  active,
  tone = 'brand',
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  tone?: 'brand' | 'danger'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pill border',
        tone === 'brand' &&
          (active
            ? 'border-primary bg-primary text-white shadow-sm'
            : 'border-transparent text-secondary-foreground hover:bg-muted'),
        tone === 'danger' &&
          (active
            ? 'border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/30'
            : 'border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive')
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}

function PillButton({
  label,
  active,
  tone = 'brand',
  onClick,
  icon: Icon,
}: {
  label: string
  active: boolean
  tone?: 'brand' | 'accent' | 'plain'
  icon?: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pill',
        active && tone === 'brand' && 'bg-primary text-white',
        active && tone === 'accent' && 'bg-success-strong text-white',
        active && tone === 'plain' && 'text-primary',
        !active && tone === 'plain' && 'text-foreground font-bold hover:text-primary',
        !active && tone !== 'plain' && 'border border-border bg-muted text-secondary-foreground hover:bg-border'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  )
}

export function FilterBar({
  group,
  tech,
  level,
  language,
  onGroupChange,
  onTechChange,
  onLevelChange,
  onLanguageChange,
  onClear,
}: FilterBarProps) {
  const { t, lang } = useI18n()

  const hasFilter =
    group !== 'all' || tech !== 'all' || level !== 'all' || language !== 'all'

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <StaticPill
          icon={FolderClosed}
          label={t('filter.all')}
          active={group === 'all'}
          onClick={() => onGroupChange('all')}
        />
        <StaticPill
          icon={Flame}
          label={t('filter.hot')}
          tone="danger"
          active={group === 'hot'}
          onClick={() => onGroupChange('hot')}
        />

        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="pill text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t('filter.clear')}
            <RotateCcw className="hidden h-3 w-3 sm:block" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        <span className="label-caps shrink-0">{t('filter.tech')}</span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
          <PillButton
            label={t('filter.allTechs')}
            active={tech === 'all'}
            tone="accent"
            onClick={() => onTechChange('all')}
          />
          {TECH_FILTERS.map((item) => (
            <PillButton
              key={item.value}
              label={item[lang]}
              active={tech === item.value}
              tone="plain"
              onClick={() => onTechChange(item.value)}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        <span className="label-caps shrink-0">{t('filter.level')}</span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
          <PillButton
            label={t('filter.allLevels')}
            active={level === 'all'}
            tone="accent"
            onClick={() => onLevelChange('all')}
          />
          {LEVEL_FILTERS.map((item) => (
            <PillButton
              key={item.value}
              label={item[lang]}
              active={level === item.value}
              tone="plain"
              onClick={() => onLevelChange(item.value)}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        <span className="label-caps shrink-0">{t('filter.language')}</span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
          <PillButton
            label={t('filter.allLanguages')}
            active={language === 'all'}
            icon={Languages}
            onClick={() => onLanguageChange('all')}
          />
          {LANG_FILTERS.map((item) => (
            <PillButton
              key={item.value}
              label={item[lang]}
              active={language === item.value}
              onClick={() => onLanguageChange(item.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
