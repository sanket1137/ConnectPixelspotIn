import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, ImageIcon, Video, AlertCircle } from "lucide-react";

interface Props {
  creativeUrl: string;
  onChange: (url: string) => void;
  error?: string;
}

export default function Step6_UploadCreative({ creativeUrl, onChange, error }: Props) {
  const isImage = creativeUrl && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(creativeUrl);
  const isVideo = creativeUrl && /\.(mp4|webm|mov)(\?.*)?$/i.test(creativeUrl);
  const hasUrl = creativeUrl.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Upload your creative</h2>
        <p className="text-sm text-muted-foreground">
          Host your creative (image or video) and paste the link here
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="creative-url" className="flex items-center gap-1.5 text-sm font-medium">
          <Link2 className="h-4 w-4 text-amber-500" />
          Creative URL
        </Label>
        <Input
          id="creative-url"
          type="url"
          placeholder="https://example.com/your-ad-creative.jpg"
          value={creativeUrl}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 text-base ${error ? "border-destructive" : ""}`}
          data-testid="input-creative-url"
        />
        {error && (
          <div className="flex items-center gap-1.5 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* Preview */}
      {hasUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Preview</p>
          <div className="rounded-xl overflow-hidden border bg-muted/30 flex items-center justify-center min-h-48">
            {isImage && (
              <img
                src={creativeUrl}
                alt="Creative preview"
                className="max-h-64 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            {isVideo && (
              <video
                src={creativeUrl}
                controls
                className="max-h-64 w-full"
                onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
              />
            )}
            {!isImage && !isVideo && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Link2 className="h-8 w-8" />
                <p className="text-sm">Link detected — preview not available for this format</p>
                <a
                  href={creativeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 underline truncate max-w-xs"
                >
                  {creativeUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accepted formats */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium">Accepted formats</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4 text-sky-500" />
            Images: JPG, PNG, WebP, GIF
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4 text-purple-500" />
            Videos: MP4, WebM, MOV
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your file to Google Drive, Dropbox, or any CDN and paste the direct link above.
        </p>
      </div>
    </div>
  );
}
