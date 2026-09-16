# ShipSandbox

A lightweight sandbox API for testing Indonesian shipment/tracking integrations.

## MVP features

- No login and no API key required.
- Create dummy shipments for Indonesian courier brands.
- Public tracking API.
- Sequential shipment state machine.
- Manual "Advance Status" control.
- Optional automatic simulation.
- One global webhook URL + secret shared by every shipment.
- Webhook edits protected by `WEBHOOK_EDIT_PASSWORD`.
- Webhook delivery logs.
- MongoDB Atlas persistence.
- Vercel-compatible API function.

## Courier presets

JNE, J&T, SiCepat, AnterAja, Ninja Xpress, Pos Indonesia, TIKI, Lion Parcel, ID Express, SAP Express.

The generated tracking numbers are explicitly sandbox numbers and are not intended to represent real shipments.

## Status flow

CREATED -> PROCESSING -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED

## Local development

1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. `npm install`
3. `npm run dev`

The Vite dev server expects API routes at `/api`. For a production-like local API, use the included Express server separately or deploy to Vercel.

## API

### Create
`POST /api/v1/shipments`

Example body:
```json
{
  "courier": "JNE",
  "senderName": "John Doe",
  "origin": "Jakarta",
  "recipientName": "Jane Doe",
  "destination": "Surabaya",
  "description": "Electronics",
  "weight": 1.2
}
```

### Track
`GET /api/v1/shipments/:trackingNumber`

### Advance
`POST /api/v1/shipments/:trackingNumber/advance`

### Configure webhook
`PUT /api/v1/shipments/:trackingNumber/webhook`
```json
{
  "url": "https://example.com/webhook",
  "secret": "my-webhook-secret"
}
```

The webhook secret is sent as `X-ShipSandbox-Secret`.

## Vercel

Set `MONGODB_URI` in Vercel project environment variables and deploy.

The project uses `/api/index.js` as the serverless Express entrypoint.


## Global webhook
There is exactly one webhook configuration for the whole sandbox. Every shipment uses the same URL and secret. The frontend asks for the edit password when saving; the password is validated server-side against `WEBHOOK_EDIT_PASSWORD` and is never stored in MongoDB.

`GET /api/v1/webhook` returns the URL and configured state, but never returns the secret.

`PUT /api/v1/webhook` accepts `{ "url", "secret", "password" }`.
