import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const COURIERS = [
  ["JNE", "JNE"],
  ["JNT", "J&T"],
  ["SCP", "SiCepat"],
  ["ANT", "AnterAja"],
  ["NIN", "Ninja Xpress"],
  ["POS", "Pos Indonesia"],
  ["TIKI", "TIKI"],
  ["LION", "Lion Parcel"],
  ["ID", "ID Express"],
  ["SAP", "SAP Express"]
];

const STATUS = {
  CREATED: "Resi dibuat",
  PROCESSING: "Barang diproses",
  IN_TRANSIT: "Barang dalam perjalanan",
  OUT_FOR_DELIVERY: "Sedang dikirim ke pembeli",
  DELIVERED: "Barang tiba"
};

const ACTIVE_SHIPMENT_KEY = "shipsandbox.activeShipmentId";

const nextStatus = (s) => ({
  CREATED: "PROCESSING",
  PROCESSING: "IN_TRANSIT",
  IN_TRANSIT: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED"
}[s]);

const getShipmentId = (s) => s?.id || s?._id;

function App() {
  const [shipments, setShipments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    courier: "JNE", senderName: "John Doe", origin: "Jakarta",
    recipientName: "Jane Doe", destination: "Surabaya",
    description: "Electronics", weight: 1
  });
  const [webhook, setWebhook] = useState({ url: "", secret: "" });
  const [webhookPassword, setWebhookPassword] = useState("");
  const [showWebhookPassword, setShowWebhookPassword] = useState(false);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const loadSeqRef = useRef(0);

  const persistSelected = (shipment) => {
    setSelected(shipment);
    const sid = getShipmentId(shipment);
    if (sid) localStorage.setItem(ACTIVE_SHIPMENT_KEY, String(sid));
    return sid;
  };

  const load = async (preferredId) => {
    const seq = ++loadSeqRef.current;
    const r = await fetch("/api/v1/shipments");
    if (!r.ok) return;
    if (seq !== loadSeqRef.current) return;
    const j = await r.json();
    const data = j.data || [];
    setShipments(data);
    const storedId = localStorage.getItem(ACTIVE_SHIPMENT_KEY);
    const currentId = preferredId || storedId;
    if (!currentId) return;
    const fresh = data.find(x => String(getShipmentId(x)) === String(currentId));
    if (fresh) {
      setSelected(fresh);
      localStorage.setItem(ACTIVE_SHIPMENT_KEY, String(getShipmentId(fresh)));
    } else if (storedId) {
      localStorage.removeItem(ACTIVE_SHIPMENT_KEY);
      setSelected(null);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/v1/webhook").then(r => r.json()).then(j => {
      if (j.success) setWebhook(prev => ({...prev, url: j.data.url || ""}));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!auto || !selected || selected.status === "DELIVERED") return;
    const id = setInterval(() => advance(selected.trackingNumber), 30000);
    return () => clearInterval(id);
  }, [auto, selected?.trackingNumber, selected?.status]);

  const createShipment = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage("");
    const r = await fetch("/api/v1/shipments", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({...form, weight: Number(form.weight)})
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMessage(j.error || "Failed to create shipment");
    const id = persistSelected(j.data);
    setMessage("Shipment created. Active shipment saved in this browser.");
    load(id);
  };

  const advance = async (trackingNumber) => {
    const r = await fetch(`/api/v1/shipments/${trackingNumber}/advance`, {method:"POST"});
    const j = await r.json();
    if (r.ok) { const id = persistSelected(j.data); load(id); }
    else setMessage(j.error || "Unable to advance shipment");
  };

  const saveWebhook = async () => {
    if (!webhookPassword) { setShowWebhookPassword(true); return; }
    const r = await fetch("/api/v1/webhook", {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({url:webhook.url, secret:webhook.secret, password:webhookPassword})
    });
    const j = await r.json();
    if (!r.ok) { setMessage(j.error || "Webhook save failed"); if (r.status === 401) setWebhookPassword(""); return; }
    setWebhookPassword(""); setShowWebhookPassword(false); setMessage("Global webhook configuration saved.");
  };

  const endpoint = useMemo(() => selected ? `${location.origin}/api/v1/shipments/${selected.trackingNumber}` : "", [selected]);

  return <div className="app">
    <header>
      <div className="brand"><span className="logo">S</span><div><b>ShipSandbox</b><small>Shipping API playground</small></div></div>
      <a href="#api">API Docs</a>
    </header>

    <main>
      <section className="hero">
        <div><span className="eyebrow">DEVELOPER SANDBOX</span><h1>Fake shipments.<br/><em>Real integration tests.</em></h1>
        <p>Generate safe dummy tracking numbers, move shipments through realistic states, and test your tracking API or webhooks.</p></div>
        <div className="hero-card"><div className="pulse"></div><b>Public API</b><span>No login · No API key</span><code>GET /api/v1/shipments/:resi</code></div>
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panel-title"><div><span className="kicker">01 / GENERATE</span><h2>Create shipment</h2></div></div>
          <form onSubmit={createShipment}>
            <label>Courier<select value={form.courier} onChange={e=>setForm({...form,courier:e.target.value})}>{COURIERS.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label>
            <div className="two"><label>Sender<input value={form.senderName} onChange={e=>setForm({...form,senderName:e.target.value})}/></label><label>Origin<input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}/></label></div>
            <div className="two"><label>Recipient<input value={form.recipientName} onChange={e=>setForm({...form,recipientName:e.target.value})}/></label><label>Destination<input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></label></div>
            <div className="two"><label>Package<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Weight (kg)<input type="number" step="0.1" min="0.1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/></label></div>
            <button disabled={busy} className="primary">{busy ? "Generating..." : "Generate sandbox shipment →"}</button>
          </form>
          {message && <div className="notice">{message}</div>}
        </section>

        <section className="panel">
          <div className="panel-title"><div><span className="kicker">02 / CONTROL</span><h2>Shipment simulator</h2></div><button className="ghost" onClick={()=>load()}>↻ Refresh</button></div>
          {!selected ? <div className="empty">Create a shipment to start the simulator.</div> : <div>
            <div className="tracking"><div><span>{selected.courier}</span><code>{selected.trackingNumber}</code></div><button className="copy" onClick={()=>navigator.clipboard.writeText(endpoint)}>Copy API</button></div>
            <div className="endpoint"><span>GET</span><code>{endpoint}</code></div>
            <div className="timeline">{Object.keys(STATUS).map((s,i)=><div className={`step ${selected.status === s ? "current":""} ${selected.statusHistory?.some(h=>h.status===s) ? "done":""}`} key={s}><div className="dot">{selected.statusHistory?.some(h=>h.status===s) ? "✓" : i+1}</div><div><b>{STATUS[s]}</b><small>{selected.statusHistory?.find(h=>h.status===s)?.description || "Waiting"}</small></div></div>)}</div>
            <div className="sim-control"><div><b>Simulation mode</b><small>{selected.status === "DELIVERED" ? "Shipment completed" : auto ? "Automatic · every 30 seconds" : "Manual progression"}</small></div><label className="switch"><input type="checkbox" checked={auto} disabled={selected.status==="DELIVERED"} onChange={e=>setAuto(e.target.checked)}/><span></span></label></div>
            <button className="advance" disabled={selected.status==="DELIVERED"} onClick={()=>advance(selected.trackingNumber)}>{selected.status==="DELIVERED" ? "✓ Shipment delivered" : "Advance status →"}</button>
          </div>}
        </section>
      </div>

      <section className="panel webhook">
        <div className="panel-title"><div><span className="kicker">03 / WEBHOOK</span><h2>One webhook for every shipment</h2></div><span className="global-badge">GLOBAL</span></div>
        <p className="webhook-copy">Configure one endpoint for the entire sandbox. Every shipment status transition will be POSTed to this URL.</p>
        <div className="two">
          <label>Webhook URL<input placeholder="https://your-app.com/api/webhook" value={webhook.url} onChange={e=>setWebhook({...webhook,url:e.target.value})}/></label>
          <label>Webhook secret<input type="password" placeholder="Secret sent to your endpoint" value={webhook.secret} onChange={e=>setWebhook({...webhook,secret:e.target.value})}/></label>
        </div>
        <button className="primary small" onClick={saveWebhook}>Save global webhook</button>
        <p className="hint">Saving requires the dashboard password configured as <code>WEBHOOK_EDIT_PASSWORD</code>. The password is never stored in MongoDB.</p>
        {showWebhookPassword && <div className="password-modal-backdrop" onClick={()=>setShowWebhookPassword(false)}>
          <div className="password-modal" onClick={e=>e.stopPropagation()}>
            <span className="kicker">PROTECTED ACTION</span><h3>Edit global webhook</h3>
            <p>Enter the webhook edit password to apply this configuration to all shipments.</p>
            <input autoFocus type="password" placeholder="Webhook edit password" value={webhookPassword} onChange={e=>setWebhookPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") saveWebhook()}}/>
            <div className="modal-actions"><button className="ghost" onClick={()=>setShowWebhookPassword(false)}>Cancel</button><button className="primary modal-save" onClick={saveWebhook}>Unlock & save</button></div>
          </div>
        </div>}
      </section>

      <section id="api" className="docs"><span className="kicker">04 / API</span><h2>Simple by design.</h2><div className="codebox"><div><span>GET</span> /api/v1/shipments/:trackingNumber</div><pre>{`{
  "success": true,
  "data": {
    "trackingNumber": "JNE-SBX-8F92K1",
    "courier": "JNE",
    "status": "IN_TRANSIT",
    "origin": "Jakarta",
    "destination": "Surabaya",
    "history": [...]
  }
}`}</pre></div></section>
    </main>
    <footer>ShipSandbox · Built for developers · Sandbox numbers are not real shipments.</footer>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);