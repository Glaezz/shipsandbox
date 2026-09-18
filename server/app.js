import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import Shipment from "./models/Shipment.js";
import WebhookConfig from "./models/WebhookConfig.js";
import { COURIERS, generateTracking } from "./couriers.js";
import { getNextStatus, STATUS_DESCRIPTIONS } from "./status.js";
import { deliverWebhook } from "./webhook.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20kb" }));

const sanitize = s => s ? String(s).trim() : "";
const publicShipment = s => ({
  _id: s._id,
  id: s._id,
  trackingNumber: s.trackingNumber,
  courier: s.courier,
  sender: s.sender,
  recipient: s.recipient,
  package: s.package,
  status: s.status,
  statusHistory: s.statusHistory,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});

app.get("/api/health", async (_, res) => {
  try { await connectDB(); res.json({ ok: true, service: "ShipSandbox" }); }
  catch { res.status(503).json({ ok: false }); }
});

app.get("/api/v1/couriers", (_, res) => res.json({ success: true, data: Object.entries(COURIERS).map(([code, name]) => ({code,name})) }));

app.get("/api/v1/shipments", async (_, res) => {
  try {
    await connectDB();
    const docs = await Shipment.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: docs });
  } catch (e) { res.status(500).json({ success:false, error:"Database error" }); }
});

app.post("/api/v1/shipments", async (req, res) => {
  try {
    await connectDB();
    const courier = sanitize(req.body.courier).toUpperCase();
    if (!COURIERS[courier]) return res.status(400).json({success:false,error:"Unsupported courier"});
    let trackingNumber;
    do { trackingNumber = generateTracking(courier); } while (await Shipment.exists({trackingNumber}));
    const doc = await Shipment.create({
      trackingNumber, courier,
      sender: {name:sanitize(req.body.senderName), city:sanitize(req.body.origin)},
      recipient: {name:sanitize(req.body.recipientName), city:sanitize(req.body.destination)},
      package: {description:sanitize(req.body.description), weight:Number(req.body.weight)||0},
      status:"CREATED",
      statusHistory:[{status:"CREATED", timestamp:new Date(), description:STATUS_DESCRIPTIONS.CREATED}]
    });
    res.status(201).json({success:true,data:publicShipment(doc)});
  } catch (e) { res.status(500).json({success:false,error:"Unable to create shipment"}); }
});

app.get("/api/v1/shipments/:trackingNumber", async (req,res) => {
  try {
    await connectDB();
    const doc = await Shipment.findOne({trackingNumber:req.params.trackingNumber}).lean();
    if (!doc) return res.status(404).json({success:false,error:"Shipment not found"});
    res.json({success:true,data:publicShipment(doc)});
  } catch { res.status(500).json({success:false,error:"Database error"}); }
});

app.post("/api/v1/shipments/:trackingNumber/advance", async (req,res) => {
  try {
    await connectDB();
    const doc = await Shipment.findOne({trackingNumber:req.params.trackingNumber});
    if (!doc) return res.status(404).json({success:false,error:"Shipment not found"});
    const next = getNextStatus(doc.status);
    if (!next) return res.status(409).json({success:false,error:"Shipment is already delivered"});
    const previous = doc.status;
    doc.status = next;
    doc.statusHistory.push({status:next,timestamp:new Date(),description:STATUS_DESCRIPTIONS[next]});
    await doc.save();
    const config = await WebhookConfig.findOne({ key: "global" }).lean();
    const webhookResult = await deliverWebhook(config, doc, previous, next);
    res.json({success:true,data:publicShipment(doc),webhook:webhookResult});
  } catch { res.status(500).json({success:false,error:"Unable to advance shipment"}); }
});

app.get("/api/v1/webhook", async (_, res) => {
  try {
    await connectDB();
    const config = await WebhookConfig.findOne({ key: "global" }).lean();
    res.json({ success: true, data: { url: config?.url || "", configured: Boolean(config?.url) } });
  } catch {
    res.status(500).json({ success: false, error: "Database error" });
  }
});

app.put("/api/v1/webhook", async (req, res) => {
  const expected = process.env.WEBHOOK_EDIT_PASSWORD;
  if (!expected) return res.status(503).json({ success: false, error: "WEBHOOK_EDIT_PASSWORD is not configured" });
  if (!req.body?.password || req.body.password !== expected) return res.status(401).json({ success: false, error: "Invalid webhook edit password" });

  try {
    await connectDB();
    const url = sanitize(req.body.url);
    const secret = sanitize(req.body.secret);
    if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ success:false, error:"Webhook URL must use http or https" });
    if (secret.length > 256) return res.status(400).json({ success:false, error:"Webhook secret is too long" });
    const config = await WebhookConfig.findOneAndUpdate({ key:"global" }, { $set:{url,secret}, $setOnInsert:{key:"global"} }, {upsert:true,new:true});
    res.json({ success:true, data:{url:config.url, configured:Boolean(config.url)} });
  } catch {
    res.status(500).json({ success:false, error:"Unable to save webhook configuration" });
  }
});

app.use((_,res)=>res.status(404).json({success:false,error:"Not found"}));
export default app;