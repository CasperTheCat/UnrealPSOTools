// Fetches the full list of images that the user has access to globally.
// Can be delayed

import type { PipelineShaderObjectDB } from "./db.js";

// Also fetch the user's boards.
// This is needed the moment after login flow
// But it's smaller
// Let's just load the board names
// We can look for the boards later!

async function getBoardsForUser(req, res, db: PipelineShaderObjectDB)
{
    console.log("[INFO] Request machine data for user " + req.user.toString());
    try
    {
        let boardList = await db.GetMachinesByUID(req.user);
        console.log(boardList);

        boardList = JSON.stringify(boardList);

        res.status(200).send(`{ "machines": ${boardList} }`);
    }
    catch (Except)
    {
        console.log(Except);
        res.sendStatus(500);
    }
}



async function getUserInfo(req, res, db)
{
    console.log("[INFO] Requesting User Data for user " + req.user.toString());
    try
    {
        let userData = await db.GetUserByUID(req.user);

        userData = JSON.stringify(userData);

        res.status(200).send(userData);//`{ "userdata": ${userData} }`);
    }
    catch (Except)
    {
        console.log(Except);
        res.sendStatus(500);
    }
}

async function getAllPCOsForUser(req, res, db)
{
    try
    {
        if("token" in req.params)
            {
            let token: Buffer = Buffer.from(req.params.token, "hex");
            let User = await db.GetAuthByToken(token);

            if(User)
            {
                console.log("[INFO] Requesting PCO Data for user " + User["displayname"]);

                console.log(User);
            
                // Check
                if (User["permissionlevelread"])
                {
                    let pcos = await db.GetPipelineDataByToken(token);

                    if(pcos)
                    {
                        for(let pco of pcos)
                        {
                            pco["pipelinecachedata"] = pco["pipelinecachedata"].toString('base64');
                            pco["hash"] = pco["hash"].toString('base64');
                        }

                        pcos = JSON.stringify(pcos);
        
                        res.status(200).send(pcos);//`{ "userdata": ${userData} }`);
                    }
                    else
                    {
                        res.sendStatus(400);
                    }

                }
                else
                {
                    res.sendStatus(403);
                }
            }
            else
            {
                //await db.AddUser("geo2", null, null, token, "Geo", true);
                res.sendStatus(400);
            }
        }
        else
        {
            res.sendStatus(400);
        }
    }
    catch (Except)
    {
        console.log(Except);
        res.sendStatus(500);
    }
}

async function getAllPCOs(req, res, db)
{
    try
    {
        let pcos = await db.GetAllPipelineCaches();

        pcos = JSON.stringify(pcos);

        res.status(200).send(pcos);//`{ "userdata": ${userData} }`);
    }
    catch (Except)
    {
        console.log(Except);
        res.sendStatus(500);
    }
}


export {getBoardsForUser, getUserInfo, getAllPCOsForUser, getAllPCOs};