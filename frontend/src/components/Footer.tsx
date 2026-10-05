import { Code2, ExternalLink, Globe, Mail, Users } from 'lucide-react'
import { Logo } from './Logo'
import { useI18n } from '@/i18n/I18nProvider'

export function Footer() {
  const { t } = useI18n()

  const columns = [
    {
      title: t('footer.profileTitle'),
      links: [t('footer.profile1'), t('footer.profile2'), t('footer.profile3')],
    },
    {
      title: t('footer.supportTitle'),
      links: [
        t('footer.support1'),
        t('footer.support2'),
        t('footer.support3'),
        t('footer.support4'),
      ],
    },
    {
      title: t('footer.legalTitle'),
      links: [t('footer.legal1'), t('footer.legal2'), t('footer.legal3')],
    },
  ]

  return (
    <footer className="mt-20 border-border bg-card">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground italic">{t('footer.tagline')}</p>
          <a
            href="mailto:interview68.com@gmail.com"
            className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('footer.email')}
          </a>
          <div className="mt-5 flex gap-2">
            {[
              { icon: Globe, label: t('footer.profile') },
              { icon: Users, label: t('footer.community') },
              { icon: Code2, label: t('footer.code') },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                title={item.label}
                className="grid h-9 w-9 place-items-center rounded-full bg-muted text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="label-caps">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-secondary-foreground transition-colors hover:text-primary"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="label-caps">{t('footer.communityTitle')}</h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm text-secondary-foreground transition-colors hover:text-primary"
              >
                {t('footer.community1')}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm font-bold text-success transition-opacity hover:opacity-80"
              >
                {t('footer.community2')}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t('footer.tagline')}</span>
          <span>© 2026 interview68</span>
        </div>
      </div>
    </footer>
  )
}