# CRM Microservice Architecture

This directory (`crm/`) contains the CRM subsystem for the AI Call Assistant.

## Structure

- `server/`: Express.js backend for CRM logic (Leads management, Company configuration, Dashboard API).
- `client/`: React-based Admin Dashboard for business owners.

## Goals

1.  **Separation of Concerns**: The main `server` (root) handles the Realtime AI Voice Agent. This `crm/server` handles data management.
2.  **Shared Database**: For now, both services connect to the same PostgreSQL database defined in `shared/schema.ts`.
3.  **Communication**: 
    -   The Voice Agent (`root/server`) writes Leads/Calls to the DB.
    -   The CRM API (`crm/server`) reads Leads/Calls for the Dashboard.

## Next Steps

1.  Initialize `crm/server/index.ts`.
2.  Initialize `crm/client` (Vite app).
3.  Migrate `api/leads` and `api/companies` management to this service.
