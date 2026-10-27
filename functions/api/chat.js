
export async function onRequestPost({ request, env }) {
  try {
    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Falta GEMINI_API_KEY en Cloudflare." },
        { status: 500 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "La petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    const message = body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Escribe un mensaje antes de enviarlo." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: message.trim() }]
          }]
        })
      }
    );

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    if (!response.ok) {
      const detail = data?.error?.message;
      return Response.json(
        {
          error: "Error de Gemini (" + response.status + "): " +
            (detail || "Google no ha proporcionado más detalles.")
        },
        { status: 502 }
      );
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!answer) {
      return Response.json(
        {
          error: "Gemini respondió, pero no generó texto. Puede haber un bloqueo de seguridad o una respuesta vacía."
        },
        { status: 502 }
      );
    }

    return Response.json({ answer });
  } catch {
    return Response.json(
      { error: "No se pudo contactar con Gemini. Revisa la conexión y la configuración de Cloudflare." },
      { status: 500 }
    );
  }
}
