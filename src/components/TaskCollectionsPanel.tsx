"use client";

import { useEffect, useState } from "react";

type TaskCollectionsPanelProps = {
  taskId: number;
  isOpen: boolean;
  initialCollection: { id: number; name: string } | null;
  onClose: () => void;
  onCollectionChange?: (collection: { id: number; name: string } | null) => void;
};

type CollectionOption = {
  id: number;
  name: string;
};

export default function TaskCollectionsPanel({
  taskId,
  isOpen,
  initialCollection,
  onClose,
  onCollectionChange,
}: TaskCollectionsPanelProps) {
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialCollection?.id ?? null,
  );
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX_COLLECTIONS = 5;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tasks/collections");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            (data && (data as any).error) ||
              "Failed to load collections. Please try again.",
          );
          return;
        }

        if (cancelled) return;

        const list = Array.isArray((data as any).collections)
          ? ((data as any).collections as any[]).map((row) => ({
              id: row.id as number,
              name: (row.name as string) ?? "Untitled collection",
            }))
          : [];

        setCollections(list);
      } catch {
        if (!cancelled) {
          setError("Failed to load collections. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(initialCollection?.id ?? null);
  }, [initialCollection, isOpen]);

  if (!isOpen) return null;

  const hasReachedCollectionLimit = collections.length >= MAX_COLLECTIONS;

  const handleAssignExisting = async () => {
    if (selectedId == null) {
      await handleRemove();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data as any).error) ||
            "Failed to update collection. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      const returned = (data as any).collection as
        | { id: number; name: string }
        | null
        | undefined;

      if (returned) {
        onCollectionChange?.({ id: returned.id, name: returned.name });
      } else {
        onCollectionChange?.(null);
      }
      window.location.reload();
    } catch {
      setIsSubmitting(false);
      setError("Failed to update collection. Please try again.");
    }
  };

  const handleCreateAndAssign = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data as any).error) ||
            "Failed to create collection. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      const returned = (data as any).collection as
        | { id: number; name: string }
        | null
        | undefined;

      if (returned) {
        onCollectionChange?.({ id: returned.id, name: returned.name });
        setSelectedId(returned.id);
        setCollections((prev) => {
          const exists = prev.some((c) => c.id === returned.id);
          return exists
            ? prev
            : [...prev, { id: returned.id, name: returned.name }];
        });
        setNewName("");
      }
        window.location.reload();
    } catch {
      setIsSubmitting(false);
      setError("Failed to create collection. Please try again.");
    }
  };

  const handleRemove = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data as any).error) ||
            "Failed to remove from collection. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      onCollectionChange?.(null);
      setSelectedId(null);
    } catch {
      setIsSubmitting(false);
      setError("Failed to remove from collection. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-collections-title"
      >
        <h2
          id="task-collections-title"
          className="text-base font-semibold text-[var(--text-primary)]"
        >
          Manage task collection
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Group this task into a collection so you can show related tasks on this page.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Existing collections
            </label>
            <select
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              value={selectedId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedId(value ? Number(value) : null);
              }}
              disabled={isLoading || isSubmitting}
            >
              <option value="">No collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mt-2 inline-flex items-center rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
              onClick={handleAssignExisting}
              disabled={isLoading || isSubmitting}
            >
              Save selection
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Create new collection
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder="e.g. Onboarding series, Design tasks"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isSubmitting || hasReachedCollectionLimit}
              maxLength={120}
            />
            {!hasReachedCollectionLimit && <button
              type="button"
              className="mt-2 inline-flex items-center rounded-lg bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] disabled:opacity-70"
              onClick={handleCreateAndAssign}
              disabled={isSubmitting || !newName.trim() || hasReachedCollectionLimit}
            >
              Create and assign
            </button>}
            {hasReachedCollectionLimit && (
              <p className="text-[0.7rem] text-[var(--text-muted)] mt-1">
                You can create up to {MAX_COLLECTIONS} collections. Delete or reuse an
                existing collection to create a new one.
              </p>
            )}
          </div>

          {initialCollection && false && (
            <div className="pt-1">
              <button
                type="button"
                className="text-xs font-medium text-[var(--danger)] hover:underline disabled:opacity-70"
                onClick={handleRemove}
                disabled={isSubmitting}
              >
                Remove task from current collection
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
