import { useCallback, useEffect, useState } from "react";
import {
  Star,
  Pencil,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchGoogleTestimonials,
  saveGoogleTestimonial,
  removeGoogleTestimonial,
  type GoogleTestimonial,
} from "@/lib/googleTestimonialsApi";

interface TestimonialForm {
  id?: string;
  authorName: string;
  rating: number;
  comment: string;
  relativeTime: string;
}

const EMPTY_FORM: TestimonialForm = {
  authorName: "",
  rating: 0,
  comment: "",
  relativeTime: "",
};

function FormStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            }`}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Admin section for curating "Top Google Reviews".
 * Paste favourite Google Maps reviews once — every product page shows them.
 */
export default function GoogleReviewsManager() {
  const [items, setItems] = useState<GoogleTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TestimonialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { testimonials } = await fetchGoogleTestimonials();
    setItems(testimonials);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (t: GoogleTestimonial) => {
    setForm({
      id: t.id,
      authorName: t.authorName,
      rating: t.rating,
      comment: t.comment,
      relativeTime: t.relativeTime,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.authorName.trim()) {
      toast.error("Reviewer name is required");
      return;
    }
    if (form.rating < 1) {
      toast.error("Select a star rating");
      return;
    }
    setSaving(true);
    const current = form.id ? items.find((i) => i.id === form.id) : undefined;
    const { error } = await saveGoogleTestimonial({
      id: form.id,
      authorName: form.authorName,
      rating: form.rating,
      comment: form.comment,
      relativeTime: form.relativeTime,
      displayOrder: current?.displayOrder ?? items.length + 1,
      visible: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(form.id ? "Review updated" : "Review added");
    setForm(EMPTY_FORM);
    setFormOpen(false);
    load();
  };

  const handleDelete = async (t: GoogleTestimonial) => {
    if (!window.confirm(`Delete the review by ${t.authorName}?`)) return;
    const { error } = await removeGoogleTestimonial(t.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Review deleted");
    load();
  };

  const toggleVisible = async (t: GoogleTestimonial) => {
    const { error } = await saveGoogleTestimonial({
      id: t.id,
      authorName: t.authorName,
      rating: t.rating,
      comment: t.comment,
      relativeTime: t.relativeTime,
      displayOrder: t.displayOrder,
      visible: !t.visible,
    });
    if (error) {
      toast.error(error);
      return;
    }
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = items[index + dir];
    const source = items[index];
    if (!target || !source) return;
    const { error: e1 } = await saveGoogleTestimonial({
      ...source,
      displayOrder: target.displayOrder,
    });
    const { error: e2 } = await saveGoogleTestimonial({
      ...target,
      displayOrder: source.displayOrder,
    });
    if (e1 || e2) {
      toast.error(e1 || e2 || "Could not reorder");
      return;
    }
    load();
  };

  return (
    <section className="mb-8 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden />
            Top Google Reviews
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Paste your favourite reviews from Google Maps — they show on every product page.
          </p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Add review
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {form.id ? "Edit review" : "New Google review"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setForm(EMPTY_FORM);
              }}
              aria-label="Cancel"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Reviewer name
              </span>
              <input
                type="text"
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                When (as shown on Google)
              </span>
              <input
                type="text"
                value={form.relativeTime}
                onChange={(e) => setForm({ ...form, relativeTime: e.target.value })}
                placeholder='e.g. "a month ago"'
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
              />
            </label>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Rating</span>
            <FormStars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Review text
            </span>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              rows={3}
              maxLength={600}
              placeholder="Paste the review exactly as it appears on Google…"
              className="w-full resize-none rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
            />
          </label>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setForm(EMPTY_FORM);
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : form.id ? "Update Review" : "Add Review"}
            </button>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && !formOpen && (
        <p className="mt-4 rounded-xl border border-dashed border-border/70 bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No curated reviews yet. Copy a great review from your Google Maps profile and add it here.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((t, index) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border border-border/40 p-3 ${
                t.visible ? "bg-background/60" : "bg-secondary/30 opacity-60"
              }`}
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-green-500/15 text-sm font-extrabold text-blue-600 dark:text-blue-400"
              >
                {t.authorName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{t.authorName}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="flex gap-0.5" aria-label={`${t.rating} stars`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i <= t.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </div>
                  {t.relativeTime && (
                    <span className="text-xs text-muted-foreground">{t.relativeTime}</span>
                  )}
                  {!t.visible && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Hidden
                    </span>
                  )}
                </div>
                {t.comment && (
                  <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-foreground/80">
                    {t.comment}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleVisible(t)}
                  aria-label={t.visible ? "Hide from product pages" : "Show on product pages"}
                  title={t.visible ? "Hide" : "Show"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {t.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-25"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                    className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-25"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  aria-label="Edit review"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  aria-label="Delete review"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
