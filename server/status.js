export const STATUSES = ["CREATED", "PROCESSING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STATUS_DESCRIPTIONS = {
  CREATED: "Shipment created in sandbox",
  PROCESSING: "Package is being processed",
  IN_TRANSIT: "Package is in transit",
  OUT_FOR_DELIVERY: "Package is out for delivery",
  DELIVERED: "Package delivered"
};

export function getNextStatus(status) {
  const i = STATUSES.indexOf(status);
  return i >= 0 && i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}