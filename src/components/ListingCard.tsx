interface Listing {
  id: number;
  title: string;
  categories: string[];
  description?: string;
  price: number;
  currency?: string;
  images?: string[];
  status?: string | null;
}

interface ListingCardProps {
  listing: Listing;
  showStatus?: boolean;
}

interface ListingWithState extends Listing {
  stateLabel?: "open" | "unavailable" | null;
}

interface ListingCardWithStateProps extends ListingCardProps {
  listing: ListingWithState;
  stateLabel?: "open" | "unavailable" | null;
}

export default function ListingCard({ listing, showStatus = false, stateLabel }: ListingCardWithStateProps) {
  const { title, categories, description, price, currency = "USD", status } = listing;
  const thumbnail = listing.images?.[0] || "https://placehold.co/600x340/e5e7eb/6b7280?text=Task+Preview";

  const isPendingPayment = showStatus && status === "pending_payment";
  const isFinished = showStatus && status === "task_accepted";

  return (
    <article className="card flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 min-h-[400px]">


      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {stateLabel === "open" && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase ${
                "border-[2px] border-[var(--success)] bg-[var(--bg-muted)] text-[var(--text-primary)]"
              }`}
            >
              Open
            </span>
          )}
          {showStatus && (isFinished || isPendingPayment) && (
            <span
              className={`${
                isFinished
                  ? "badge-success"
                  : "badge-warning"
              } inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase`}
            >
              {isFinished ? "Finished" : "Pending payment"}
            </span>
          )}
          {categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2.5 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)] mb-3 line-clamp-2 min-h-[3rem]">
          {title}
        </h2>

        {/* Description */}
        {description && (
          <div className="text-sm text-[var(--text-secondary)] mb-4 flex-1 overflow-y-auto max-h-[200px] pr-2 scrollbar-thin">
            {description}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-color)] mt-auto">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">
                <b>{process.env.NEXT_PUBLIC_REWARD_TITLE}</b>
              </span>
              <span className="text-xl font-bold text-[var(--text-primary)]">
                {currency === "USD" ? "$" : ""}
                {price.toLocaleString()}
              </span>
            </div>
            <a
              href={`/listing/${listing.id}`}
              className="button px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              View
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
