import Image from "next/image";
import type { Listing } from "@/data/listings";

type CustomTaskCardProps = {
  listing: Listing;
  bannerUrl?: string;
  logoUrl?: string;
};

export default function CustomTaskCard({ listing, bannerUrl, logoUrl }: CustomTaskCardProps) {
  const { id, title, categories, description, price, currency = "USD" } = listing;
  const hasBanner = Boolean(bannerUrl);
  const hasLogo = Boolean(logoUrl);

  return (
    <article className="card flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 p-0">
      {hasBanner ? (
        <div className="relative h-32 w-full bg-[var(--bg-muted)]">
          <Image
            src={bannerUrl as string}
            alt={`${title} banner`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          {hasLogo && (
            <div className="absolute -bottom-6 left-4 h-12 w-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shadow-md">
              <Image
                src={logoUrl as string}
                alt={`${title} logo`}
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          )}
        </div>
      ) : hasLogo ? (
        <div className="px-4 pt-4">
          <div className="h-12 w-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shadow-md">
            <Image
              src={logoUrl as string}
              alt={`${title} logo`}
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className={`${hasBanner && hasLogo ? "pt-8" : "pt-4"} px-4 pb-4 flex flex-col gap-3 flex-1`}>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
              {title}
            </h3>
          </div>

          {description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-3">
              {description}
            </p>
          )}

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2.5 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-color)] mt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">
                <b>{process.env.NEXT_PUBLIC_REWARD_TITLE}</b>
              </span>
              <span className="text-xl font-bold text-[var(--text-primary)]">
                {currency === "USD" ? "$" : ""}
                {price.toLocaleString()}
              </span>
            </div>
            <a
              href={`/listing/${id}`}
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
