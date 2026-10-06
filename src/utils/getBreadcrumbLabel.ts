const routeLabels: Record<string, string> = {
  about: "Acerca de",
  archives: "Archivo",
  posts: "Noticias",
  search: "Buscar",
  tags: "Tags",
};

export function getBreadcrumbLabel(segment: string): string {
  return routeLabels[segment] ?? segment;
}
