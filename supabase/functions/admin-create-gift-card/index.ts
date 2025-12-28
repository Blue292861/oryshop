import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a unique gift card code
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'GC-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) code += '-';
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseAuth = createClient(
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
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !authData.user) {
      throw new Error("User not authenticated");
    }

    const userId = authData.user.id;

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error("Admin check failed:", roleError);
      throw new Error("Access denied. Admin privileges required.");
    }

    // Parse request body
    const { amount, recipientEmail, recipientName, personalMessage } = await req.json();

    // Validate amount
    if (!amount || (typeof amount !== 'number') || amount < 5 || amount > 500) {
      throw new Error("Invalid amount. Must be between 5€ and 500€");
    }

    // Generate unique gift card code
    let code = generateGiftCardCode();
    let codeExists = true;
    let attempts = 0;
    
    while (codeExists && attempts < 10) {
      const { data: existingCode } = await supabaseClient
        .from('gift_cards')
        .select('id')
        .eq('code', code)
        .single();
      
      if (!existingCode) {
        codeExists = false;
      } else {
        code = generateGiftCardCode();
        attempts++;
      }
    }

    if (codeExists) {
      throw new Error("Could not generate unique code. Please try again.");
    }

    // Calculate expiry date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create the gift card in the database
    const { data: giftCard, error: insertError } = await supabaseClient
      .from('gift_cards')
      .insert({
        code: code,
        initial_amount: amount,
        current_balance: amount,
        expires_at: expiresAt.toISOString(),
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        personal_message: personalMessage || null,
        purchaser_id: userId,
        purchaser_email: authData.user.email,
        is_active: true,
        stripe_payment_id: `ADMIN-${Date.now()}`, // Mark as admin-created
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create gift card");
    }

    console.log(`Admin ${authData.user.email} created gift card ${code} for ${amount}€`);

    return new Response(JSON.stringify({ 
      success: true,
      giftCard: {
        code: giftCard.code,
        amount: giftCard.initial_amount,
        expiresAt: giftCard.expires_at,
        recipientName: giftCard.recipient_name,
        recipientEmail: giftCard.recipient_email,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating admin gift card:", error);
    
    let statusCode = 500;
    if (error.message.includes("not authenticated") || error.message.includes("Authorization")) {
      statusCode = 401;
    } else if (error.message.includes("Access denied")) {
      statusCode = 403;
    } else if (error.message.includes("Invalid") || error.message.includes("Method")) {
      statusCode = 400;
    }

    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
