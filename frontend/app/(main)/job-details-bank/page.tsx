"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function JobDetailsBankPage() {
  const [jds, setJds] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState({ company: "", role: "", keyword: "" });

  useEffect(() => { loadJds(); }, []);

  const loadJds = async () => {
    try {
      const { data } = await api.get("/api/job-descriptions/");
      setJds(data);
    } catch { /* ignore */ }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const { data: parsed } = await api.post("/api/ai/parse-document", fd, { headers: { "Content-Type": "multipart/form-data" } });
        await api.post("/api/job-descriptions/", {
          role_title: parsed.job_position,
          raw_text: parsed.job_description,
          file_url: file.name,
          parsed_data: parsed,
        });
        toast.success(`Parsed: ${parsed.job_position || file.name}`);
      } catch { toast.error(`Failed: ${file.name}`); }
    }
    setUploading(false);
    loadJds();
    e.target.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/job-descriptions/${id}`);
      toast.success("Deleted");
      loadJds();
    } catch { toast.error("Failed to delete"); }
  };

  const filtered = jds.filter((j) => {
    const p = j.parsed_data || {};
    if (filters.company && !(p.company_name || "").toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.role && !(j.role_title || "").toLowerCase().includes(filters.role.toLowerCase())) return false;
    if (filters.keyword) {
      const text = `${j.role_title || ""} ${j.raw_text || ""} ${p.job_description || ""}`.toLowerCase();
      if (!text.includes(filters.keyword.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Details Bank</h1>
        <label className="cursor-pointer">
          <input type="file" accept=".pdf,.docx,.doc" multiple onChange={handleUpload} className="hidden" />
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <span>{uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload JDs</>}</span>
          </Button>
        </label>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Company" value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })} />
            <Input placeholder="Role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} />
            <Input placeholder="Keyword" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} job descriptions</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((j) => {
          const p = j.parsed_data || {};
          return (
            <Card key={j.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{j.role_title || "Untitled"}</h3>
                    <p className="text-xs text-gray-500">{p.company_name || "Unknown company"}</p>
                  </div>
                  <button onClick={() => handleDelete(j.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                {j.interview_id && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">From Interview</span>}
                <p className="text-xs text-gray-600 mt-2 line-clamp-3">{j.raw_text || p.job_description || "No description"}</p>
                <button onClick={() => setExpanded(expanded === j.id ? null : j.id)} className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                  {expanded === j.id ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More</>}
                </button>
                {expanded === j.id && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1 border-t pt-2">
                    <p><strong>Company:</strong> {p.company_details || "N/A"}</p>
                    <p><strong>Description:</strong> {p.job_description || j.raw_text || "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
