interface Listing {
  id: number;
  title: string;
  categories: string[];
  description?: string;
  price: number;
  currency?: string;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { title, categories, description, price, currency = "USD" } = listing;

  return (
    <article className="card flex flex-col gap-3 md:flex-row md:items-start">
      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] truncate">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]"
            >
              {cat}
            </span>
          ))}
        </div>

        {description && (
          <p className="text-sm text-[var(--text-secondary)] line-clamp-3 md:line-clamp-2">
            {description}
          </p>
        )}
      </div>

      <div className="mt-2 md:mt-0 md:ml-6 flex flex-col items-end justify-between gap-2">
        <div className="text-right">
          <span className="block text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] mb-0.5">
            <b>{process.env.NEXT_PUBLIC_REWARD_TITLE}</b>
          </span>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {currency === "USD" ? "$" : ""}
            {price.toLocaleString()}
          </span>
        </div>
        <a
          href={`/listing/${listing.id}`}
          className="button px-3 py-1.5 text-xs md:text-sm rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] text-center"
        >
          View details
        </a>
      </div>
    </article>
  );
}
