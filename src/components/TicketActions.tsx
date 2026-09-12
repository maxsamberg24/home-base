import { toggleGoing, postToGroup } from "@/app/actions";
import { ticketSearchUrl } from "@/lib/tickets";

export default function TicketActions({
  league,
  eventId,
  awayName,
  homeName,
  isGoing,
  groups,
}: {
  league: string;
  eventId: string;
  awayName: string;
  homeName: string;
  isGoing: boolean;
  groups: { id: string; name: string }[];
}) {
  const matchup = `${awayName} at ${homeName}`;
  const url = ticketSearchUrl(awayName, homeName);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-display uppercase text-ink underline decoration-yellow decoration-4 underline-offset-4"
      >
        See get-in price →
      </a>
      <form action={toggleGoing}>
        <input type="hidden" name="league" value={league} />
        <input type="hidden" name="eventId" value={eventId} />
        <button
          type="submit"
          className={`rounded-full border-2 px-2 py-0.5 font-bold uppercase transition-colors ${
            isGoing ? "border-ink bg-yellow" : "border-hairline hover:bg-yellow-soft"
          }`}
        >
          {isGoing ? "✓ Going" : "I'm going"}
        </button>
      </form>
      {groups.length > 0 && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border-2 border-hairline px-2 py-0.5 font-bold uppercase hover:bg-yellow-soft">
            Share to group
          </summary>
          <form
            action={postToGroup}
            className="absolute left-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border-[3px] border-ink bg-paper p-3 text-xs normal-case shadow-[4px_4px_0_0_#111111]"
          >
            <input type="hidden" name="league" value={league} />
            <input type="hidden" name="eventId" value={eventId} />
            <select
              name="groupId"
              className="rounded-md border-2 border-ink bg-transparent px-2 py-1 text-xs outline-none"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <textarea
              name="message"
              rows={2}
              defaultValue={`Anyone wanna rip ${matchup}? ${url}`}
              className="rounded-md border-2 border-ink bg-transparent px-2 py-1 text-xs outline-none"
            />
            <button
              type="submit"
              className="rounded-full border-2 border-ink bg-ink px-3 py-1 text-[10px] font-bold uppercase text-paper hover:bg-yellow hover:text-ink"
            >
              Post
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
