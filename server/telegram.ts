import { Call, Company, Lead } from "@shared/schema";

export async function sendTelegramNotification(
  company: Company,
  lead: Lead | undefined,
  call: Call,
  transcript: string,
  summary: string
) {
  if (!company.telegramChatId) {
    console.log(`[Telegram] Skipping notification for company ${company.id} (No chat ID)`);
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[Telegram] Error: TELEGRAM_BOT_TOKEN is not set in .env");
    return;
  }

  const leadName = lead?.name || "Неизвестный клиент";
  const leadPhone = lead?.phone || "Не указан";
  const durationStr = call.duration ? `${call.duration} сек` : "0 сек (Сброс)";
  const statusIcon = call.duration && call.duration > 0 ? "✅" : "⚠️";

  // Using HTML parsing for Telegram
  const message = `
${statusIcon} <b>Новый звонок!</b>
🏢 <b>Компания:</b> ${company.name}
👤 <b>Клиент:</b> ${leadName}
📞 <b>Телефон:</b> ${leadPhone}
⏱ <b>Длительность:</b> ${durationStr}

🤖 <b>Суть разговора:</b>
${summary}

<i>Полный транскрипт доступен в CRM.</i>
`.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: company.telegramChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Telegram] Failed to send message to ${company.telegramChatId}:`, errorData);
    } else {
      console.log(`[Telegram] Sent notification successfully to ${company.telegramChatId}`);
    }
  } catch (error) {
    console.error("[Telegram] Network error sending notification:", error);
  }
}
