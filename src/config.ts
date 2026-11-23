export const SITE = {
  website: "https://paleta-mendoza.pages.dev/",
  author: "Paleta Mendoza",
  profile: "",
  desc: "Torneos y novedades de pelota paleta en Mendoza.",
  title: "Paleta Mendoza",
  ogImage: "images/social/default-og.png",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Sugerir cambios",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
} as const;

/**
 * Publishes the statistics page (`/estadisticas`) and its main-navigation
 * entry. Keep it off until the organizer loads the real official categories
 * and positions (ticket 08 of `.scratch/estadisticas-jugadores`); while off,
 * the page is not built and the entry is not shown.
 */
export const STATISTICS_PAGE_PUBLISHED: boolean = false;
