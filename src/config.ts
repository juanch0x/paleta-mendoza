export const SITE = {
  website: "https://paleta-mendoza.pages.dev/",
  author: "Paleta Mendoza",
  profile: "",
  desc: "Torneos y novedades de pelota paleta en Mendoza.",
  title: "Paleta Mendoza",
  ogImage: "default-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Suggest Changes",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
} as const;
