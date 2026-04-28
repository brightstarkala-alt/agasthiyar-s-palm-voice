import { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import agasthiyar from "@/assets/agasthiyar.jpg";

interface PdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: string;
}

export const PdfDialog = ({ open, onOpenChange, transcript }: PdfDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!name.trim()) {
      toast({
        title: "பெயர் தேவை",
        description: "தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்.",
        variant: "destructive",
      });
      return;
    }
    if (!transcript.trim()) {
      toast({
        title: "உரை இல்லை",
        description: "PDF உருவாக்க உரை தேவை.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Wait one tick so the offscreen render mounts
      await new Promise((r) => setTimeout(r, 50));
      const node = printRef.current!;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#f5ecd6",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `agasthiyar-olai-${name.trim().replace(/\s+/g, "-")}.pdf`;
      pdf.save(filename);

      toast({
        title: "வெற்றி!",
        description: "PDF பதிவிறக்கம் செய்யப்பட்டது.",
      });
      onOpenChange(false);
      setName("");
      setDescription("");
    } catch (err) {
      console.error(err);
      toast({
        title: "PDF பிழை",
        description: "PDF உருவாக்குவதில் பிழை ஏற்பட்டது.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="palm-card border-palm-gold/40 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-tamil text-2xl text-palm-dark">
              PDF விவரங்கள்
            </DialogTitle>
            <DialogDescription className="font-tamil text-muted-foreground">
              உங்கள் ஓலை ஆவணத்தின் தலைப்பு விவரங்களை உள்ளிடவும்.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-tamil text-palm-dark">
                பெயர் <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="உங்கள் பெயர்"
                className="border-palm-gold/40 bg-background/60 font-tamil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="font-tamil text-palm-dark">
                விளக்கம் (விருப்பம்)
              </Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="விளக்கம்..."
                rows={3}
                className="border-palm-gold/40 bg-background/60 font-tamil"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
              className="font-tamil"
            >
              ரத்து
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-gold font-tamil text-primary-foreground hover:opacity-90"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  உருவாக்குகிறது...
                </>
              ) : (
                "PDF பதிவிறக்கு"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offscreen render target for Tamil PDF (uses browser fonts so Tamil renders correctly) */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px", // ~A4 at 96dpi
        }}
        aria-hidden
      >
        <div
          ref={printRef}
          style={{
            width: "794px",
            padding: "48px",
            background: "#f5ecd6",
            color: "#2a1a08",
            fontFamily: "'Hind Madurai', 'Catamaran', sans-serif",
          }}
        >
          {/* Top section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              borderBottom: "3px double #8a5a1a",
              paddingBottom: "20px",
              marginBottom: "24px",
            }}
          >
            <img
              src={agasthiyar}
              alt=""
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                border: "3px solid #b8841a",
                objectFit: "cover",
              }}
              crossOrigin="anonymous"
            />
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "26px",
                  color: "#5a3a1a",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Agasthiyar Olai Voice Transcription
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: "16px", color: "#7a5a2a" }}>
                அகத்தியர் ஓலை குரல் ஆவணம்
              </p>
            </div>
          </div>

          <div style={{ marginBottom: "20px", fontSize: "15px" }}>
            <p style={{ margin: "4px 0" }}>
              <strong style={{ color: "#5a3a1a" }}>பெயர் / Name:</strong>{" "}
              <span style={{ color: "#2a1a08" }}>{name || "—"}</span>
            </p>
            {description.trim() && (
              <p style={{ margin: "4px 0" }}>
                <strong style={{ color: "#5a3a1a" }}>விளக்கம் / Description:</strong>{" "}
                <span style={{ color: "#2a1a08" }}>{description}</span>
              </p>
            )}
            <p style={{ margin: "4px 0", color: "#7a5a2a", fontSize: "13px" }}>
              <strong style={{ color: "#5a3a1a" }}>தேதி / Date:</strong>{" "}
              {new Date().toLocaleDateString("ta-IN")}
            </p>
          </div>

          {/* Body */}
          <div
            style={{
              background: "#ede0bf",
              border: "1px solid #b8841a",
              borderRadius: "8px",
              padding: "28px",
              fontSize: "17px",
              lineHeight: 1.9,
              color: "#1a0f04",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {transcript}
          </div>

          <div
            style={{
              marginTop: "32px",
              textAlign: "center",
              fontSize: "12px",
              color: "#7a5a2a",
              borderTop: "1px solid #b8841a",
              paddingTop: "12px",
            }}
          >
            Generated by Agasthiyar Olai Voice • அகத்தியர் வாக்கு
          </div>
        </div>
      </div>
    </>
  );
};
