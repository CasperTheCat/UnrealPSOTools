import express from "express";
import { fileURLToPath } from 'url';
import path,{ dirname } from 'path';
import {AddNewPSOToProject, ListMachinesByOrg, ListMachinesByProject, getMachinesForOwner, getUserInfo, getAllPCOsForUser, getAllPCOs} from "./apidecl.js";
import { PipelineShaderObjectDB } from './db.js';
import { HashOfBuffer, StringToVersion } from './helpers.js';
import passport from "passport";
import {ensureLoggedIn} from 'connect-ensure-login';
import {InsertNewUserToDB} from "./auth.js";
import bodyParser from 'body-parser';
import session from 'express-session';
import { readFile } from "fs/promises";
import {InitDB} from "./init/db.js";
import {InitAuthStrat} from "./init/auth.js";
import {TagArrayToString} from "./tagHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function entry()
{
    const app = express();

    // Init

    let psoDB: PipelineShaderObjectDB = new PipelineShaderObjectDB();


    app.use(session({ secret: ['testkey', 'keyboard cat'] }));
    app.use(passport.initialize());
    app.use(passport.session());

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

    app.post("/api/pco/date/after/p/:project/m/:machine", bodyParser.json({ limit: '100mb', strict: true }), async (req, res) => 
    {
        try
        {
            let ProjectUUID = Buffer.from(req.params.project, 'hex');
            let MachineUUID = Buffer.from(req.params.machine, 'hex');
            let resarray: string[] = req.body;
            console.log(resarray);
            if ("date" in resarray)
            {
                let AfterDate: Date = new Date(resarray["date"]);
                console.log(AfterDate);

                let PCOData = await psoDB.GetCacheDataAfterDate_ValidatedByMachine(ProjectUUID, AfterDate, MachineUUID, new Date());

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