import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security logging function
const logSecurityEvent = async (supabase: any, userId: string | null, eventType: string, eventData: any, severity = 'info') => {
  try {
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      severity: severity,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Rate limiting function
const checkRateLimit = async (supabase: any, userId: string | null, endpoint: string): Promise<boolean> => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes window
    
    // Check current rate limit
    const { data: rateLimitData } = await supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();
    
    if (rateLimitData && rateLimitData.request_count >= 10) { // Max 10 requests per 15 minutes
      return false;
    }
    
    // Update or insert rate limit record
    await supabase.from('api_rate_limits').upsert({
      user_id: userId,
      endpoint: endpoint,
      request_count: (rateLimitData?.request_count || 0) + 1,
      window_start: rateLimitData ? undefined : now.toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error to avoid blocking legitimate requests
  }
};

// Input validation function
const validateCartItems = (items: any[]): boolean => {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  
  for (const item of items) {
    // Validate required fields
    if (!item.id || !item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      return false;
    }
    
    // Validate data types and ranges
    if (item.price <= 0 || item.price > 100000) { // Max price 1000€
      return false;
    }
    
    if (item.quantity <= 0 || item.quantity > 100) { // Max quantity 100
      return false;
    }
    
    // Validate string lengths
    if (item.name.length > 200 || item.id.length > 50) {
      return false;
    }
  }
  
  return true;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the service role key for security operations
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Create client with anon key for user auth
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Validate request method
    if (req.method !== "POST") {
      await logSecurityEvent(supabaseService, null, 'invalid_method', { method: req.method }, 'warn');
      throw new Error("Method not allowed");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logSecurityEvent(supabaseService, null, 'missing_auth_header', {}, 'warn');
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user?.email) {
      await logSecurityEvent(supabaseService, null, 'auth_failed', { error: authError?.message }, 'warn');
      throw new Error("User not authenticated or email not available");
    }

    const user = data.user;

    // Rate limiting check
    const rateLimitPassed = await checkRateLimit(supabaseService, user.id, 'create-payment');
    if (!rateLimitPassed) {
      await logSecurityEvent(supabaseService, user.id, 'rate_limit_exceeded', { endpoint: 'create-payment' }, 'warn');
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      await logSecurityEvent(supabaseService, user.id, 'invalid_json', { error: error.message }, 'warn');
      throw new Error("Invalid JSON in request body");
    }

    const { items } = requestBody;

    // Comprehensive input validation
    if (!validateCartItems(items)) {
      await logSecurityEvent(supabaseService, user.id, 'invalid_cart_items', { items }, 'warn');
      throw new Error("Invalid cart items provided");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Prepare line items for Stripe
    const lineItems = items.map((item: any) => {
      const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name,
            description: item.description,
            images: [item.image_url],
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Calculate total amount for logging
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);

    // Add shipping as a line item
    const shippingCost = items.length > 0 ? 4 : 0;
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de port",
          },
          unit_amount: shippingCost * 100,
        },
        quantity: 1,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/cart`,
      metadata: {
        user_id: user.id,
        items: JSON.stringify(items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.is_on_sale && item.sale_price ? item.sale_price : item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize
        })))
      }
    });

    // Log successful payment session creation
    await logSecurityEvent(supabaseService, user.id, 'payment_session_created', {
      session_id: session.id,
      amount: totalAmount,
      customer_id: customerId,
      items_count: items.length
    });

    // Create pending orders in database
    const orderPromises = items.map(async (item: any) => {
      const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      
      const { data, error } = await supabaseService.from("orders").insert({
        user_id: user.id,
        item_id: item.id,
        item_name: item.name,
        price: finalPrice * item.quantity,
        status: "pending",
      });

      if (error) {
        console.error(`Failed to create order for item ${item.id}:`, error);
        await logSecurityEvent(supabaseService, user.id, 'order_creation_failed', {
          item_id: item.id,
          item_name: item.name,
          error_message: error.message,
          error_code: error.code,
          error_details: error.details
        }, 'error');
        throw new Error(`Failed to create order: ${error.message}`);
      }

      console.log(`Successfully created pending order for user ${user.id}, item ${item.id}`);
      return data;
    });

    const orderResults = await Promise.all(orderPromises);
    console.log(`Created ${orderResults.length} pending orders for session ${session.id}`);

    console.log(`Created Stripe session ${session.id} for user ${user.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Log security error
    try {
      await logSecurityEvent(supabaseService, null, 'payment_error', { 
        error: error.message,
        stack: error.stack 
      }, 'error');
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    // Determine appropriate HTTP status code
    let statusCode = 500;
    if (error.message.includes("Rate limit exceeded")) {
      statusCode = 429;
    } else if (error.message.includes("not authenticated") || error.message.includes("Authorization")) {
      statusCode = 401;
    } else if (error.message.includes("Invalid") || error.message.includes("Method not allowed")) {
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