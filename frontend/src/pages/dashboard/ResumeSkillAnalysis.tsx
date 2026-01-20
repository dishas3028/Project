import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
} from "lucide-react";
import API_BASE from '@/lib/api';
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import auth from "@/lib/auth";
import GenerateATSScore from "@/components/GenerateATSScore";

const ResumeSkillAnalysis = () => {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const stored = auth.getUser();
      const email = stored?.user?.email;

  const res = await fetch(`${API_BASE}/api/students/upload-resume`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Student-Email': email,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');

      // Use filename from response if provided
      const fileName = data?.resumeFileName || file.name;
      setUploadedFile({ name: fileName, size: file.size });

      // notify other parts of app
      try { window.dispatchEvent(new Event('pms_resume_updated')); } catch(e){}

      toast({
        title: "Resume Uploaded",
        description: "Your resume has been saved successfully",
      });
    } catch (err: any) {
      toast({
        title: "Upload Error",
        description: err?.message || "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Check if a resume already exists for the logged in user
  const fetchExistingResume = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) return;
    try {
  const res = await fetch(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      if (!res.ok) return; // no resume
      const filename = res.headers.get('x-resume-filename') || 'Resume';
      const length = res.headers.get('content-length');
      setUploadedFile({ name: filename, size: length ? parseInt(length, 10) : 0 });
    } catch (e) {
      // ignore
    }
  };

  // remove resume
  const removeResume = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) return;
    try {
  const res = await fetch(`${API_BASE}/api/students/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resumeFileName: null, resumeData: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Remove failed');
      setUploadedFile(null);
      try { window.dispatchEvent(new Event('pms_resume_updated')); } catch(e) {}
      toast({ title: 'Removed', description: 'Resume removed' });
    } catch (err: any) {
      toast({ title: 'Remove Error', description: err?.message || 'Unable to remove', variant: 'destructive' });
    }
  };

  // attempt to fetch existing resume on mount
  useEffect(() => {
    fetchExistingResume();
    const onUpdate = () => fetchExistingResume();
    window.addEventListener('storage', onUpdate);
    window.addEventListener('pms_resume_updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('pms_resume_updated', onUpdate);
    };
  }, []);

  return (
    <DashboardLayout title="Resume & Skill Analysis">
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="text-primary" />
              Upload Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                uploadedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleInputChange}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const stored = auth.getUser();
                        const email = stored?.user?.email;
                        if (!email) return;
        window.open(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, '_blank');
                      }}
                      className="gap-2"
                    >
                      Preview
                    </Button>

                    
                      <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="gap-2"
                    >
                      Change
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeResume();
                      }}
                      className="gap-2"
                    >
                      <X size={16} /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drag & drop your resume here</p>
                    <p className="text-sm text-muted-foreground">or click to browse (PDF, DOCX)</p>
                  </div>
                  <Button variant="outline" disabled={loading}>
                    {loading ? "Uploading..." : "Select File"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {uploadedFile && (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  ✓ Resume uploaded successfully. Your resume has been saved to your profile.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <GenerateATSScore />
            </div>

            {/* Inline preview removed - no preview should be visible on this page */}
          </>
        )}
      </div>
    </DashboardLayout>
  );

};

export default ResumeSkillAnalysis;
