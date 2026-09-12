import { createIdentity } from "@/app/actions";
import BallInHandIcon from "@/components/BallInHandIcon";

export default function NameGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border-[3px] border-ink bg-paper p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-ink bg-yellow">
            <BallInHandIcon className="h-8 w-8 text-ink" />
          </span>
          <h1 className="font-display text-xl uppercase">Welcome to The Locker Room</h1>
          <p className="mt-2 text-sm text-muted">
            Pick a display name so friends can see your teams and challenge you to picks. Used
            this before? Type the same name to get back to your account.
          </p>
        </div>
        <form action={createIdentity} className="space-y-3">
          <input
            name="name"
            required
            maxLength={24}
            placeholder="Display name"
            autoFocus
            className="w-full rounded-lg border-[3px] border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="w-full rounded-lg border-[3px] border-ink bg-ink px-3 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            Let&apos;s go
          </button>
        </form>
      </div>
    </div>
  );
}
