"use client";

import { useState } from "react";
import { Brain, Upload, Camera, FileText, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AIDigitizer() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [manualText, setManualText] = useState("");
  const [convertedAssignment, setConvertedAssignment] = useState("");
  const [converting, setConverting] = useState(false);
  const [mode, setMode] = useState<"photo" | "text">("photo");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!imagePreview) return;
    setProcessing(true);

    try {
      // Step 1: Use GPT-4o vision to extract text from the image
      const visionRes = await fetch("/api/ai-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imagePreview,
          prompt: "Extract all text from this image of a handwritten or printed homework/exam. Return the raw extracted text faithfully, preserving numbering and structure. Do not add any commentary.",
        }),
      });

      let ocrText = "";
      if (visionRes.ok) {
        const visionData = await visionRes.json();
        ocrText = visionData.content || "";
      }

      if (!ocrText) {
        toast.error("Could not extract text from image. Check your API key.");
        setProcessing(false);
        return;
      }

      setExtractedText(ocrText);

      // Step 2: Convert extracted text to formatted assignment
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Convert the following handwritten/printed homework into a well-formatted digital assignment with clear instructions, point values, and formatting:\n\n${ocrText}` }],
          system: "You are a teacher's assistant that converts raw homework text into professional, well-formatted digital assignments. Add clear instructions, point values for each question, and organize the content professionally. Use markdown formatting.",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConvertedAssignment(data.content);
        toast.success("Homework digitized successfully!");
      } else {
        // Fallback: just display the extracted text cleanly
        setConvertedAssignment(ocrText);
        toast.success("Text extracted! AI formatting unavailable.");
      }
    } catch {
      toast.error("Could not connect to AI service");
    }
    setProcessing(false);
  };

  const convertText = async () => {
    if (!manualText.trim()) {
      toast.error("Please enter or paste homework text");
      return;
    }
    setConverting(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Convert the following homework text into a well-formatted digital assignment with clear instructions, point values, and professional formatting:\n\n${manualText}` }],
          system: "You are a teacher's assistant that converts raw homework text into professional, well-formatted digital assignments. Add clear instructions, point values for each question, and organize the content professionally.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConvertedAssignment(data.content);
        toast.success("Homework converted successfully!");
      } else {
        toast.error("AI conversion failed. Check your API key.");
      }
    } catch {
      toast.error("Could not connect to AI service");
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(convertedAssignment);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Brain className="h-6 w-6 text-[#1e3a5f]" />
          </div>
          AI Homework Digitizer
        </h1>
        <p className="mt-1 text-gray-500">Upload a photo or paste text to convert homework into digital format</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode("photo")}
          className={`flex items-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-all ${
            mode === "photo" ? "border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Camera className="h-4 w-4" /> Photo Upload
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-all ${
            mode === "text" ? "border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <FileText className="h-4 w-4" /> Paste Text
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              {mode === "photo" ? "Upload Homework Photo" : "Paste Homework Text"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "photo" ? (
              <div className="space-y-4">
                <label className="block">
                  <div className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                    imagePreview ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Uploaded homework" className="mx-auto max-h-64 rounded-lg object-contain" />
                    ) : (
                      <>
                        <Upload className="mx-auto h-10 w-10 text-gray-400" />
                        <p className="mt-3 text-sm font-medium text-gray-700">Click to upload a photo</p>
                        <p className="mt-1 text-xs text-gray-400">JPG, PNG, or PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*,.pdf" onChange={handleImageUpload} className="hidden" />
                </label>
                {imagePreview && (
                  <Button
                    onClick={processImage}
                    disabled={processing}
                    className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl"
                  >
                    {processing ? (
                      <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Brain className="mr-2 h-4 w-4" /> Digitize Homework</>
                    )}
                  </Button>
                )}
                {extractedText && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-400 mb-2">EXTRACTED TEXT</p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{extractedText}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste or type the homework content here...&#10;&#10;Example:&#10;1. Solve for x: 2x + 5 = 13&#10;2. Factor: x^2 - 9&#10;3. Find the slope of y = 3x + 2"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={12}
                  className="rounded-xl border-gray-200"
                />
                <Button
                  onClick={convertText}
                  disabled={converting}
                  className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl"
                >
                  {converting ? (
                    <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Converting...</>
                  ) : (
                    <><Brain className="mr-2 h-4 w-4" /> Convert to Assignment</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#1e3a5f]" />
              Digitized Assignment
            </CardTitle>
            {convertedAssignment && (
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-lg">
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {convertedAssignment ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1e3a5f] shrink-0" />
                  <p className="text-sm text-[#1e3a5f]">Assignment digitized and ready to distribute</p>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 p-5 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{convertedAssignment}</pre>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
                    Create Assignment
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    Edit First
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-500">No assignment generated yet</p>
                <p className="mt-1 text-xs text-gray-400">Upload a photo or paste text to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
