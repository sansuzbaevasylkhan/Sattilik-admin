import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, Apikey",
};

/**
 * Берілген телефон+код үшін жарамды (verified:false, expires_at > now())
 * жазба табылмаса, бірақ өткен уақытта жіберілген жазба бар ма —
 * соны анықтайды. "Ескірген" қателігін көрсету үшін.
 */
async function checkExpiredCode(
  supabaseUrl: string,
  supabaseKey: string,
  phone: string,
  code: string,
  role?: string,
): Promise<boolean> {
  const roleFilter = role ? `&role=eq.${encodeURIComponent(role)}` : "";
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/verification_codes?phone=eq.${encodeURIComponent(
        phone,
      )}&code=eq.${encodeURIComponent(code)}&verified=eq.false${roleFilter}&limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    const rows = await res.json();
    // Verified=false, бірақ expires_at < now() — ескірген
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, code, role } = await req.json();

    // Normalize phone to +7XXXXXXXXXX to match stored records
    const normalizedPhone = (() => {
      const digits = String(phone ?? "").replace(/\D/g, "");
      if (!digits) return null;
      if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
      if (digits.length === 10) return `+7${digits}`;
      if (digits.length === 12 && digits.startsWith("7")) return `+${digits}`;
      return `+${digits}`;
    })();

    if (!normalizedPhone || !code) {
      return new Response(
        JSON.stringify({ error: "phone and code are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const roleFilter = role
      ? `&role=eq.${encodeURIComponent(role)}`
      : "";

    const selectRes = await fetch(
      `${supabaseUrl}/rest/v1/verification_codes?phone=eq.${encodeURIComponent(
        normalizedPhone,
      )}&code=eq.${encodeURIComponent(code)}&verified=eq.false&expires_at=gt.${encodeURIComponent(
        new Date().toISOString(),
      )}${roleFilter}&order=created_at.desc&limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    const rows = await selectRes.json();

    if (!rows || rows.length === 0) {
      // Ескірген/қолданылған кодқа түсініктірек қате
      const isExpired = await checkExpiredCode(
        supabaseUrl,
        supabaseKey,
        normalizedPhone,
        code,
        role,
      );
      return new Response(
        JSON.stringify({
          error: isExpired
            ? "Кодтың жарамдылық мерзімі аяқталды, қайта жіберіңіз"
            : "Код дұрыс емес немесе жарамсыз",
          reason: isExpired ? "expired" : "invalid",
          debug: {
            phone,
            normalizedPhone,
            code,
            role,
            rowsFound: rows?.length ?? 0,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const record = rows[0];

    // Mark code as verified
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/verification_codes?id=eq.${record.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ verified: true }),
      },
    );

    if (!updateRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to update verification status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // users жазбасы бұл кезде әрқашан бар болады — send-code оны бұрын
    // INSERT еткен (ON CONFLICT DO NOTHING). Сондықтан мұнда upsert (INSERT
    // ... ON CONFLICT) қажет емес — қарапайым PATCH жеткілікті.
    // МАҢЫЗДЫ: INSERT ... ON CONFLICT DO UPDATE Postgres-те конфликт
    // тексерілместен БҰРЫН insert жолын құрайды, сондықтан first_name/
    // last_name сияқты NOT NULL бағандарды жібермей қалдырсақ — конфликт
    // сөзсіз болатынына қарамастан "null value violates not-null constraint"
    // қатесі шығады. Тіке PATCH бұл мәселеден толығымен арылтады, себебі
    // тек жіберілген бағандарды ғана жаңартады, бос бағанға тимейді.
    const patchBody: Record<string, unknown> = {
      role: record.role,
    };
    if (record.first_name && String(record.first_name).trim()) {
      patchBody.first_name = record.first_name;
    }
    if (record.last_name && String(record.last_name).trim()) {
      patchBody.last_name = record.last_name;
    }

    const upsertRes = await fetch(
      `${supabaseUrl}/rest/v1/users?phone=eq.${encodeURIComponent(record.phone)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(patchBody),
      },
    );

    if (!upsertRes.ok) {
      const upsertErr = await upsertRes.text();
      return new Response(
        JSON.stringify({
          error: "Failed to upsert user",
          details: upsertErr,
          debug: {
            record: {
              id: record.id,
              phone: record.phone,
              role: record.role,
              first_name: record.first_name,
              last_name: record.last_name,
            },
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        role: record.role,
        first_name: record.first_name,
        last_name: record.last_name,
        phone: record.phone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

