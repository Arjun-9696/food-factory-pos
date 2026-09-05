import { ChefHat, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BaseState({ icon, title, message, actions }: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center animate-fade-in">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/60 dark:to-amber-950/40">
        {icon}
      </div>
      <h1 className="text-xl font-extrabold text-foreground md:text-2xl">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  );
}

const secondaryBtn =
  "inline-flex h-11 items-center rounded-xl border border-border/70 bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary";
const primaryBtn =
  "inline-flex h-11 items-center rounded-xl cart-gradient px-6 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.98]";

export function ProductErrorState({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();
  return (
    <BaseState
      icon={<ChefHat className="w-9 h-9 text-orange-600 dark:text-orange-400" aria-hidden />}
      title="Something went wrong"
      message="Unable to load this delicious item right now."
      actions={
        <>
          <button type="button" onClick={onRetry} className={primaryBtn}>
            Try Again
          </button>
          <button type="button" onClick={() => navigate("/")} className={secondaryBtn}>
            Back to Menu
          </button>
        </>
      }
    />
  );
}

export function ProductNotFoundState() {
  const navigate = useNavigate();
  return (
    <BaseState
      icon={<SearchX className="w-9 h-9 text-orange-600 dark:text-orange-400" aria-hidden />}
      title="Product Not Found"
      message="This item may have been removed from our menu."
      actions={
        <button type="button" onClick={() => navigate("/")} className={primaryBtn}>
          Explore Menu
        </button>
      }
    />
  );
}
