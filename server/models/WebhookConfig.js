import mongoose from "mongoose";

const webhookConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "global" },
  url: { type: String, default: "" },
  secret: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.models.WebhookConfig || mongoose.model("WebhookConfig", webhookConfigSchema);
