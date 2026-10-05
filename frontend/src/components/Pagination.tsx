import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useI18n()

  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label={t('list.page')}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label={t('list.previous')}
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-secondary-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-current={item === page ? 'page' : undefined}
          aria-label={`${t('list.page')} ${item}`}
          className={cn(
            'grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-colors',
            item === page
              ? 'bg-primary text-white shadow-sm'
              : 'border border-border bg-card text-secondary-foreground hover:border-primary/40 hover:text-primary'
          )}
        >
          {item}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label={t('list.next')}
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-secondary-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  )
}