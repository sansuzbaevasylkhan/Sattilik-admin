// Supabase Edge Function — update-driver-profile
//
// Жүргізуші тіркелу ағынында (телефон -> код -> тегі/аты/көлік мәліметтері)
// соңғы қадамда осы функция шақырылады: users кестесіндегі жазбаны
// тегі, аты және көлік мәліметтерімен толықтырады.
// anon/authenticated рөліне users кестесіне UPDATE рұқсаты жоқ (RLS),
// сондықтан бұл жаңарту service_role арқылы Edge Function ішінде жасалады.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateDriverIdCandidate(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureDriverId(
  supabaseUrl: string,
  serviceKey: string,
  phone: string,
): Promise<string | null> {
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=driver_id&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!lookupRes.ok) return null;
  const rows = await lookupRes.json();
  const existing = rows?.[0]?.driver_id;
  if (existing) return String(existing);

  // Бірегей 6 таңбалы ID табу (сирек соқтығысу — бірнеше рет байқап көреміз).
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateDriverIdCandidate();
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ driver_id: candidate }),
      },
    );
    if (updateRes.ok) return candidate;
    // 409/23505 — candidate бос емес, қайта көреміз.
  }
  return null;
}

function normalizePhone(phone: unknown): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let ten = "";
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    ten = digits.slice(1);
  } else if (digits.length === 10) {
    ten = digits;
  } else if (digits.length === 12 && digits.startsWith("7")) {
    ten = digits.slice(2);
  } else {
    return null;
  }

  if (ten.length !== 10) return null;
  return `+7${ten}`;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Server is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)" },
        500,
      );
    }

    let payload: {
      phone?: unknown;
      first_name?: unknown;
      last_name?: unknown;
      car_name?: unknown;
      car_number?: unknown;
      car_color?: unknown;
    };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const normalizedPhone = normalizePhone(payload.phone);
    if (!normalizedPhone) {
      return jsonResponse({ error: "Invalid phone number" }, 400);
    }

    const firstName = typeof payload.first_name === "string" ? payload.first_name.trim() : "";
    const lastName = typeof payload.last_name === "string" ? payload.last_name.trim() : "";
    const carName = typeof payload.car_name === "string" ? payload.car_name.trim() : "";
    const carNumber = typeof payload.car_number === "string" ? payload.car_number.trim() : "";
    const carColor = typeof payload.car_color === "string" ? payload.car_color.trim() : "";

    if (!firstName || !lastName || !carName || !carNumber || !carColor) {
      return jsonResponse(
        { error: "first_name, last_name, car_name, car_number, car_color are required" },
        400,
      );
    }

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(normalizedPhone)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          car_name: carName,
          car_number: carNumber,
          car_color: carColor,
        }),
      },
    );

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      return jsonResponse(
        { error: "Failed to update driver profile", details: errBody },
        500,
      );
    }

    const rows = await updateRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    const driverId = await ensureDriverId(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, normalizedPhone);

    return jsonResponse({
      success: true,
      first_name: firstName,
      last_name: lastName,
      phone: normalizedPhone,
      driver_id: driverId,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
