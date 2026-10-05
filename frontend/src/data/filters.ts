import type { Specialty, TechKey } from "@/types";

export interface LevelFilter {
  value: Specialty | string;
  label: { vi: string; en: string };
}

export const LEVEL_FILTERS: Array<{ value: string; vi: string; en: string }> = [
  { value: "Intern", vi: "Thực tập", en: "Intern" },
  { value: "Fresher", vi: "Fresher (0-1 năm)", en: "Fresher (0-1 yr)" },
  { value: "Junior", vi: "Junior (1-3 năm)", en: "Junior (1-3 yrs)" },
  { value: "Middle", vi: "Middle (3-5 năm)", en: "Middle (3-5 yrs)" },
  { value: "Senior", vi: "Senior (5-8 năm)", en: "Senior (5-8 yrs)" },
  { value: "Lead", vi: "Lead (8+ năm)", en: "Lead (8+ yrs)" },
  { value: "Principal", vi: "Principal (8+ năm)", en: "Principal (8+ yrs)" },
  { value: "Manager", vi: "Manager (8+ năm)", en: "Manager (8+ yrs)" },
];

export const LANG_FILTERS: Array<{
  value: string;
  vi: string;
  en: string;
  match: string[];
}> = [
  { value: "English", vi: "Tiếng Anh", en: "English", match: ["English"] },
  { value: "vi", vi: "Tiếng Việt", en: "Vietnamese", match: ["Tiếng Việt"] },
];

export interface TechFilter {
  value: TechKey
  vi: string
  en: string
  match: string[]
}

export const TECH_FILTERS: TechFilter[] = [
  {
    value: "Fullstack",
    vi: "Fullstack",
    en: "Fullstack",
    match: ["fullstack", "full stack"],
  },
  {
    value: "Frontend",
    vi: "Frontend",
    en: "Frontend",
    match: ["frontend", "front-end", "front end"],
  },
  {
    value: "Backend",
    vi: "Backend",
    en: "Backend",
    match: ["backend", "back-end", "back end"],
  },
  { value: "Java", vi: "Java", en: "Java", match: ["java", "spring", "spring boot", "jvm"] },
  {
    value: "TypeScript",
    vi: "TypeScript",
    en: "TypeScript",
    match: ["typescript", "type script"],
  },
  {
    value: "JavaScript",
    vi: "JavaScript",
    en: "JavaScript",
    match: ["javascript", "js", "node", "nodejs", "node.js"],
  },
  { value: "Python", vi: "Python", en: "Python", match: ["python", "django", "fastapi", "flask"] },
  { value: "React", vi: "React", en: "React", match: ["react", "reactjs", "react.js", "nextjs", "next.js"] },
  {
    value: "Angular",
    vi: "Angular",
    en: "Angular",
    match: ["angular", "vue", "vuejs", "vue.js", "svelte"],
  },
]

export const SPECIALTY_LABEL: Record<Specialty, { vi: string; en: string }> = {
  Backend: { vi: "Backend", en: "Backend" },
  Frontend: { vi: "Frontend", en: "Frontend" },
  Fullstack: { vi: "Fullstack", en: "Fullstack" },
  Java: { vi: "Java", en: "Java" },
  TypeScript: { vi: "TypeScript", en: "TypeScript" },
  JavaScript: { vi: "JavaScript", en: "JavaScript" },
  Python: { vi: "Python", en: "Python" },
  React: { vi: "React", en: "React" },
  Angular: { vi: "Angular", en: "Angular" },
  "Product Manager": { vi: "Product Manager", en: "Product Manager" },
  "Business Analyst": { vi: "Business Analyst", en: "Business Analyst" },
  "Product Owner": { vi: "Product Owner", en: "Product Owner" },
  "Data Analyst": { vi: "Data Analyst", en: "Data Analyst" },
}

export const PAGE_SIZE = 9;
