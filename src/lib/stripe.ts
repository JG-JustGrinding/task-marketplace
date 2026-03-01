import Stripe from "stripe";

// Use a valid Stripe API version or rely on your account's default.
// This assumes STRIPE_SECRET_KEY is a test key (sk_test_...) when running in sandbox.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // You can pin this to a specific stable version if you want, e.g. "2024-06-20".
  // Leaving it undefined uses the account default.
});

export default stripe;
