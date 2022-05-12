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
        await db.InitialiseAuth();
        await db.InitialiseUsers();
        await db.InitialiseMachines();
        await db.InitialisePSOs();
    }
    catch (Err)
    {
        throw Err;
    }
};

export {InitDB};
