
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Falta configurar la clave de Gemini en Cloudflare." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message = body.message;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Escribe un mensaje antes de enviarlo." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "Gemini no ha podido responder. Comprueba la API y su disponibilidad." },
        { status: 502 }
      );
    }

    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "No se ha recibido una respuesta.";

    return Response.json({ answer });
  } catch {
    return Response.json(
      { error: "Ha ocurrido un error al procesar el mensaje." },
      { status: 500 }
    );
  }
}
