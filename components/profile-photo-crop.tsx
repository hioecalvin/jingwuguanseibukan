import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const outputSize = 512;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ProfilePhotoCrop({
  file, onSave, onCancel, onBusyChange,
}: {
  file: File;
  onSave: (cropped: Blob) => Promise<void>;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const source = new Image();
    source.onload = () => setImage(source);
    source.onerror = () => setError("This image could not be opened. Choose another photo.");
    source.src = url;
    return () => {
      source.onload = source.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const width = image?.naturalWidth || 1;
  const height = image?.naturalHeight || 1;
  const side = Math.min(width, height) / zoom;
  const left = clamp(center.x * width - side / 2, 0, width - side);
  const top = clamp(center.y * height - side / 2, 0, height - side);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, left, top, side, side, 0, 0, outputSize, outputSize);
  }, [image, left, top, side]);

  function move(dx: number, dy: number) {
    setCenter(current => ({
      x: (clamp(clamp(current.x * width - side / 2, 0, width - side) - dx * side, 0, width - side) + side / 2) / width,
      y: (clamp(clamp(current.y * height - side / 2, 0, height - side) - dy * side, 0, height - side) + side / 2) / height,
    }));
  }

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (busy || !image || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function dragPhoto(event: PointerEvent<HTMLCanvasElement>) {
    const previous = drag.current;
    if (busy || !previous || previous.id !== event.pointerId) return;
    const size = event.currentTarget.getBoundingClientRect().width;
    move((event.clientX - previous.x) / size, (event.clientY - previous.y) / size);
    drag.current = { id: previous.id, x: event.clientX, y: event.clientY };
  }

  function keyMove(event: KeyboardEvent<HTMLCanvasElement>) {
    if (busy || !image) return;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    move(...offset);
  }

  async function save() {
    const preview = canvas.current;
    if (!image || !preview || saving.current) return;
    saving.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const cropped = await new Promise<Blob | null>(resolve => preview.toBlob(resolve, "image/png"));
      if (!cropped) throw new Error("Could not prepare this photo.");
      await onSave(cropped);
    } catch {
      setError("Your photo could not be saved. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="mt-4 w-full max-w-xs space-y-3">
      <p id="photo-position-help" className="text-sm text-neutral-300">Drag to position your photo, or use the arrow keys.</p>
      <canvas ref={canvas} width={outputSize} height={outputSize}
        role="img" aria-label="Photo crop preview" aria-describedby="photo-position-help" tabIndex={0}
        onPointerDown={startDrag} onPointerMove={dragPhoto} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={keyMove}
        className="block aspect-square w-full max-w-56 touch-none cursor-grab rounded-full bg-neutral-800 outline-offset-2 focus-visible:outline-2 focus-visible:outline-sky-400 active:cursor-grabbing" />
      <label className="block text-sm">Zoom <span className="float-right tabular-nums">{Math.round(zoom * 100)}%</span>
        <input type="range" aria-label="Zoom" min="1" max="4" step="0.05" value={zoom} disabled={busy || !image}
          onChange={event => setZoom(Number(event.target.value))} className="block h-9 w-full accent-sky-400" />
      </label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy || !image}
          className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
          {busy ? "Uploading..." : "Save Picture"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}
