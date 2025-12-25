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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Validate request method
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = data.user;

    // Parse request body
    const { amount, recipientEmail, recipientName, personalMessage } = await req.json();

    // Validate amount
    const validAmounts = [25, 50, 75, 100, 150, 200];
    if (!amount || (typeof amount !== 'number') || amount < 5 || amount > 500) {
      throw new Error("Invalid amount. Must be between 5€ and 500€");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session for gift card
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Carte Cadeau OryShop - ${amount}€`,
              description: recipientName 
                ? `Pour: ${recipientName}${personalMessage ? ` - "${personalMessage}"` : ''}`
                : "Carte cadeau utilisable sur OryShop",
              images: [],
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/gift-card-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/gift-cards`,
      metadata: {
        type: 'gift_card',
        user_id: user.id,
        user_email: user.email,
        amount: amount.toString(),
        recipient_email: recipientEmail || '',
        recipient_name: recipientName || '',
        personal_message: personalMessage || '',
      },
    });

    console.log(`Created gift card checkout session ${session.id} for ${amount}€`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating gift card session:", error);
    
    let statusCode = 500;
    if (error.message.includes("not authenticated") || error.message.includes("Authorization")) {
      statusCode = 401;
    } else if (error.message.includes("Invalid") || error.message.includes("Method")) {
      statusCode = 400;
    }

    return new Response(JSON.stringify({ 
      error: statusCode === 500 ? "Internal server error" : error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
