import "../styles/Pagination.css";

export default function Pagination({ current, total, pageSize, onChange }) {
  if (total <= pageSize) return null;          // nothing to paginate

  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  // Build page numbers with ellipsis
  function pages() {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2)         range.unshift("...");
    if (current + delta < totalPages - 1) range.push("...");

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range;
  }

  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, total);

  return (
    <div className="pagination">
      <span className="pagination__info">
        {start}–{end} of {total}
      </span>

      <div className="pagination__controls">
        {/* Prev */}
        <button
          className="pagination__btn pagination__btn--arrow"
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        {/* Page numbers */}
        {pages().map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="pagination__dots">…</span>
          ) : (
            <button
              key={p}
              className={`pagination__btn${p === current ? " pagination__btn--active" : ""}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className="pagination__btn pagination__btn--arrow"
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}