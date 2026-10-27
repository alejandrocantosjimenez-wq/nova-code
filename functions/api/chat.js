
export async function onRequestPost({ request, env }) {
  try {
    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Falta configurar GEMINI_API_KEY en Cloudflare." },
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

    // Máximo de 3 intentos si Gemini devuelve un error temporal.
    let lastError = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
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
      let data = {};

      try {
        data = JSON.parse(raw);
      } catch {}

      if (response.ok) {
        const answer = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("");

        if (answer) {
          return Response.json({ answer });
        }

        lastError = "Gemini no ha generado texto.";
        break;
      }

      const detail = data?.error?.message || "Sin detalles adicionales.";

      // Solo repetir ante errores temporales.
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        return Response.json(
          {
            error: `Error de Gemini (${response.status}): ${detail}`
          },
          { status: 502 }
        );
      }

      lastError = `Error de Gemini (${response.status}): ${detail}`;

      if (attempt < 2) {
        // Esperar 1 segundo y después 2 segundos.
        await new Promise(resolve =>
          setTimeout(resolve, attempt === 0 ? 1000 : 2000)
        );
      }
    }

    return Response.json(
      {
        error: `${lastError} Se han agotado los 3 intentos. Prueba de nuevo más tarde.`
      },
      { status: 502 }
    );
  } catch {
    return Response.json(
      {
        error: "No se pudo completar la petición. Comprueba la conexión e inténtalo de nuevo."
      },
      { status: 500 }
    );
  }
}
