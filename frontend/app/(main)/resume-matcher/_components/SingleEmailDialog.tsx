import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  to: string;
  subject: string;
  body: string;
  sending: boolean;
  onToChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSend: () => void;
}

export default function SingleEmailDialog({
  open, onOpenChange, to, subject, body, sending,
  onToChange, onSubjectChange, onBodyChange, onSend,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Send Email to Candidate
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">To</label>
            <Input type="email" value={to} onChange={(e) => onToChange(e.target.value)} placeholder="candidate@email.com" />
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
              rows={8}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Email body..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
            <Button onClick={onSend} disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-black">
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                : <><Mail className="w-4 h-4 mr-2" />Send Email</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
