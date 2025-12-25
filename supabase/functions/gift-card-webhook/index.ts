import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_GIFT_CARD_WEBHOOK_SECRET");
    
    const body = await req.text();
    
    let event: Stripe.Event;
    
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }

    console.log(`Received event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a gift card purchase
      if (session.metadata?.type !== 'gift_card') {
        console.log("Not a gift card session, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { user_id, user_email, amount, recipient_email, recipient_name, personal_message } = session.metadata;

      console.log(`Processing gift card purchase: ${amount}€ by ${user_email}`);

      // Create the gift card using the database function
      const { data: giftCardData, error: giftCardError } = await supabaseService.rpc('create_gift_card', {
        p_amount: parseFloat(amount),
        p_purchaser_id: user_id,
        p_purchaser_email: user_email,
        p_recipient_email: recipient_email || null,
        p_recipient_name: recipient_name || null,
        p_personal_message: personal_message || null,
        p_stripe_payment_id: session.id,
      });

      if (giftCardError) {
        console.error("Error creating gift card:", giftCardError);
        throw new Error(`Failed to create gift card: ${giftCardError.message}`);
      }

      const giftCard = giftCardData[0];
      console.log(`Gift card created: ${giftCard.code} (ID: ${giftCard.id})`);

      // TODO: Send email to recipient if recipient_email is provided
      // This would integrate with an email service like Resend

      return new Response(JSON.stringify({ 
        received: true, 
        gift_card_code: giftCard.code 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
