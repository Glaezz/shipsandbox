import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  location: String,
  description: String
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true, unique: true, index: true },
  courier: { type: String, required: true },
  sender: { name: String, city: String },
  recipient: { name: String, city: String },
  package: { description: String, weight: Number },
  status: { type: String, required: true, default: "CREATED" },
  statusHistory: [historySchema]
}, { timestamps: true });

export default mongoose.models.Shipment || mongoose.model("Shipment", shipmentSchema);
