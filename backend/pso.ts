import express from "express";
import { fileURLToPath } from 'url';
import path,{ dirname } from 'path';
import {AddNewShaderInfoToProjectByUUIDs, AddNewPSOToProjectByUUIDs, AddNewPSOToProject, ListMachinesByOrg, ListMachinesByProject, getMachinesForOrg, getUserInfo, getAllPCOsForUser, getAllPCOs} from "./apidecl.js";
import { PipelineShaderObjectDB } from './db.js';
import { ShaderKeyTypes, HandleReturn, HashOfBuffer, StringToVersion, GetUserID} from './helpers.js';
import passport from "passport";
import {ensureLoggedIn} from 'connect-ensure-login';
import {InsertNewUserToDB} from "./auth.js";
import bodyParser from 'body-parser';
import session from 'express-session';
import { readFile } from "fs/promises";
import {InitDB} from "./init/db.js";
import {InitAuthStrat} from "./init/auth.js";
import {TagArrayToString} from "./tagHandler.js";
import connectPgSimple, { type PGStoreOptions } from "connect-pg-simple";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function entry()
{
    const app = express();

    // Init

    let psoDB: PipelineShaderObjectDB = new PipelineShaderObjectDB();

    try
    {
        await InitDB(psoDB);
        console.log("[INFO] DB Online");
 
    }
    catch (Exception)
    {
        console.log("[ERRO] DB Failure");
        throw Exception;
    }

    const StoreOptions: connectPgSimple.PGStoreOptions = {
        pgPromise: psoDB.pgdb,
        tableName: 'session'
      };

    const connector = connectPgSimple(session);

    app.use(session({
        store: new connector(StoreOptions),
          secret: ['test'],
          cookie: {
            secure: false,
            httpOnly: true,
            sameSite: true,
            maxAge: 24 * 60 * 60 * 1000
          },
          saveUninitialized: true,
          resave: false
        }));
    app.use(passport.initialize());
    app.use(passport.session());


    

    InitAuthStrat(psoDB).then
    (() => 
        {
            console.log("[INFO] Passport Initialised");
        }
    ).catch
    ((err) =>
        {
            console.log("[ERRO] Passport Failure");
            throw err;
        }
    )


    app.get('/login',
        (req, res) => 
        {
            res.sendFile(path.resolve(__dirname, '../', 'public', 'login.html'));
        }
    );

    app.post('/login', bodyParser.urlencoded({extended: false}), passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureMessage: true
    }));

    app.get('/logout', 
    (req, res) =>
        {
            req.logout();
            res.redirect('/');
        }
    );

    app.get('/signup',
    (req, res) => 
    {
        res.sendFile(path.resolve(__dirname, '../', 'public', 'signup.html'));
    }
    );

    app.post('/signup', bodyParser.urlencoded({extended: false}),
    (req, res) => 
    {
        InsertNewUserToDB(psoDB, req, res);
    }
    );

    app.use('/static', express.static('public'))
    app.get('/', (req, res) => 
    {
        //console.log(mirageDB.GetUserByUID(req.user.userid));
        res.sendFile(path.resolve(__dirname, '../', 'public', 'index.html'));
    });

    // Declare API
    app.get('/api', (req, res) => 
    {
        // Return something?
    });

    app.get('/api/user', (req, res) => 
    {
        getUserInfo(req, res, psoDB);
    });

    app.post('/api/orgs', bodyParser.json({ limit: '99mb', strict: true }), async (req, res) => 
    {
        try
        {
            let userid = await GetUserID(req, req.body, psoDB);

            if(userid > 0)
            {
                console.log("[INFO] Requesting User Data for user " + userid.toString());
                let userData = await psoDB.GetOrgsByUser(userid);
    
                for(let pco of userData)
                {
                    pco.uuid = pco.uuid.toString('base64');
                }

                userData = JSON.stringify(userData);
    
                res.status(200).send(`{ "orgs": ${userData} }`);
            }
            else
            {
                res.sendStatus(403);
            }
    
        }
        catch (Except)
        {
            console.log(Except);
            res.sendStatus(500);
        }
    });

    app.get("/api/machine/list/byorg/:org", ensureLoggedIn(), async (req, res) => 
    {
        ListMachinesByOrg(req, res, psoDB);
    });

    app.get("/api/machine/list/byproject/:project", ensureLoggedIn(), async (req, res) => 
    {
        ListMachinesByProject(req, res, psoDB);
    });

    app.get("/api/pco/all/token/:token", async (req, res) => 
    {
        getAllPCOsForUser(req, res, psoDB);
        //getAllPCOs(req, res, psoDB);
    });

    app.post("/api/pco/version/after", bodyParser.json({ limit: '99mb', strict: true }), async (req, res) => 
    {
        try
        {
            let jsonbody: JSON = req.body;
            //console.log(jsonbody);
            if ("project" in jsonbody && "machine" in jsonbody && "version" in jsonbody)
            {
                let ProjectUUID: Buffer = Buffer.from(jsonbody["project"], 'base64');
                let MachineUUID: Buffer = Buffer.from(jsonbody["machine"], 'base64');
                let Version: string = jsonbody["version"];
                let platform: string = "";
                let shaderModel: string = "";
                let extag: string = ""

                if ("platform" in jsonbody)
                {
                    platform = jsonbody["platform"];
                }

                if ("shadermodel" in jsonbody)
                {
                    shaderModel = jsonbody["shadermodel"];
                }            
                
                if ("tag" in jsonbody)
                {
                    extag = jsonbody["tag"];
                }        

                let vInt = StringToVersion(Version);

                let PCOData;
                
                if (platform.length > 0 && shaderModel.length > 0)
                {
                    PCOData = await psoDB.GetCacheDataAfterVersion_ValidatedByMachinePlatformModel(ProjectUUID, MachineUUID, vInt[0], vInt[1], vInt[2], vInt[3], new Date(), platform, shaderModel, extag);
                }
                else
                {
                    PCOData = await psoDB.GetCacheDataAfterVersion_ValidatedByMachine(ProjectUUID, MachineUUID, vInt[0], vInt[1], vInt[2], vInt[3], new Date(), extag);
                }
                

                if(PCOData)
                {
                    for(let pco of PCOData)
                    {
                        pco.pipelinecachedata = pco.pipelinecachedata.toString('base64');
                    }

                    let pcos = JSON.stringify(PCOData);
    
                    res.status(200).send(pcos);//`{ "userdata": ${userData} }`);
                }
                else
                {
                    res.sendStatus(400);
                }
                
            }
        }
        catch (Except)
        {
            console.log(Except);
            res.sendStatus(500);
        }
    });



    app.post("/api/pco/date/after", bodyParser.json({ limit: '99mb', strict: true }), async (req, res) => 
    {
        try
        {
            let jsonbody: JSON = req.body;
            //let userid: number = await GetUserID(req, jsonbody, psoDB);
            //console.log(jsonbody);
            if ("project" in jsonbody && "machine" in jsonbody && "date" in jsonbody)
            {
                let ProjectUUID: Buffer = Buffer.from(jsonbody["project"], 'base64');
                let MachineUUID: Buffer = Buffer.from(jsonbody["machine"], 'base64');
                let AfterDate: Date = new Date(jsonbody["date"]);
                let platform: string = "";
                let shaderModel: string = "";
                let extag: string = "";

                if ("platform" in jsonbody)
                {
                    platform = jsonbody["platform"];
                }

                if ("shadermodel" in jsonbody)
                {
                    shaderModel = jsonbody["shadermodel"];
                }                

                if ("tag" in jsonbody)
                {
                    extag = jsonbody["tag"];
                }     

                let PCOData;
                
                if (platform.length > 0 && shaderModel.length > 0)
                {
                    PCOData = await psoDB.GetCacheDataAfterDate_ValidatedByMachinePlatformModel(ProjectUUID, AfterDate, MachineUUID, new Date(), platform, shaderModel, extag);
                }
                else
                {
                    PCOData = await psoDB.GetCacheDataAfterDate_ValidatedByMachine(ProjectUUID, AfterDate, MachineUUID, new Date(), extag);
                }
                

                if(PCOData)
                {
                    for(let pco of PCOData)
                    {
                        pco.pipelinecachedata = pco.pipelinecachedata.toString('base64');
                    }

                    let pcos = JSON.stringify(PCOData);
    
                    res.status(200).send(pcos);//`{ "userdata": ${userData} }`);
                }
                else
                {
                    res.sendStatus(400);
                }
                
            }
        }
        catch (Except)
        {
            console.log(Except);
            res.sendStatus(500);
        }
    });

    app.post('/api/projects', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            // Split JSON
            
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid)
            {
                let projList;

                if ("org" in jsonbody)
                {
                    let organisation: Buffer = Buffer.from(req.body.org, "base64");
                    projList = await psoDB.GetProjectsByOrgUUID_ValidatedByUserID(organisation, userid);
                }

                if (projList)
                {
                    for(let project of projList)
                    {
                        project.uuid = project.uuid.toString('base64');
                    }

                    projList = JSON.stringify(projList);

                    res.status(200).send(`{ "projects": ${projList} }`);
                    return;
                }
            }

            res.sendStatus(400);
        }
    );

    app.post('/api/machines', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            // Split JSON
            
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid)
            {
                let macList;

                if ("org" in jsonbody)
                {
                    let organisation: Buffer = Buffer.from(req.body.org, "base64");
                    macList = await psoDB.GetMachinesByOrgUUID_ValidatedByUserID(organisation, userid);
                }
                else if ("project" in jsonbody)
                {
                    let project: Buffer = Buffer.from(req.body.project, "base64");
                    macList = await psoDB.GetMachinesByProjectUUID_ValidatedByUserID(project, userid, new Date());
                }

                if (macList)
                {
                    for(let machine of macList)
                    {
                        machine.fingerprint = machine.fingerprint.toString('base64');
                    }

                    macList = JSON.stringify(macList);

                    res.status(200).send(`{ "machines": ${macList} }`);
                    return;
                }
            }

            res.sendStatus(400);
        }
    );

    app.put('/api/machines', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // 
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid && "org" in jsonbody)
            {
                let result: number = -1;
                let organisation: Buffer = Buffer.from(req.body.org, "base64");

                if ("machinename" in jsonbody)
                {
                    result = await psoDB.AddMachine(userid, req.body.machinename, organisation);
                }
                else if ("project" in jsonbody && "machineuuid" in jsonbody && "validfrom" in jsonbody && "validuntil" in jsonbody && "canSubmit" in jsonbody && "canPull" in jsonbody)
                {
                    let project: Buffer = Buffer.from(req.body.project, "base64");
                    let machine: Buffer = Buffer.from(req.body.machineuuid, "base64");
                    result = await psoDB.AddMachineToProject(userid, machine, organisation, project, new Date(jsonbody["validfrom"]), new Date(jsonbody["validuntil"]), jsonbody["canSubmit"], jsonbody["canPull"]);
                    //userid:number, machineprint: Buffer, owningOrg: Buffer, projectuuid: Buffer, validFrom: Date, validTill: Date, canSubmit: boolean, canPull: boolean
                }

                HandleReturn(result, res);
                return;
            }

            res.sendStatus(400);
        }
    );

    app.put('/api/projects', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            try 
            {
                // 
                let jsonbody: JSON = req.body;
                let userid: number = await GetUserID(req, jsonbody, psoDB);

                if(userid && "org" in jsonbody)
                {
                    let result: number = -1;
                    let organisation: Buffer = Buffer.from(req.body.org, "base64");

                    if ("projectname" in jsonbody)
                    {
                        result = await psoDB.AddProject(userid, jsonbody["projectname"], organisation);
                    }

                    HandleReturn(result, res);
                    return;
                }

                res.sendStatus(400);
            }
            catch (Exception)
            {
                res.sendStatus(500);
            }
        }
    );

    app.delete('/api/machines', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // 
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid > 0 && "machineuuid" in jsonbody)
            {
                let result: number = -1;
                let machineID: Buffer = Buffer.from(req.body.machineuuid, "base64");

                if ("org" in jsonbody)
                {
                    let Organisation: Buffer = Buffer.from(req.body.org, "base64");

                    let Perms = await psoDB.GetPermissionsByOrgUUIDAndUserID(Organisation, userid);

                    if (Perms && Perms["permdeletemachines"])
                    {
                        await psoDB.DeleteMachineFromOrgByUUIDs_ValidatedByUserID(machineID, Organisation, userid);
                        result = 0;
                    }
                    else
                    {
                        // Permissions
                        result -2;
                    }
                }
                else if ("project" in jsonbody)
                {
                    let Project: Buffer = Buffer.from(jsonbody["project"], "base64");
                    //result = await psoDB.AddMachineToProject(userid, machine, organisation, project, new Date(jsonbody["validfrom"]), new Date(jsonbody["validuntil"]), jsonbody["canSubmit"], jsonbody["canPull"]);
                    //userid:number, machineprint: Buffer, owningOrg: Buffer, projectuuid: Buffer, validFrom: Date, validTill: Date, canSubmit: boolean, canPull: boolean
                }

                HandleReturn(result, res);
                return;
            }

            res.sendStatus(400);
        }
    );

    app.delete('/api/projects', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // 
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid > 0 && "projectuuid" in jsonbody)
            {
                let result: number = -1;
                let ProjectUUID: Buffer = Buffer.from(jsonbody["projectuuid"], "base64");

                if ("org" in jsonbody)
                {
                    let Organisation: Buffer = Buffer.from(jsonbody["org"], "base64");
                    let Perms = await psoDB.GetPermissionsByOrgUUIDAndUserID(Organisation, userid);

                    if (Perms && Perms["permdeleteproject"])
                    {
                        await psoDB.DeleteProjectFromOrgByUUIDs_ValidatedByUserID(ProjectUUID, Organisation, userid);
                        result = 0;
                    }
                    else
                    {
                        // Permissions
                        result -2;
                    }
                }

                HandleReturn(result, res);
                return;
            }

            res.sendStatus(400);
        }
    );

    app.post('/api/permissions', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            // Split JSON
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);
            //console.log(jsonbody);
            if (userid > 0)
            {
                let Perms;

                if ("org" in jsonbody)
                {
                    let Organisation: Buffer = Buffer.from(jsonbody["org"], "base64");
                    Perms = await psoDB.GetPermissionsByOrgUUIDAndUserID(Organisation, userid);
                }
                else if ("project" in jsonbody)
                {
                    let project: Buffer = Buffer.from(req.body.project, "base64");
                    //psoDB.GetPermissionsByProjectUUIDAndUserID
                    Perms = await psoDB.GetPermissionsByProjectUUIDAndUserID(project, userid, new Date());
                }

                if (Perms)
                {
                    // for(let machine of Perms)
                    // {
                    //     machine.fingerprint = machine.fingerprint.toString('base64');
                    // }

                    Perms = JSON.stringify(Perms);

                    res.status(200).send(Perms);//(`{ "permissions": ${Perms} }`);
                    return;
                }
                else
                {
                    res.sendStatus(403);
                    return;
                }
            }

            res.sendStatus(400);
        }
    );

    app.post('/api/pco/new/', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            // Split JSON

            let jsonbody: JSON = req.body;
            if ("project" in jsonbody && "machine" in jsonbody && "version" in jsonbody && "data" in jsonbody && "shadertype" in jsonbody)
            {
                if (ShaderKeyTypes.indexOf(jsonbody["shadertype"].toLowerCase()) >= 0)
                {
                    // We have everything we *need*
                    let projectuuid: Buffer = Buffer.from(jsonbody["project"], 'base64');
                    let machineuuid: Buffer = Buffer.from(jsonbody["machine"], 'base64');
                    let version: string = jsonbody["version"];
                    let data: Buffer = Buffer.from(jsonbody["data"], 'base64');
                    let platform: string = "";
                    let shaderModel: string = "";
                    let extag: string = "";

                    if ("platform" in jsonbody)
                    {
                        platform = jsonbody["platform"];
                    }

                    if ("shadermodel" in jsonbody)
                    {
                        shaderModel = jsonbody["shadermodel"];
                    }

                    if ("tag" in jsonbody)
                    {
                        extag = jsonbody["tag"];
                    }    

                    let result: number = 1;
                    switch (jsonbody["shadertype"])
                    {
                        case "recorded":
                            result = await AddNewPSOToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, false, platform, shaderModel, extag);
                            break;
                        case "stable":
                            result = await AddNewPSOToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, true, platform, shaderModel, extag);
                            break;
                        case "projectshaderinfo":
                            result = await AddNewShaderInfoToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, false, platform, shaderModel, extag);
                            break;
                        case "globalshaderinfo":
                            result = await AddNewShaderInfoToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, true, platform, shaderModel, extag);
                            break;
                        default:
                            break;
                    }

                    HandleReturn(result, res);      
                    return;              
                }
                else
                {
                    res.status(400).send("{ \"code\": -1, \"reason\": \"Bad Request. ShaderType is not 'recorded', 'stable', 'projectshaderinfo', or 'globalshaderinfo'.\" }");
                }

               
            }
            else
            {
                res.status(400).send("{ \"code\": -1, \"reason\": \"Bad Request. Necessary fields do not exist in JSON. Please ensure 'project', 'machine', 'version', 'data', and 'shadertype' are present.\" }");
            }

        }
    );

    app.post('/api/pco/new/stab/p/:project/m/:machine/v/:version', bodyParser.raw({type: 'application/octet-stream', limit: '100mb' }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            AddNewPSOToProject(req,res,psoDB, true);
        }
    );

    app.post('/api/renewtoken', bodyParser.json({ limit: '99mb', strict: true }),
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            
            let jsonbody: JSON = req.body;
            let userid: number = await GetUserID(req, jsonbody, psoDB);

            if(userid)
            {
                let [result, token] = await psoDB.RenewUserToken(userid);

                if (result == 0)
                {
                    let tokenb64: string = token.toString('base64');

                    tokenb64 = JSON.stringify(tokenb64);

                    res.status(200).send(`{ "token": ${tokenb64} }`);
                    return;
                }
            }

            res.sendStatus(400);
        }
    );

    app.post('/api/pco/new/rec/p/:project/m/:machine/v/:version', bodyParser.raw({type: 'application/octet-stream', limit: '100mb' }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            AddNewPSOToProject(req,res,psoDB, false);
        }
    );


    const port = process.env.PORT || 3000;

    app.listen(port, () => console.log(`[INFO] Launching on port ${port}`));

    console.log("[INFO] Mirage Online");
}

entry();