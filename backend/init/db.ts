import type {PipelineShaderObjectDB} from "../db.js";

// Init the stuff
async function InitDB(db: PipelineShaderObjectDB, shouldDestroy: boolean = false)
{
    try
    {
        if(shouldDestroy)
        {
            await db.ClearDB();
        }
        console.log("[DBUG] Initialising Auth")
        await db.InitialiseAuth();
        console.log("[DBUG] Initialising Users")
        await db.InitialiseUsers();
        console.log("[DBUG] Initialising Orgs")
        await db.InitialiseOrganisations();
        console.log("[DBUG] Initialising Machines")
        await db.InitialiseMachines();
        console.log("[DBUG] Initialising Org Linkers")
        await db.InitialiseOrganisationLinkTables();
        console.log("[DBUG] Initialising Projects")
        await db.InitialiseProjects();
        console.log("[DBUG] Initialising PSO")
        await db.InitialisePSOs();

    }
    catch (Err)
    {
        throw Err;
    }
};

export {InitDB};
