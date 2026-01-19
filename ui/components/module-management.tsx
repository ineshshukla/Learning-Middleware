"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, FileText, Loader2, ChevronRight, Target, Upload, X } from "lucide-react";
import type { Module, ModuleInput } from "@/lib/instructor-api";
import { addModule, updateModule, deleteModule, uploadModuleFiles } from "@/lib/instructor-api";

interface ModuleManagementProps {
  courseid: string;
  modules: Module[];
  onModulesChange: () => void;
}

interface ModuleFormData {
  title: string;
  description: string;
}

export function ModuleManagement({ courseid, modules, onModulesChange }: ModuleManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>({ title: "", description: "" });
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const resetForm = () => {
    setFormData({ title: "", description: "" });
    setError("");
    setSelectedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async (moduleid: string) => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadingFiles(true);
      setError("");
      await uploadModuleFiles(moduleid, selectedFiles);
      setSelectedFiles([]);
      onModulesChange();
    } catch (err: any) {
      setError(err.message || "Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleAddModule = async () => {
    if (!formData.title.trim()) {
      setError("Module title is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const moduleData: ModuleInput = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      };

      await addModule(courseid, moduleData);
      resetForm();
      setAddDialogOpen(false);
      onModulesChange();
    } catch (err: any) {
      setError(err.message || "Failed to add module");
    } finally {
      setLoading(false);
    }
  };

  const handleEditModule = async (moduleid: string) => {
    if (!formData.title.trim()) {
      setError("Module title is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const moduleData: Partial<ModuleInput> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      };

      await updateModule(moduleid, moduleData);
      resetForm();
      setEditDialogOpen(null);
      onModulesChange();
    } catch (err: any) {
      setError(err.message || "Failed to update module");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleid: string, moduleTitle: string) => {
    try {
      setLoading(true);
      await deleteModule(moduleid);
      onModulesChange();
    } catch (err: any) {
      console.error("Failed to delete module:", err);
      // You might want to show an error toast here
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (module: Module) => {
    setFormData({
      title: module.title,
      description: module.description || "",
    });
    setEditDialogOpen(module.moduleid);
    setError("");
  };

  return (
    <div className="space-y-4">
      {/* Add Module Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Modules</h3>
        <Dialog open={addDialogOpen} onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
              <DialogDescription>
                Create a new module for your course. You can add learning objectives later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-title">Title *</Label>
                <Input
                  id="add-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter module title"
                />
              </div>
              <div>
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter module description (optional)"
                  rows={3}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddModule} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No modules added yet</p>
          <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
            Add Your First Module
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => (
            <Card key={module.moduleid} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Module {index + 1}</Badge>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                    </div>
                    {module.description && (
                      <CardDescription>{module.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => router.push(`/instructor/courses/${courseid}/objectives?module=${module.moduleid}`)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      View LOs
                    </Button>
                    <Dialog open={editDialogOpen === module.moduleid} onOpenChange={(open) => {
                      if (open) {
                        openEditDialog(module);
                      } else {
                        setEditDialogOpen(null);
                        resetForm();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Module</DialogTitle>
                          <DialogDescription>
                            Update the module information and upload files.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-title">Title *</Label>
                            <Input
                              id="edit-title"
                              value={formData.title}
                              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Enter module title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Enter module description (optional)"
                              rows={3}
                            />
                          </div>
                          
                          {/* File Upload Section */}
                          <div>
                            <Label htmlFor="module-files">Upload Files (PDF, TXT, MD)</Label>
                            <Input
                              id="module-files"
                              type="file"
                              multiple
                              accept=".pdf,.txt,.md"
                              onChange={handleFileChange}
                              className="cursor-pointer"
                            />
                            {selectedFiles.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <p className="text-sm text-gray-600">{selectedFiles.length} file(s) selected:</p>
                                {selectedFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span className="text-sm truncate flex-1">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFile(idx)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUploadFiles(module.moduleid)}
                                  disabled={uploadingFiles}
                                  className="w-full"
                                >
                                  {uploadingFiles ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Files
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {error && (
                            <div className="text-sm text-red-600">{error}</div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditDialogOpen(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleEditModule(module.moduleid)} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Update Module
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Module</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{module.title}"? This action cannot be undone and will also delete all learning objectives associated with this module.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteModule(module.moduleid, module.title)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Module
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {module.content_path && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>Content file attached</span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}