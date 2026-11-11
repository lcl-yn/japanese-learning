export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    seoTitle?: string
    description?: string
    robots?: string
    section?: string
  }
}
