/**
 * Payment-gated entry point for Stripe MCP
 *
 * Wraps the upstream Stripe MCP server (mcp.stripe.com) with per-call
 * payment gating via @tomopay/gateway (x402 / MPP).
 *
 * Usage:
 *   TOMOPAY_ADDRESS=0x... npx @stripe/mcp --api-key=$STRIPE_KEY --gated
 *
 * Pricing rationale:
 *   Write/mutating tools  → $0.05 / call  (reflects Stripe transaction costs)
 *   Read/list/get tools   → $0.01 / call  (low-cost data retrieval)
 */

import { withPayments } from "@tomopay/gateway";
import { main as startServer } from "./index";

// ── Tool pricing map ─────────────────────────────────────────────────────────
const pricing: Record<string, { amount: number; currency: string }> = {
  // Write / mutating operations — $0.05 each
  create_coupon:           { amount: 5, currency: "USD" },
  create_customer:         { amount: 5, currency: "USD" },
  create_invoice:          { amount: 5, currency: "USD" },
  create_invoice_item:     { amount: 5, currency: "USD" },
  finalize_invoice:        { amount: 5, currency: "USD" },
  create_payment_link:     { amount: 5, currency: "USD" },
  create_price:            { amount: 5, currency: "USD" },
  create_product:          { amount: 5, currency: "USD" },
  create_refund:           { amount: 5, currency: "USD" },
  cancel_subscription:     { amount: 5, currency: "USD" },
  update_subscription:     { amount: 5, currency: "USD" },
  update_dispute:          { amount: 5, currency: "USD" },

  // Read / list / get operations — $0.01 each
  get_stripe_account_info: { amount: 1, currency: "USD" },
  retrieve_balance:        { amount: 1, currency: "USD" },
  list_coupons:            { amount: 1, currency: "USD" },
  list_customers:          { amount: 1, currency: "USD" },
  list_disputes:           { amount: 1, currency: "USD" },
  list_invoices:           { amount: 1, currency: "USD" },
  list_payment_intents:    { amount: 1, currency: "USD" },
  list_prices:             { amount: 1, currency: "USD" },
  list_products:           { amount: 1, currency: "USD" },
  list_subscriptions:      { amount: 1, currency: "USD" },
  search_stripe_resources: { amount: 1, currency: "USD" },
  fetch_stripe_resources:  { amount: 1, currency: "USD" },
  search_stripe_documentation: { amount: 1, currency: "USD" },
};

async function gatedMain(): Promise<void> {
  const payTo = process.env.TOMOPAY_ADDRESS;
  if (!payTo) {
    throw new Error(
      "TOMOPAY_ADDRESS env var is required for the gated entry point."
    );
  }

  // startServer returns the MCP server instance; wrap it before transport starts
  const server = await startServer({ returnServer: true });

  const { server: gatedServer } = withPayments(server, {
    payTo,
    protocols: ["x402", "mpp"],
    pricing,
  });

  // gatedServer is now the payment-enforcing MCP server — stdio transport
  // is started by the underlying withPayments wrapper.
  await gatedServer.connect();
}

if (require.main === module) {
  gatedMain().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
