import { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { AuthState, ShellInfo, UploadProgress, UploadResult, VideoSelection } from "../contracts";
import "./app.css";

const initialProgress: UploadProgress = { phase: "validating", percent: 0, message: "" };
const sizeLabel = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function App() {
  const [info, setInfo] = useState<ShellInfo | null>(null);
  const [auth, setAuth] = useState<AuthState>({ user: null, message: "Starting…" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [video, setVideo] = useState<VideoSelection>(null);
  const [progress, setProgress] = useState<UploadProgress>(initialProgress);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [classId, setClassId] = useState("");
  const [rankId, setRankId] = useState("");
  const [tierId, setTierId] = useState("");
  const operation = useRef(0);
  const selectedClass = auth.user?.classes.find(item => item.id === classId) ?? auth.user?.classes[0];
  const selectedRank = selectedClass?.ranks.find(item => item.id === rankId) ?? selectedClass?.ranks[0];
  const selectedTier = selectedRank?.tiers.find(item => item.id === tierId) ?? selectedRank?.tiers[0];

  useEffect(() => window.jsUploader.onUploadProgress(setProgress), []);
  useEffect(() => {
    window.jsUploader.getShellInfo().then(value => {
      setInfo(value);
      setAuth({ user: null, message: value.configured ? "Sign in with your JS account." : "This installer is not configured for sign-in." });
    }).catch(() => setAuth({ user: null, message: "Desktop connection unavailable. Restart the app." }));
  }, []);
  useEffect(() => {
    if (!auth.user) return;
    const firstClass = auth.user.classes[0];
    const firstRank = firstClass?.ranks[0];
    setClassId(firstClass?.id ?? ""); setRankId(firstRank?.id ?? ""); setTierId(firstRank?.tiers[0]?.id ?? "");
  }, [auth.user]);
  useEffect(() => {
    const rank = selectedClass?.ranks[0];
    if (selectedClass && !selectedClass.ranks.some(item => item.id === rankId)) { setRankId(rank?.id ?? ""); setTierId(rank?.tiers[0]?.id ?? ""); }
  }, [selectedClass, rankId]);
  useEffect(() => {
    if (selectedRank && !selectedRank.tiers.some(item => item.id === tierId)) setTierId(selectedRank.tiers[0]?.id ?? "");
  }, [selectedRank, tierId]);
  useEffect(() => {
    if (!auth.user || busy || uploading) return;
    const refresh = async () => {
      const current = operation.current;
      setBusy(true);
      try { const state = await window.jsUploader.refreshAccess(); if (current === operation.current) setAuth(state); }
      catch { if (current === operation.current) setAuth({ user: null, message: "Access could not be verified. Sign in again." }); }
      finally { if (current === operation.current) setBusy(false); }
    };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [auth.user, busy, uploading]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const current = ++operation.current;
    event.currentTarget.reset(); setBusy(true); setAuth({ user: null, message: "Signing in…" });
    try { const next = await window.jsUploader.signIn(String(data.get("email")), String(data.get("password"))); if (current === operation.current) setAuth(next); }
    catch { setAuth({ user: null, message: "Sign-in unavailable. Restart the app and try again." }); }
    finally { setBusy(false); }
  }
  async function signOut() {
    ++operation.current; setBusy(true); setAuth({ user: null, message: "Signing out…" }); setVideo(null); setResult(null);
    try { setAuth(await window.jsUploader.signOut()); }
    catch { setAuth({ user: null, message: "Close the app to finish signing out." }); }
    finally { setBusy(false); }
  }
  async function chooseVideo() { setResult(null); setVideo(await window.jsUploader.selectVideo()); }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!video || !selectedClass || !selectedRank || !selectedTier) return;
    const form = new FormData(event.currentTarget); setUploading(true); setResult(null); setProgress({ phase: "validating", percent: 0, message: "Starting…" });
    try {
      setResult(await window.jsUploader.uploadVideo({
        videoPath: video.path, classId: selectedClass.id, rankId: selectedRank.id, tierId: selectedTier.id,
        title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), section: String(form.get("section") ?? ""),
        sortOrder: Number(form.get("sortOrder") ?? 1),
      }));
    } catch { setResult({ ok: false, message: "The uploader stopped unexpectedly. Restart it and try again." }); }
    finally { setUploading(false); }
  }

  return <div className="shell">
    <header><div className="wordmark">JINGWUGUAN SEIBUKAN</div><span className="badge">{info?.environment ?? "WINDOWS"} · UPLOADER</span></header>
    <main>
      <p className="eyebrow">LOCAL VIDEO WORKSPACE</p><h1>JS Video Uploader</h1>
      <p className="intro">Process both logo watermarks on this computer, upload directly to Mux, then save a repository Draft.</p>
      {!auth.user ? <section className="card welcome" aria-labelledby="welcome-title"><div className="mark" aria-hidden="true">JS</div><div className="account">
        <h2 id="welcome-title">Repository Uploader sign-in</h2><form onSubmit={signIn}>
          <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" maxLength={320} required disabled={busy || !info?.configured} />
          <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="off" maxLength={4096} required disabled={busy || !info?.configured} />
          <button type="submit" disabled={busy || !info?.configured}>{busy ? "Please wait…" : "Sign in to JS Super App"}</button>
          <p className="hint">Use an actively appointed Repository Uploader or Super Admin account.</p>
        </form><p className="message" role="status" aria-live="polite">{auth.message}</p>
      </div></section> : <>
        <section className="account-bar"><div><strong>{auth.user.name}</strong><span>{auth.user.role} · {auth.user.classes.length} class{auth.user.classes.length === 1 ? "" : "es"}</span></div><button type="button" onClick={signOut} disabled={busy || uploading}>Sign out</button></section>
        <form className="card upload-form" onSubmit={upload}>
          <div className="grid three"><label>Class<select value={selectedClass?.id ?? ""} onChange={event => setClassId(event.target.value)} disabled={uploading}>{auth.user.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Official Rank<select value={selectedRank?.id ?? ""} onChange={event => setRankId(event.target.value)} disabled={uploading}>{selectedClass?.ranks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Repository Tier<select value={selectedTier?.id ?? ""} onChange={event => setTierId(event.target.value)} disabled={uploading}>{selectedRank?.tiers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <div className="file-row"><div><strong>{video?.name ?? "No video selected"}</strong><span>{video ? sizeLabel(video.size) : "MP4, MOV, M4V, AVI, MKV or WebM"}</span></div><button type="button" onClick={chooseVideo} disabled={uploading}>Select Video</button></div>
          <label>Title<input name="title" maxLength={100} required disabled={uploading} placeholder="Example: Tai no Henko" /></label>
          <div className="grid two"><label>Optional Section<input name="section" maxLength={120} disabled={uploading} placeholder="Example: Standing practice" /></label><label>Sort Order<input name="sortOrder" type="number" min={0} max={1000000} defaultValue={1} required disabled={uploading} /></label></div>
          <label>Description<textarea name="description" maxLength={4800} rows={4} disabled={uploading} placeholder="Training notes or explanation" /></label>
          <p className="provider-note">Provider: Mux with signed, Member-authorized adaptive playback.</p>
          <p className="watermark-note">Watermarks: current JS organization logo at top-left and current {selectedClass?.name ?? "class"} logo at top-right. The logos are downloaded when processing begins.</p>
          {uploading && <div className="progress"><div><span>{progress.message}</span><strong>{progress.percent}%</strong></div><progress max={100} value={progress.percent} /><button type="button" className="danger" onClick={() => window.jsUploader.cancelUpload()}>Cancel upload</button></div>}
          {result && <div className={`notice ${result.ok ? "success" : "error"}`} role="status"><strong>{result.ok ? "Complete" : "Not completed"}</strong> {result.message}{result.muxAssetId && <span className="video-id">Mux Asset ID: {result.muxAssetId}</span>}</div>}
          <button className="primary" type="submit" disabled={uploading || !video || !selectedClass || !selectedRank || !selectedTier}>{uploading ? "Processing and uploading…" : "Process, Upload and Save Draft"}</button>
        </form>
      </>}
    </main>
    <footer><span>JS sessions remain memory-only; Mux secrets stay on the server.</span><span>{info ? `v${info.version} · Stage ${info.stage}` : "Starting…"}</span></footer>
  </div>;
}
createRoot(document.getElementById("root")!).render(<App />);
