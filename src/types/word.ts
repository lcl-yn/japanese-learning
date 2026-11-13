export type BookLevel = 'beginner' | 'intermediate' | 'advanced'
export type BookVolume = 'upper' | 'lower'

export interface Word {
  cn: string
  jp: string
  jp_write: string
  describe: string
  part_of_speech: string
  bookId: string
  unit: number
  lesson: number
}

export interface LessonMeta {
  id: number
  /** 第几课。筛选和路由用这个，不用 id。 */
  lesson: number
  name: string
  file: string
}

export interface UnitMeta {
  /** 第几单元。筛选和路由用这个。 */
  unit: number
  name: string
  lessons: LessonMeta[]
}

export interface BookMeta {
  /** 册代号。路由、词条和课文语法路径用这个，不用数据库主键。 */
  code: string
  name: string
  level: BookLevel
  volume: BookVolume
  units: UnitMeta[]
}

export interface WordsManifest {
  books: BookMeta[]
}

/** 练习和单词本的筛选范围。单元、课为 0 表示不缩到这一层。 */
export interface ScopeOption {
  bookId: string
  unitId: number
  lessonId: number
  label: string
}
