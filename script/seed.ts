import "dotenv/config";
import { db } from "../server/db";
import { companies } from "../shared/schema";

async function seed() {
    console.log("Seeding default company...");
    await db.insert(companies).values({
        id: 1,
        name: "My Company",
        description: "Default Company",
        agentName: "Alice",
        agentRole: "Assistant",
        companyContext: "We sell AI solutions."
    }).onConflictDoNothing();
    console.log("Done.");
    process.exit(0);
}

seed().catch(console.error);
