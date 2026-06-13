export const fmt = (n: number) => n.toLocaleString("kr-KR");
export const fmtM = (n: number) => `${fmt(n)} won`;
export const fmtKRW = (n: number) => `₩${fmt(n)}`;
export const fmtD = (s: string) =>
  new Date(s).toLocaleString("kr-KR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("kr-KR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
