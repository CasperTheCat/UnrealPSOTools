// Fetches the full list of images that the user has access to globally.
// Can be delayed

import type { PipelineShaderObjectDB } from "./db.js";
import { HashOfBuffer, StringToVersion } from './helpers.js';


// Also fetch the user's boards.
// This is needed the moment after login flow
// But it's smaller
// Let's just load the board names
// We can look for the boards later!

async function getMachinesForOwner(req, res, db: PipelineShaderObjectDB)
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
    try
    {
        if("user" in req)
        {
            console.log("[INFO] Requesting User Data for user " + req.user.toString());
            let userData = await db.GetUserByUID(req.user);

            userData = JSON.stringify(userData);

            res.status(200).send(userData);//`{ "userdata": ${userData} }`);
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

async function ListMachinesByProject(req,res,psoDB)
{
    try
    {
        let project: Buffer = Buffer.from(req.params.project, "hex");
        //let userid: Express.User = req.user;
        if ("passport" in req.session)
        {
            let userid: number = req.session["passport"].user;

            let currentDate: Date = new Date();
            let a = await psoDB.GetPermissionsByProjectUUIDAndUserID(project, userid, currentDate);


            if(a && a.permadminmachines)
            {
                let x = await psoDB.GetMachinesByOrgUUID_ValidatedByUserID(project, userid);

                console.log(x);

                x = JSON.stringify(x);
        
                res.status(200).send(x);//`{ "userdata": ${userData} }`);
            }
            else
            {
                res.sendStatus(400);
            }
        }
        else
        {
            res.sendStatus(400);
        }
    }
    catch (Exception)
    {
        console.log(Exception);
        res.status(500).send("{ \"code\": 0, \"reason\": \"Exception\" }");
    }
}

async function ListMachinesByOrg(req,res,psoDB)
{
    try
    {
        let org: Buffer = Buffer.from(req.params.org, "hex");
        //let userid: Express.User = req.user;
        if ("passport" in req.session)
        {
            let userid: number = req.session["passport"].user;

            let a = await psoDB.GetPermissionsByOrgUUIDAndUserID(org, userid);


            if(a && a.permadminmachines)
            {
                let x = await psoDB.GetMachinesByOrgUUID_ValidatedByUserID(org, userid);

                console.log(x);

                x = JSON.stringify(x);
        
                res.status(200).send(x);//`{ "userdata": ${userData} }`);
            }
            else
            {
                res.sendStatus(400);
            }
        }
        else
        {
            res.sendStatus(400);
        }
    }
    catch (Exception)
    {
        console.log(Exception);
        res.status(500).send("{ \"code\": 0, \"reason\": \"Exception\" }");
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


async function AddNewPSOToProjectByUUIDs(psoDB: PipelineShaderObjectDB, projectuuid: Buffer, machineuuid: Buffer, version:string, data: Buffer, isStableKey: boolean, optionalPlatform: string = "", optionalSM: string = "")
{
    try
    {
        // Assert
        // Take Data, hash it, and insert
        // TODO: Try to parse it
        // HCACEPIP
        let short = data.subarray(0,8);

        if (short.equals(Buffer.from("HCACEPIP")))
        {
            let hash = await HashOfBuffer(data);

            let datenow = new Date();

            // Check Machine Exists
            let DoesMachineExist = await psoDB.GetMachinesByFingerprint(machineuuid);
            let vInts = StringToVersion(version);
            

            let result = 1;
            if (DoesMachineExist)
            {

                result = await psoDB.AddPSO(projectuuid, hash, data, datenow, machineuuid, version, isStableKey, optionalPlatform, optionalSM); 
                return result;
            }
            else
            {
                //console.log(`Machine: ${DoesMachineExist}`);
                return -1;
            }
        }
        else
        {
            return -11;
        }
    }
    catch (Exception)
    {
        return -10;
    }
}

async function AddNewShaderInfoToProjectByUUIDs(psoDB: PipelineShaderObjectDB, projectuuid: Buffer, machineuuid: Buffer, version:string, data: Buffer, isGlobalKey: boolean, optionalPlatform: string = "", optionalSM: string = "")
{
    try
    {
        // Assert
        // Take Data, hash it, and insert
        // TODO: Try to parse it
        // STBLSHDR
        let short = data.subarray(0,8);

        if (short.equals(Buffer.from("STBLSHDR")))
        {
            let hash = await HashOfBuffer(data);

            let datenow = new Date();

            // Check Machine Exists
            let DoesMachineExist = await psoDB.GetMachinesByFingerprint(machineuuid);
            let vInts = StringToVersion(version);
            

            let result = 1;
            if (DoesMachineExist)
            {
                result = await psoDB.AddKeyInfo(projectuuid, hash, data, datenow, machineuuid, version, isGlobalKey, optionalPlatform, optionalSM); 
                return result;
            }
            else
            {
                //console.log(`Machine: ${DoesMachineExist}`);
                return -1;
            }
        }
        else
        {
            return -11;
        }
    }
    catch (Exception)
    {
        return -10;
    }
}


async function AddNewPSOToProject(req,res,psoDB, isStableKey)
{
    try
    {
        let version: string = req.params.version;
        let machine: Buffer = Buffer.from(req.params.machine, 'hex');
        let project: Buffer = Buffer.from(req.params.project, 'hex');

        //await psoDB.AddMachine(1, "temp", Buffer.from("59BAF778B714E5CAF6A7F3A3DE036749122829BDC30639F155130BDB21D74166", 'hex'));
        //psoDB.Create
        //await psoDB.AddProject(1, "TestProject", Buffer.from("59BAF778B714E5CAF6A7F3A3DE036749122829BDC30639F155130BDB21D74166", 'hex'));

        let result:number = await AddNewPSOToProjectByUUIDs(psoDB, project, machine, version, req.body, isStableKey);

        // Results
        if(0 == result)
        {
            res.sendStatus(200);
            return;
        }
        else if (-1 == result)
        {
            res.status(400).send("{ \"code\": -1, \"reason\": \"Bad Machine or Project\" }");
            return;
        }
        else if (-2 == result)
        {
            res.status(403).send("{ \"code\": -2, \"reason\": \"Permission Error\" }");
            return;
        }

        res.sendStatus(400);//.send(JSON.stringify(results));
    }
    catch (Exception)
    {
        console.log(Exception);
        res.status(500).send("{ \"code\": 0, \"reason\": \"Exception\" }");
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


export {AddNewShaderInfoToProjectByUUIDs, AddNewPSOToProjectByUUIDs, AddNewPSOToProject, ListMachinesByOrg, ListMachinesByProject, getMachinesForOwner, getUserInfo, getAllPCOsForUser, getAllPCOs};