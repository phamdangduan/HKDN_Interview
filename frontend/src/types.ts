export type Lang = 'vi' | 'en'

export type Localized = Record<Lang, string>

export type Level =
  | 'Intern'
  | 'Fresher'
  | 'Junior'
  | 'Middle'
  | 'Senior'
  | 'Lead'
  | 'Principal'
  | 'Manager'

export type TechKey =
  | 'Fullstack'
  | 'Frontend'
  | 'Backend'
  | 'Java'
  | 'TypeScript'
  | 'JavaScript'
  | 'Python'
  | 'React'
  | 'Angular'

export type Specialty =
  | 'Backend'
  | 'Frontend'
  | 'Fullstack'
  | 'Java'
  | 'TypeScript'
  | 'JavaScript'
  | 'Python'
  | 'React'
  | 'Angular'
  | 'Product Manager'
  | 'Business Analyst'
  | 'Product Owner'
  | 'Data Analyst'

export type PositionGroup = 'tech' | 'nontech'

export type RoundType = 'TECHNICAL' | 'BEHAVIORAL' | 'CASE STUDY' | 'SYSTEM DESIGN'

export interface Round {
  id: string
  index: number
  title: string
  type: RoundType
  durationMin: number
  passScore: number
  language: 'English' | 'Tiếng Việt'
  interviewer: string
  focus: Localized
  prep: Localized[]
  skills: string[]
  jd: Localized
  questions: Localized[]
}

export interface Position {
  id: string
  company: string
  title: string
  summary: Localized
  hot: boolean
  specialty: Specialty
  group: PositionGroup
  level: Level
  location: string
  applicants: number
  languages: string[]
  skills: string[]
  rounds: Round[]
}

export interface Message {
  id: string
  role: 'ai' | 'user'
  text: string
}

export interface SkillScore {
  id: string
  name: Localized
  score: number
  note: Localized
}