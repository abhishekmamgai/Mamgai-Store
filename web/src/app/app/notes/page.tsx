import { getNotes, addNote } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function NotesPage() {
  let notes = [];
  let error = "";
  try { notes = await getNotes(); } catch (e) { error = e instanceof Error ? e.message : "Error"; }

  if (error) {
    return <div><h1 className="text-2xl font-semibold">Daily Notes</h1><Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card></div>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Daily Notes</h1>
      <Card className="p-5">
        <form action={addNote} className="space-y-3">
          <input type="hidden" name="note_date" value={today} />
          <div className="space-y-1"><Label>Note</Label>
            <textarea name="content" required className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Supplier payment pending, increase milk tomorrow..." />
          </div>
          <Button type="submit">Save Note</Button>
        </form>
      </Card>
      <Card className="divide-y">
        {notes.map((n) => (
          <div key={n.id} className="p-4">
            <div className="text-xs text-muted-foreground">{n.note_date}</div>
            <div className="mt-1 text-sm">{n.content}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
