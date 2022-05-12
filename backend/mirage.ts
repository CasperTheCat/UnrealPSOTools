import express from "express";
import { fileURLToPath } from 'url';
import path,{ dirname } from 'path';
import {getBoardsForUser, getUserInfo, getAllPCOsForUser, getAllPCOs} from "./apidecl.js";
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


    // app.get('/login',
    //     (req, res) => 
    //     {
    //         res.sendFile(path.resolve(__dirname, '../', 'public', 'login.html'));
    //     }
    // );

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

    app.post('/signup', bodyParser.urlencoded({extended: false}),
    (req, res) => 
    {
        InsertNewUserToDB(psoDB, req, res);
    }
    );

    // Declare API
    app.get('/api', (req, res) => 
    {
        // Return something?
    });

    app.get("/api/pco/all", async (req, res) => 
    {
        getAllPCOsForUser(req, res, psoDB);
        //getAllPCOs(req, res, psoDB);
    });

    app.get("/api/pco/all/token/:token", async (req, res) => 
    {
        getAllPCOsForUser(req, res, psoDB);
        //getAllPCOs(req, res, psoDB);
    });


    app.get('/api/user', ensureLoggedIn(), async (req, res) => 
    {
        getUserInfo(req, res, psoDB);
    });

    app.get('/api/machine', ensureLoggedIn(),  (req, res) => 
        {
            getBoardsForUser(req, res, psoDB);
        } 
    );

    app.post('/api/pco/new/v/:version/m/:machine', bodyParser.raw({type: 'application/octet-stream', limit: '100mb' }),// ensureLoggedIn(), 
        async (req, res) => 
        {
            try
            {
                let version: string = req.params.version;
                let machine: Buffer = Buffer.from(req.params.machine, 'hex');

                console.log(machine);
                //psoDB.AddMachine(1, "temp", machine);

                // Take Data, hash it, and insert
                // TODO: Try to parse it
                // HCACEPIP

                // Assert
                let short = req.body.subarray(0,8);

                if (short.equals(Buffer.from("HCACEPIP")))
                {
                    let hash = await HashOfBuffer(req.body);

                    let datenow = new Date();//.toISOString()

                    // Check Machine Exists
                    let DoesMachineExist = await psoDB.GetMachinesByFingerprint(machine);
                    let vInts = StringToVersion(version);

                    // Double Check
                    let DoesHashExist = await psoDB.GetPipelineCacheDataByHashShort(hash);
                    if(DoesHashExist)
                    {
                        DoesHashExist = await psoDB.GetPipelineCacheByHashVersionShort(hash, vInts[0], vInts[1], vInts[2], vInts[3]);
                    }
                    

                    if (DoesMachineExist && !DoesHashExist)
                    {
                        await psoDB.AddPSO(hash, req.body, datenow, machine, version); 
                    }
                    else
                    {
                        console.log(`Machine: ${DoesMachineExist}, Hash: ${DoesHashExist}`);
                    }


       
    
                    res.sendStatus(200);//.send(JSON.stringify(results));
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
    );


    const port = process.env.PORT || 3000;

    app.listen(port, () => console.log(`[INFO] Launching on port ${port}`));

    console.log("[INFO] Mirage Online");
}

entry();