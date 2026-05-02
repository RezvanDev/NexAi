
import { db } from "./server/db";
import { companies, leads, calls } from "./shared/schema";

async function seed() {
    console.log("Seeding...");

    // 1. Create Company
    let [company] = await db.select().from(companies).limit(1);
    if (!company) {
        console.log("Creating default company...");
        [company] = await db.insert(companies).values({
            name: "NexPride",
            description: "AI Automation Agency",
            agentName: "Alice",
            agentRole: "Sales Manager",
            companyContext: "We sell high-end tech products.",
            systemPrompt: "You are a helpful assistant."
        }).returning();
    }
    console.log("Company ID:", company.id);

    // 2. Create Lead
    let [lead] = await db.select().from(leads).limit(1);
    if (!lead) {
        console.log("Creating default lead...");
        [lead] = await db.insert(leads).values({
            companyId: company.id,
            name: "Test Customer",
            phone: "+1234567890",
            email: "test@example.com"
        }).returning();
    }

    // 3. Create Call
    const [call] = await db.insert(calls).values({
        leadId: lead.id,
        duration: 125,
        summary: "Customer interested in pricing.",
        status: "completed",
        transcript: "Hello... how much? ... $500 ... okay thanks."
    }).returning();

    console.log("Created call:", call.id);
    process.exit(0);
}

seed().catch(console.error);
