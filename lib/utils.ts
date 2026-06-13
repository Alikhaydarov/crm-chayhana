export const fmt = (n: number) => n.toLocaleString("uz-UZ");
export const fmtM = (n: number) => `${fmt(n)} so'm`;
export const fmtKRW = (n: number) => `₩${fmt(n)}`;
export const fmtD = (s: string) =>
  new Date(s).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
