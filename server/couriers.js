export const COURIERS = {
  JNE: "JNE",
  JNT: "J&T",
  SCP: "SiCepat",
  ANT: "AnterAja",
  NIN: "Ninja Xpress",
  POS: "Pos Indonesia",
  TIKI: "TIKI",
  LION: "Lion Parcel",
  ID: "ID Express",
  SAP: "SAP Express"
};

export function generateTracking(courier) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 7; i++) random += chars[Math.floor(Math.random() * chars.length)];
  return `${courier}-SBX-${random}`;
}