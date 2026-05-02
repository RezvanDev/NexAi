
import "dotenv/config";
import { db } from "./server/db";
import { companies } from "./shared/schema";
import { eq } from "drizzle-orm";

async function resetCompanySettings() {
    try {
        console.log("Resetting settings for Company ID 1...");

        // Upsert company 1 with neutral defaults
        await db.insert(companies).values({
            id: 1,
            name: "Моя Компания",
            agentName: "Светлана",
            agentRole: "Менеджер",
            agentGreeting: "Здравствуйте! Чем могу помочь?",
            agentTerminationPhrase: "Хорошо, менеджер свяжется с вами в ближайшее время. Всего доброго.",
            companyContext: "Вы - умный помощник."
        }).onConflictDoUpdate({
            target: companies.id,
            set: {
                name: "Моя Компания",
                agentName: "Светлана",
                agentRole: "Менеджер",
                agentGreeting: "Здравствуйте! Чем могу помочь?",
                agentTerminationPhrase: "Хорошо, менеджер свяжется с вами в ближайшее время. Всего доброго.",
                companyContext: "Вы - умный помощник."
            }
        });

        console.log("Settings reset successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error resetting settings:", error);
        process.exit(1);
    }
}

resetCompanySettings();
