// app/api/notifications/route.js

import { sendNotificationToAll, sendNotificationToUser } from "@/back-end/services/notificationServices";

// Enviar notificação para todos os usuários - POST
export async function POST(req) {
  try {
    const body = await req.json();
    const { title, body: message } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ ok: false, msg: "Título e corpo são obrigatórios" }),
        { status: 400 }
      );
    }

    const response = await sendNotificationToAll(title, message);
    return new Response(JSON.stringify(response), { status: 200 });

  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500 }
    );
  }
}

// Enviar notificação para um usuário específico - PUT
export async function PUT(req) {
  try {
    const body = await req.json();
    const { userId, title, body: message } = body;

    if (!userId || !title || !message) {
      return new Response(
        JSON.stringify({
          ok: false,
          msg: "userId, título e corpo são obrigatórios"
        }),
        { status: 400 }
      );
    }

    const response = await sendNotificationToUser(userId, title, message);
    return new Response(JSON.stringify(response), { status: 200 });

  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500 }
    );
  }
}
/*
puxar no front
await fetch("/api/notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Hello!", body: "Mensagem geral" })
});
usuario especifico
await fetch("/api/notifications", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: 12, title: "Aviso", body: "Notificação privada" })
});

*/