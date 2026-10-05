import { useEffect, useMemo, useState } from "react";
import { Info, SearchX } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import type {
  GroupFilter,
  LanguageFilter,
  LevelFilter,
  TechFilter,
} from "@/components/FilterBar";
import { PositionCard, PositionCardSkeleton } from "@/components/PositionCard";
import { Pagination } from "@/components/Pagination";
import { useI18n } from "@/i18n/I18nProvider";
import { allPositions } from "@/data/positions";
import { LANG_FILTERS, PAGE_SIZE, TECH_FILTERS } from "@/data/filters";

export function PositionsPage() {
  const { t } = useI18n();

  const [group, setGroup] = useState<GroupFilter>("all");
  const [tech, setTech] = useState<TechFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [language, setLanguage] = useState<LanguageFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const langOption = LANG_FILTERS.find((item) => item.value === language);
    const techOption = TECH_FILTERS.find((item) => item.value === tech);

    return allPositions.filter((position) => {
      if (group === "hot" && !position.hot) return false;
      if (techOption) {
        const haystack = [
          position.specialty,
          position.title,
          ...position.skills,
        ].join(" ");
        const matched = techOption.match.some((keyword) =>
          new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
            haystack,
          ),
        );
        if (!matched) return false;
      }
      if (level !== "all" && position.level !== level) return false;
      if (
        langOption &&
        !position.languages.some((l) => langOption.match.includes(l))
      )
        return false;
      return true;
    });
  }, [group, tech, level, language]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visible = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const handleGroupChange = (value: GroupFilter) => {
    setGroup(value);
    setPage(1);
  };

  const handleTechChange = (value: TechFilter) => {
    setTech(value);
    setPage(1);
  };

  const handleLevelChange = (value: LevelFilter) => {
    setLevel(value);
    setPage(1);
  };

  const handleLanguageChange = (value: LanguageFilter) => {
    setLanguage(value);
    setPage(1);
  };

  const clearFilters = () => {
    setGroup("all");
    setTech("all");
    setLevel("all");
    setLanguage("all");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <section className="container-page pt-12 pb-10 text-center sm:pt-16">
          <h1 className="text-3xl font-extrabold text-primary sm:text-[40px]">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {t("hero.subtitle")}
          </p>
          <p className="mx-auto mt-5 flex max-w-3xl items-start gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-left text-xs leading-relaxed text-muted-foreground">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{t("hero.notice")}</span>
          </p>
        </section>

        <section className="container-page">
          <FilterBar
            group={group}
            tech={tech}
            level={level}
            language={language}
            onGroupChange={handleGroupChange}
            onTechChange={handleTechChange}
            onLevelChange={handleLevelChange}
            onLanguageChange={handleLanguageChange}
            onClear={clearFilters}
          />
        </section>

        <section className="container-page mt-10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-muted-foreground">
              {t("filter.resultCount", { n: filtered.length })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("list.page")} {currentPage}/{totalPages}
            </p>
          </div>

          {loading ? (
            <div
              className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-label={t("list.loading")}
            >
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <PositionCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="card mt-5 flex flex-col items-center gap-3 px-6 py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                <SearchX className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-foreground">
                {t("list.empty.title")}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("list.empty.desc")}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="pill mt-2 bg-primary px-5 py-2 text-white"
              >
                {t("filter.clear")}
              </button>
            </div>
          ) : (
            <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((position) => (
                <li key={position.id} className="h-full">
                  <PositionCard position={position} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </section>
      </main>

      <Footer />

      <p className="sr-only" aria-live="polite">
        {t("filter.resultCount", { n: filtered.length })}
      </p>
    </div>
  );
}
