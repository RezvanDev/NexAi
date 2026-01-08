import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { db } from "../../server/db";
import { companies, leads, calls } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

export function registerCRMRoutes(app: Express) {

    // --- Leads Management ---

    app.get("/api/leads", async (req, res) => {
        try {
            // In a real SaaS, we would filter by authenticated companyId
            const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

            // Fetch calls for these leads (naive approach for now, or join)
            const leadsWithCalls = await Promise.all(allLeads.map(async (lead) => {
                const leadCalls = await db.select().from(calls).where(eq(calls.leadId, lead.id));
                return { ...lead, calls: leadCalls };
            }));

            res.json(leadsWithCalls);
        } catch (e) {
            res.status(500).json({ error: "Failed to fetch leads" });
        }
    });

    // --- Company Settings ---

    app.get("/api/companies/:id", async (req, res) => {
        const id = parseInt(req.params.id);
        const [company] = await db.select().from(companies).where(eq(companies.id, id));
        if (!company) return res.status(404).json({ error: "Company not found" });
        res.json(company);
    });

    app.patch("/api/companies/:id", async (req, res) => {
        const id = parseInt(req.params.id);
        const {
            name,
            agentName,
            agentRole,
            agentGreeting,
            agentTerminationPhrase,
            companyContext,
            systemPrompt
        } = req.body;

        console.log(`[CRM-API] Updating company ${id}`, req.body);

        const [updated] = await db.update(companies)
            .set({
                name,
                agentName,
                agentRole,
                agentGreeting,
                agentTerminationPhrase,
                companyContext,
                systemPrompt
            })
            .where(eq(companies.id, id))
            .returning();

        res.json(updated);
    });

    // Serve CRM Client
    app.use("/crm", express.static(path.join(process.cwd(), "crm/client")));
}
