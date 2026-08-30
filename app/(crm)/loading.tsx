export default function Loading() {
  return (
    <div className="app-data-skeleton" aria-busy="true" aria-label="Sahifa yuklanmoqda">
      <div className="skeleton-heading"><span /><span /></div>
      <div className="skeleton-kpis">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-block" />)}
      </div>
      <div className="skeleton-content"><div className="skeleton-block" /><div className="skeleton-block" /></div>
    </div>
  );
}
