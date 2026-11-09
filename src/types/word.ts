export interface Word {
  cn: string
  jp: string
  jp_write: string
  describe: string
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
