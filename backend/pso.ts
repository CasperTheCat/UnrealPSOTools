import express from "express";
import { fileURLToPath } from 'url';
import path,{ dirname } from 'path';
import {AddNewShaderInfoToProjectByUUIDs, AddNewPSOToProjectByUUIDs, AddNewPSOToProject, ListMachinesByOrg, ListMachinesByProject, getMachinesForOwner, getUserInfo, getAllPCOsForUser, getAllPCOs} from "./apidecl.js";
import { PipelineShaderObjectDB } from './db.js';
import { ShaderKeyTypes, HashOfBuffer, StringToVersion } from './helpers.js';
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

    const pgo: connectPgSimple.PGStoreOptions = {
        pgPromise: psoDB.pgdb,
        tableName: 'session'
      };

    const o = connectPgSimple(session);

    app.use(session({
        store: new o(pgo),
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
                let ProjectUUID: Buffer = Buffer.from(jsonbody["project"], 'hex');
                let MachineUUID: Buffer = Buffer.from(jsonbody["machine"], 'hex');
                let Version: string = jsonbody["version"];
                let platform: string = "";
                let shaderModel: string = "";

                if ("platform" in jsonbody)
                {
                    platform = jsonbody["platform"];
                }

                if ("shadermodel" in jsonbody)
                {
                    shaderModel = jsonbody["shadermodel"];
                }                

                let vInt = StringToVersion(Version);

                let PCOData;
                
                if (platform.length > 0 && shaderModel.length > 0)
                {
                    PCOData = await psoDB.GetCacheDataAfterVersion_ValidatedByMachinePlatformModel(ProjectUUID, MachineUUID, vInt[0], vInt[1], vInt[2], vInt[3], new Date(), platform, shaderModel);
                }
                else
                {
                    PCOData = await psoDB.GetCacheDataAfterVersion_ValidatedByMachine(ProjectUUID, MachineUUID, vInt[0], vInt[1], vInt[2], vInt[3], new Date());
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
            //console.log(jsonbody);
            if ("project" in jsonbody && "machine" in jsonbody && "date" in jsonbody)
            {
                let ProjectUUID: Buffer = Buffer.from(jsonbody["project"], 'hex');
                let MachineUUID: Buffer = Buffer.from(jsonbody["machine"], 'hex');
                let AfterDate: Date = new Date(jsonbody["date"]);
                let platform: string = "";
                let shaderModel: string = "";

                if ("platform" in jsonbody)
                {
                    platform = jsonbody["platform"];
                }

                if ("shadermodel" in jsonbody)
                {
                    shaderModel = jsonbody["shadermodel"];
                }                

                let PCOData;
                
                if (platform.length > 0 && shaderModel.length > 0)
                {
                    PCOData = await psoDB.GetCacheDataAfterDate_ValidatedByMachinePlatformModel(ProjectUUID, AfterDate, MachineUUID, new Date(), platform, shaderModel);
                }
                else
                {
                    PCOData = await psoDB.GetCacheDataAfterDate_ValidatedByMachine(ProjectUUID, AfterDate, MachineUUID, new Date());
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


    // app.get('/api/user', ensureLoggedIn(), async (req, res) => 
    // {
    //     getUserInfo(req, res, psoDB);
    // });

    // app.get('/api/machine', ensureLoggedIn(),  (req, res) => 
    //     {
    //         getMachinesForOwner(req, res, psoDB);
    //     } 
    // );

    app.post('/api/pco/new/', bodyParser.json({ limit: '99mb', strict: true }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            // Okay, we have no idea what type of shader we're been passed
            // Split JSON
            let jsonbody: JSON = req.body;
            //console.log(jsonbody);
            if ("project" in jsonbody && "machine" in jsonbody && "version" in jsonbody && "data" in jsonbody && "shadertype" in jsonbody)
            {
                if (ShaderKeyTypes.indexOf(jsonbody["shadertype"].toLowerCase()) >= 0)
                {
                    // We have everything we *need*
                    let projectuuid: Buffer = Buffer.from(jsonbody["project"], 'hex');
                    let machineuuid: Buffer = Buffer.from(jsonbody["machine"], 'hex');
                    let version: string = jsonbody["version"];
                    let data: Buffer = Buffer.from(jsonbody["data"], 'base64');
                    let platform: string = "";
                    let shaderModel: string = "";

                    if ("platform" in jsonbody)
                    {
                        platform = jsonbody["platform"];
                    }

                    if ("shadermodel" in jsonbody)
                    {
                        shaderModel = jsonbody["shadermodel"];
                    }

                    let result: number = 1;
                    switch (jsonbody["shadertype"])
                    {
                        case "recorded":
                            result = await AddNewPSOToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, false, platform, shaderModel);
                            break;
                        case "stable":
                            result = await AddNewPSOToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, true, platform, shaderModel);
                            break;
                        case "projectshaderinfo":
                            result = await AddNewShaderInfoToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, false, platform, shaderModel);
                            break;
                        case "globalshaderinfo":
                            result = await AddNewShaderInfoToProjectByUUIDs(psoDB, projectuuid, machineuuid, version, data, true, platform, shaderModel);
                            break;
                        default:
                            break;
                    }

                    switch(result)
                    {
                        case 0:
                            res.sendStatus(200);
                            break;
                        case -1:
                            res.status(400).send("{ \"code\": -1, \"reason\": \"Bad Machine or Project\" }");
                            break;
                        case -2:
                            res.status(403).send("{ \"code\": -2, \"reason\": \"Permission Error\" }");
                            break;
                        case -11:
                            res.status(400).send("{ \"code\": -11, \"reason\": \"Bad Data\" }");
                            break;
                        default:
                            res.status(500).send("{ \"code\": 0, \"reason\": \"Server Error\" }");
                            break;
                    }
                    
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