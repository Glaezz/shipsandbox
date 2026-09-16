const timeoutMs = Number(process.env.WEBHOOK_TIMEOUT_MS || 8000);

export async function deliverWebhook(config, shipment, previousStatus, status) {
  if (!config?.url) return { skipped: true };
  const payload = { event: "shipment.status_changed", data: { trackingNumber: shipment.trackingNumber, courier: shipment.courier, previousStatus, status, timestamp: new Date().toISOString() } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json", "X-ShipSandbox-Secret": config.secret || "" }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timer);
    return { ok: response.ok, status: response.status };
  } catch (error) {
    clearTimeout(timer);
    return { ok: false, error: error.message };
  }
}
