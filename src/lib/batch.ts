// Batch-based content filtering helpers.
// Content (Test, TestSeries, LiveClass, RecordedClass) stores its target batch as a
// comma-separated string, e.g. "NDA" or "CDS,OTA". A student belongs to a single batch.

export const SINGLE_BATCHES = ["NDA", "CDS", "OTA"] as const;
export type SingleBatch = (typeof SINGLE_BATCHES)[number];

// The exactly-6 options offered in every creation form's batch dropdown.
// `value` is the stored comma-separated string; `label` is what the teacher sees.
export const BATCH_OPTIONS: { value: string; label: string }[] = [
  { value: "NDA", label: "NDA" },
  { value: "CDS", label: "CDS" },
  { value: "OTA", label: "OTA" },
  { value: "NDA,CDS", label: "NDA + CDS" },
  { value: "NDA,OTA", label: "NDA + OTA" },
  { value: "CDS,OTA", label: "CDS + OTA" },
];

/**
 * Returns true if a piece of content is visible to a student.
 * @param contentBatchString comma-separated batches the content targets, e.g. "CDS,OTA"
 * @param studentBatch the single batch the student belongs to, e.g. "CDS"
 */
export function isContentVisibleToStudent(
  contentBatchString: string | null | undefined,
  studentBatch: string
): boolean {
  if (!contentBatchString) return false;
  const allowedBatches = contentBatchString.split(",").map((b) => b.trim());
  return allowedBatches.includes(studentBatch);
}

/** Pretty label for a stored batch string, e.g. "CDS,OTA" -> "CDS + OTA". */
export function formatBatchLabel(contentBatchString: string | null | undefined): string {
  if (!contentBatchString) return "";
  return contentBatchString
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean)
    .join(" + ");
}

const ACTIVE_BATCH_KEY = "adminActiveBatch";

/** Reads the admin's currently-focused batch from localStorage (default "NDA"). Client-only. */
export function getActiveBatch(): SingleBatch {
  if (typeof window === "undefined") return "NDA";
  const stored = window.localStorage.getItem(ACTIVE_BATCH_KEY);
  return (SINGLE_BATCHES as readonly string[]).includes(stored || "")
    ? (stored as SingleBatch)
    : "NDA";
}

/** Persists the admin's currently-focused batch to localStorage. Client-only. */
export function setActiveBatch(batch: SingleBatch): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_BATCH_KEY, batch);
}
