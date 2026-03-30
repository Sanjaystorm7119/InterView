"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ChevronDown, ChevronUp, Search, X } from "lucide-react";

export default function ResumeBankPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState({ role: "", skills: "", location: "", degree: "", college: "", minYears: "", maxYears: "" });
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadResumes(search); }, []);

  const loadResumes = async (q = "") => {
    try {
      const params = q.trim() ? `?search=${encodeURIComponent(q.trim())}` : "";
      const { data } = await api.get(`/api/resumes/${params}`);
      setResumes(data);
    } catch { /* ignore */ }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadResumes(value), 400);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const { data: parsed } = await api.post("/api/ai/parse-resume", fd, { headers: { "Content-Type": "multipart/form-data" } });
        await api.post("/api/resumes/", {
          candidate_name: parsed.candidate_name,
          candidate_email: parsed.candidate_email,
          file_url: file.name,
          parsed_data: parsed,
        });
        toast.success(`Parsed: ${parsed.candidate_name || file.name}`);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 409) {
          toast.warning(detail || `Duplicate: ${file.name} already exists`);
        } else {
          toast.error(`Failed: ${file.name}`);
        }
      }
    }
    setUploading(false);
    loadResumes(search);
    e.target.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/resumes/${id}`);
      toast.success("Resume deleted");
      loadResumes(search);
    } catch { toast.error("Failed to delete"); }
  };

  const filtered = resumes.filter((r) => {
    const p = r.parsed_data || {};
    if (filters.role && !(p.current_role || "").toLowerCase().includes(filters.role.toLowerCase()) && !(p.experience_summary || "").toLowerCase().includes(filters.role.toLowerCase())) return false;
    if (filters.skills && !(p.skills || []).some((s: string) => s.toLowerCase().includes(filters.skills.toLowerCase()))) return false;
    if (filters.location && !(p.location || "").toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.degree && !(p.degree || "").toLowerCase().includes(filters.degree.toLowerCase()) && !(p.education || "").toLowerCase().includes(filters.degree.toLowerCase())) return false;
    if (filters.college && !(p.college || "").toLowerCase().includes(filters.college.toLowerCase())) return false;
    const years = parseInt(p.years_of_experience || "0");
    if (filters.minYears && years < parseInt(filters.minYears)) return false;
    if (filters.maxYears && years > parseInt(filters.maxYears)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Resume Bank</h1>
        <label className="cursor-pointer">
          <input type="file" accept=".pdf,.docx,.doc" multiple onChange={handleUpload} className="hidden" />
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <span>{uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload Resumes</>}</span>
          </Button>
        </label>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, skills, role..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Input placeholder="Role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} />
            <Input placeholder="Tech stack" value={filters.skills} onChange={(e) => setFilters({ ...filters, skills: e.target.value })} />
            <Input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
            <Input placeholder="Degree" value={filters.degree} onChange={(e) => setFilters({ ...filters, degree: e.target.value })} />
            <Input placeholder="College" value={filters.college} onChange={(e) => setFilters({ ...filters, college: e.target.value })} />
            <Input placeholder="Min yrs" type="number" value={filters.minYears} onChange={(e) => setFilters({ ...filters, minYears: e.target.value })} />
            <Input placeholder="Max yrs" type="number" value={filters.maxYears} onChange={(e) => setFilters({ ...filters, maxYears: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} resumes</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const p = r.parsed_data || {};
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{r.candidate_name || "Unknown"}</h3>
                    <p className="text-xs text-gray-500">{p.current_role || "No role"}</p>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(p.skills || []).slice(0, 5).map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s}</span>
                  ))}
                  {(p.skills || []).length > 5 && <span className="text-xs text-gray-400">+{p.skills.length - 5}</span>}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>{p.location || "Location N/A"} &middot; {p.years_of_experience || "?"} yrs</p>
                  <p>{p.degree || ""} {p.college ? `— ${p.college}` : ""}</p>
                </div>
                <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                  {expanded === r.id ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More</>}
                </button>
                {expanded === r.id && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1 border-t pt-2">
                    <p><strong>Email:</strong> {r.candidate_email || "N/A"}</p>
                    <p><strong>Experience:</strong> {p.experience_summary || "N/A"}</p>
                    <p><strong>Education:</strong> {p.education || "N/A"}</p>
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
