import 'dotenv/config';
import { db } from "../server/db";
import { companies } from "../shared/schema";

async function main() {
  console.log("Adding Pizza Company...");
  
  const [pizza] = await db.insert(companies).values({
    name: "Пиццерия Марио",
    description: "Лучшая пицца в городе",
    agentName: "Иван",
    agentRole: "Менеджер по заказам",
    companyContext: "Мы готовим настоящую итальянскую пиццу на дровах. В меню есть Маргарита, Пепперони и Четыре сыра. Доставка по городу 40 минут.",
    agentGreeting: "Добрый день! Рады приветствовать вас в пиццерии Марио. Какую пиццу хотите заказать сегодня?",
    agentTerminationPhrase: "Ваш заказ принят, ожидайте курьера. Приятного аппетита!",
    systemPrompt: "Ты — Иван, менеджер пиццерии 'Марио'. Твоя цель — вежливо принять заказ. Если клиент спрашивает цену, говори что любая пицца стоит 800 рублей. В конце разговора всегда желай приятного аппетита."
  }).returning();

  console.log("Success! Pizza Company ID:", pizza.id);
  process.exit(0);
}

main().catch(console.error);
