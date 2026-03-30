import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, Phone, X } from "lucide-react";
import { BulkCandidate, scoreColor } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: BulkCandidate[];
  subject: string;
  body: string;
  sending: boolean;
  progress: { done: number; total: number };
  onCandidatesChange: (candidates: BulkCandidate[]) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSend: () => void;
}

export default function BulkEmailDialog({
  open, onOpenChange, candidates, subject, body, sending, progress,
  onCandidatesChange, onSubjectChange, onBodyChange, onSend,
}: Props) {
  const checkedCount = candidates.filter((c) => c.checked && c.email).length;

  const toggleAll = () =>
    onCandidatesChange(candidates.map((c) => ({ ...c, checked: !!(c.email) })));

  const toggleOne = (i: number) =>
    onCandidatesChange(candidates.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)));

  const removeOne = (i: number) =>
    onCandidatesChange(candidates.filter((_, j) => j !== i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Email All Matching Candidates
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">
                Recipients
                <span className="text-gray-400 font-normal ml-1.5">({checkedCount} selected)</span>
              </label>
              <button className="text-xs text-amber-600 hover:text-amber-700" onClick={toggleAll}>
                Select all with email
              </button>
            </div>
            <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
              {candidates.map((c, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 ${!c.email ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-amber-500"
                    checked={c.checked}
                    disabled={!c.email}
                    onChange={() => toggleOne(i)}
                  />
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                      {c.email ? (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                      ) : (
                        <span className="italic text-gray-300">no email on file</span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                      )}
                    </div>
                    {c.interviewLink ? (
                      <p className="text-xs text-blue-500 truncate mt-0.5">{c.interviewLink}</p>
                    ) : (
                      <p className="text-xs text-amber-500 mt-0.5">No interview linked to this JD</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${scoreColor(c.match.confidence_score)}`}>
                    {Number(c.match.confidence_score).toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); removeOne(i); }}
                    className="ml-1 text-gray-300 hover:text-red-400 shrink-0 mt-0.5 transition-colors"
                    title="Remove from list"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              <strong>[Candidate Name]</strong>, <strong>[Role]</strong>, <strong>[Company]</strong>, and <strong>[Interview Link]</strong> are replaced per recipient.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="Email subject" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={7}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Email body..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-1">
          <span className="text-xs text-gray-500">
            {sending ? `Sending ${progress.done}/${progress.total}…` : "Interview links are auto-filled per candidate"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
            <Button
              onClick={onSend}
              disabled={sending || checkedCount === 0}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress.done}/{progress.total}</>
                : <><Mail className="w-4 h-4 mr-2" />Send to {checkedCount}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
