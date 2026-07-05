import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

/**
 * QRScanner
 * - Camera scan (html5-qrcode) with a manual-entry fallback.
 * - Calls onSubmit(code) once when a code is captured or typed.
 * - Parent controls the "busy" state via `pending`.
 */
export function QRScanner({
  onSubmit,
  pending,
  placeholder = "Enter code",
  submitLabel = "Redeem",
}: {
  onSubmit: (code: string) => void;
  pending?: boolean;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = useRef(
    `qr-region-${Math.random().toString(36).slice(2, 8)}`,
  ).current;

  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    setCameraError(null);
    setScanning(true);

    const start = async () => {
      try {
        const html5 = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            const trimmed = decodedText.trim();
            if (!trimmed) return;
            // Stop before firing to avoid duplicate reads
            html5
              .stop()
              .catch(() => {})
              .finally(() => {
                onSubmit(trimmed);
              });
          },
          () => {
            // per-frame decode errors are noisy; ignore
          },
        );
      } catch (err) {
        if (cancelled) return;
        setCameraError(
          err instanceof Error
            ? err.message
            : "Camera unavailable. Use manual entry.",
        );
        setScanning(false);
      }
    };
    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              // ignore
            }
          });
      }
      setScanning(false);
    };
  }, [mode, regionId, onSubmit]);

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "camera" ? "default" : "secondary"}
          onClick={() => setMode("camera")}
        >
          <Camera className="h-4 w-4" /> Scan
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "manual" ? "default" : "secondary"}
          onClick={() => setMode("manual")}
        >
          <Keyboard className="h-4 w-4" /> Type code
        </Button>
      </div>

      {mode === "camera" && (
        <div className="space-y-2">
          <div
            id={regionId}
            className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-primary/30 bg-black"
          />
          {scanning && !cameraError && (
            <p className="text-center text-xs text-muted-foreground">
              Point camera at the QR code…
            </p>
          )}
          {cameraError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <CameraOff className="mr-1 inline h-3.5 w-3.5" />
              {cameraError}
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = manualCode.trim();
            if (!c || pending) return;
            onSubmit(c);
          }}
          className="flex gap-2"
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm tracking-wider outline-none focus:border-primary"
          />
          <Button type="submit" disabled={pending || !manualCode.trim()}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
