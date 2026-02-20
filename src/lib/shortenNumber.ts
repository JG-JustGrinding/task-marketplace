export function shortenNumber(value: number): string {
	if (!Number.isFinite(value)) return "";

	const abs = Math.abs(value);

	if (abs < 1000) {
		return String(value);
	}

	const units = [
		{ limit: 1_000_000_000_000, suffix: "T" },
		{ limit: 1_000_000_000, suffix: "B" },
		{ limit: 1_000_000, suffix: "M" },
		{ limit: 1_000, suffix: "k" },
	];

	for (const { limit, suffix } of units) {
		if (abs >= limit) {
			const shortened = value / limit;
			const factor = shortened < 10 ? 10 : 1;
			// Truncate instead of round to at most one decimal
			const truncated = Math.trunc(shortened * factor) / factor;
			const formatted = truncated.toFixed(shortened < 10 ? 1 : 0);
			// Remove trailing .0 (e.g., 1.0k -> 1k)
			return `${formatted.replace(/\.0$/, "")}${suffix}`;
		}
	}

	return String(value);
}

export default shortenNumber;

