"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";
import toast from "react-hot-toast";
import { Upload, FolderOpen, FileText, Trash2, Download, Plus, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FILE_TYPES = ["homework", "test", "exercise", "resource"] as const;

export default function FilesPage() {
  const { schoolId } = useAuthStore();
  const qc           = useQueryClient();
  const [selectedClass,  setSelectedClass]  = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");
  const [newFolderType,  setNewFolderType]  = useState<typeof FILE_TYPES[number]>("homework");

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const { data: foldersData } = useQuery({
    queryKey: ["folders", schoolId, selectedClass],
    queryFn:  async () => {
      if (!selectedClass) return { folders: [] };
      return (await fetch(`/api/files/folders?schoolId=${schoolId}&classId=${selectedClass}`)).json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: filesData } = useQuery({
    queryKey: ["files", schoolId, selectedFolder],
    queryFn:  async () => {
      if (!selectedFolder) return { files: [] };
      return (await fetch(`/api/files?schoolId=${schoolId}&folderId=${selectedFolder}`)).json();
    },
    enabled: !!schoolId && !!selectedFolder,
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/files/folders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          schoolId, classId: selectedClass,
          name: newFolderName, type: newFolderType,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Folder created");
      qc.invalidateQueries({ queryKey: ["folders"] });
      setShowNewFolder(false);
      setNewFolderName("");
    },
    onError: () => toast.error("Failed to create folder"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("File deleted");
      qc.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("schoolId",     schoolId!);
    formData.append("folderId",     selectedFolder);
    formData.append("classId",      selectedClass);
    formData.append("term",         String(getCurrentTerm()));
    formData.append("academicYear", getCurrentAcademicYear());
    formData.append("title",        file.name.replace(/\.[^.]+$/, ""));

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body:   formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["files"] });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const classes = classesData?.classes ?? [];
  const folders = foldersData?.folders ?? [];
  const files   = filesData?.files   ?? [];

  const folderTypeColor = (type: string) => ({
    homework: "bg-blue-50 text-blue-700 border-blue-200",
    test:     "bg-red-50 text-red-700 border-red-200",
    exercise: "bg-green-50 text-green-700 border-green-200",
    resource: "bg-purple-50 text-purple-700 border-purple-200",
  }[type] ?? "bg-gray-50 text-gray-700 border-gray-200");

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="text-sm text-gray-500 mt-0.5">PDFs, homework, tests — auto-deleted after 4 months</p>
        </div>
      </div>

      {/* Class selector */}
      <div className="card p-4 flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedFolder(""); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none min-w-40"
          >
            <option value="">— Select class —</option>
            {classes.map((c: Record<string, unknown>) => (
              <option key={c["id"] as string} value={c["id"] as string}>{c["name"] as string}</option>
            ))}
          </select>
        </div>
        {selectedClass && (
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" /> New folder
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Folders panel */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Folders</h2>
          </div>
          {!selectedClass ? (
            <div className="p-8 text-center text-gray-400 text-sm">Select a class</div>
          ) : folders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No folders yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {folders.map((folder: Record<string, unknown>) => (
                <button
                  key={folder["id"] as string}
                  onClick={() => setSelectedFolder(folder["id"] as string)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedFolder === (folder["id"] as string) ? "bg-brand-50 border-r-2 border-brand-600" : ""
                  }`}
                >
                  <FolderOpen className={`w-5 h-5 flex-shrink-0 ${selectedFolder === folder["id"] as string ? "text-brand-600" : "text-amber-500"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{folder["name"] as string}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${folderTypeColor(folder["type"] as string)}`}>
                      {folder["type"] as string}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Files panel */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {selectedFolder
                ? `Files in ${folders.find((f: Record<string,unknown>) => f["id"] === selectedFolder)?.["name"] as string ?? "folder"}`
                : "Files"
              }
            </h2>
            {selectedFolder && (
              <label className={`flex items-center gap-2 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-md cursor-pointer hover:bg-brand-700 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : "Upload PDF"}
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>

          {!selectedFolder ? (
            <div className="p-12 text-center text-gray-400 text-sm">Select a folder to view files</div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No files in this folder</p>
              <p className="text-xs text-gray-400 mt-1">Upload PDFs, Word docs or exercises</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {files.map((file: Record<string, unknown>) => {
                const expiresAt = file["expiresAt"] as { seconds: number } | null;
                const expDate   = expiresAt ? new Date(expiresAt.seconds * 1000) : null;
                const isExpired = expDate ? expDate < new Date() : false;

                return (
                  <div key={file["id"] as string} className={`flex items-center gap-3 px-4 py-3 ${isExpired ? "opacity-50" : ""}`}>
                    <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{file["title"] as string}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {((file["fileSize"] as number ?? 0) / 1024 / 1024).toFixed(1)} MB
                        </span>
                        {expDate && (
                          <span className={`flex items-center gap-1 text-xs ${isExpired ? "text-red-500" : "text-gray-400"}`}>
                            <Clock className="w-3 h-3" />
                            {isExpired ? "Expired" : `Expires ${formatDistanceToNow(expDate, { addSuffix: true })}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {file["fileUrl"] && (
                        <a
                          href={file["fileUrl"] as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this file?")) deleteMutation.mutate(file["id"] as string);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New folder modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Create Folder</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Folder Name</label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Week 3 Homework"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {FILE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewFolderType(type)}
                      className={`px-3 py-1.5 text-sm rounded-md border capitalize transition-colors ${
                        newFolderType === type
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowNewFolder(false)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={() => createFolderMutation.mutate()}
                disabled={!newFolderName || createFolderMutation.isPending}
                className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
              >
                {createFolderMutation.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
