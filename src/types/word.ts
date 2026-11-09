export interface Word {
  index: number
  cn: string
  jp: string
  jp_kanji: string
  part_of_speech: string
  lesson: number
  courseId: string
}

export interface LessonMeta {
  id: number
  name: string
  file: string
}

export interface CourseMeta {
  id: string
  name: string
  lessons: LessonMeta[]
}

export interface WordsManifest {
  courses: CourseMeta[]
}
