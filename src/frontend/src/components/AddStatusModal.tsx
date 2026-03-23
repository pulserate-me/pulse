import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { useAddStatus } from "../hooks/useQueries";

interface AddStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddStatusModal({
  open,
  onOpenChange,
}: AddStatusModalProps) {
  const [tab, setTab] = useState("image");
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: addStatus, isPending } = useAddStatus();
  const { uploadMedia, isUploading } = useMediaUpload();

  const isBusy = isPending || isUploading;

  const accept = {
    image: "image/*",
    video: "video/*",
  } as Record<string, string>;

  const reset = () => {
    setCaption("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    try {
      if (!pendingFile) {
        toast.error("Please select a file");
        return;
      }
      const result = await uploadMedia(pendingFile);
      await addStatus({
        text: caption.trim(),
        mediaUrl: result.url,
        mediaType: result.mediaType,
      });
      toast.success("Story posted!");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to post story");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isBusy) {
          reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent
        data-ocid="status.dialog"
        className="bg-card border-border max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Add Story
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setPendingFile(null);
            setCaption("");
          }}
        >
          <TabsList className="w-full bg-muted" data-ocid="status.tab">
            <TabsTrigger
              value="image"
              className="flex-1"
              data-ocid="status.image_tab"
            >
              Image
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="flex-1"
              data-ocid="status.video_tab"
            >
              Video
            </TabsTrigger>
          </TabsList>

          {(["image", "video"] as const).map((type) => (
            <TabsContent
              key={type}
              value={type}
              className="mt-4 flex flex-col gap-3"
            >
              <input
                ref={tab === type ? fileInputRef : undefined}
                type="file"
                accept={accept[type]}
                className="hidden"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              <Button
                data-ocid="status.upload_button"
                variant="outline"
                className="h-24 border-dashed border-border flex flex-col gap-2 hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {pendingFile ? pendingFile.name : `Select ${type}`}
                </span>
              </Button>
              <Textarea
                data-ocid="status.textarea"
                placeholder="Add a caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-input border-border resize-none h-16"
                maxLength={200}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            data-ocid="status.cancel_button"
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            data-ocid="status.submit_button"
            onClick={handlePost}
            disabled={isBusy}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
            }}
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Story"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
