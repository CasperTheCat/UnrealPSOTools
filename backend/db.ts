// import {Pool} from 'pg';

// export default new Pool ({
//     // We should load the connection string from a file or from the environment.
//     max: 20,
//     connectionString: 'postgres://user@pass@host:port/dbname',
//     idleTimeoutMillis: 30000
// });
import crypto from "crypto";
import type path from "path";
import pgPromise from "pg-promise";
import pkg from 'pg-promise';
import { StringToVersion } from "./helpers.js";
const { PreparedStatement } = pkg;

// Declare PG
const config = {
    user: process.env.PGUSER || "psoowner",
    password: process.env.PGPASS || "postgres",
    host: process.env.PGHOST || "localhost",
    port: parseInt( process.env.PGPORT || "5432", 10 ),
    database: process.env.PGDATABASE || "pipelinecache"
};

class PipelineShaderObjectDB 
{
    pgdb;
    PSGetAuthByUsername = new PreparedStatement(
        {
            name: "PSGetAuthByUsername",
            text: "SELECT * FROM auth WHERE username = $1"
        }
    );

    PSGetAuthByToken = new PreparedStatement(
        {
            name: "PSGetAuthByToken",
            text: "SELECT users.* FROM users, auth WHERE users.userid = auth.userid AND $1 = ANY(auth.tokens)"
        }
    );

    // PSGetAuthByUID = new PreparedStatement(
    //     {
    //         name: "PSGetAuthByUID",
    //         text: "SELECT * FROM auth WHERE userid = $1"
    //     }
    // );

    // PSGetUserByUsername = new PreparedStatement(
    //     {
    //         name: "PSGetUserByUsername",
    //         text: "SELECT users.* FROM users, auth WHERE users.userid = auth.userid AND auth.username = $1"
    //     }
    // );

    // PSGetUserByUID = new PreparedStatement(
    //     {
    //         name: "PSGetUserByUID",
    //         text: "SELECT * FROM users WHERE userid = $1"
    //     }
    // );

    // PSGetMachineReferencesByUID = new PreparedStatement(
    //     {
    //         name: "PSGetMachineReferencesByUID",
    //         text: "SELECT * FROM user_machine WHERE ownerid = $1"
    //     }
    // );

    // PSGetMachinesByUID = new PreparedStatement(
    //     {
    //         name: "PSGetMachinesByUID",
    //         text: "SELECT machines.machineid, machines.machinename FROM machines, user_machine WHERE machines.machineid = user_machine.machineid AND user_machine.ownerid = $1"
    //     }
    // );

    PSGetMachinesByPrint = new PreparedStatement(
        {
            name: "PSGetMachinesByPrint",
            text: "SELECT machines.machineid, machines.machinename FROM machines WHERE machines.fingerprint = $1"
        }
    );

    // PSGetBoardByBID = new PreparedStatement(
    //     {
    //         name: "PSGetBoardByBID",
    //         text: "SELECT * FROM machines WHERE machineid = $1"
    //     }
    // );

    // PSGetPipelineCachesInBoard = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCachesInBoard",
    //         text: "SELECT * FROM boardcontents WHERE machineid = $1"
    //     }
    // );

    PSGetPipelineDataByToken = new PreparedStatement(
        {
            name: "PSGetPipelineDataByToken",
            text: "SELECT pipelinecachedata.pipelinecachedata, pipelinecaches.* FROM pipelinecachedata, pipelinecaches, machines, user_machine, auth, users \
            WHERE \
              pipelinecachedata.hash = pipelinecaches.hash AND \
              pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) AND \
              user_machine.machineid = machines.machineid AND \
              auth.userid = user_machine.ownerid AND \
              users.permissionlevelread = true AND \
              auth.userid = users.userid AND \
              $1 = ANY(auth.tokens)"
        }
    );

    // PSGetAllPipelinesForUID = new PreparedStatement(
    //     {
    //         name: "PSGetAllPipelinesForUID",
    //         //text: "SELECT * FROM boardcontents WHERE machineid = $1"
    //         text: "SELECT pipelinecaches.* FROM pipelinecaches, machines, user_machine WHERE pipelinecaches.pipelinecacheid == ANY(machines.pipelinecacheids) AND machines.machineid = user_machine.machineid AND user_machine.ownerid = $1"
    //     }
    // );

    PSGetPipelineCacheByHash = new PreparedStatement(
        {
            name: "PSGetPipelineCacheByHash",
            text: "SELECT * FROM pipelinecaches WHERE hash = $1"
        }
    );

    PSGetPipelineCacheDataByHash = new PreparedStatement(
        {
            name: "PSGetPipelineCacheDataByHash",
            text: "SELECT * FROM pipelinecachedata WHERE hash = $1"
        }
    );

    PSGetPipelineCacheDataByHashShort = new PreparedStatement(
        {
            name: "PSGetPipelineCacheDataByHashShort",
            text: "SELECT hash FROM pipelinecachedata WHERE hash = $1"
        }
    );

    // PSGetPipelineCacheByHashShort = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheByHashShort",
    //         text: "SELECT pipelinecacheid, datetime FROM pipelinecaches WHERE hash = $1"
    //     }
    // );

    PSGetPipelineCacheByHashVersionShort = new PreparedStatement(
        {
            name: "PSGetPipelineCacheByHashVersionShort",
            text: "SELECT pipelinecacheid, datetime FROM pipelinecaches WHERE hash = $1 AND versionMajor = $2 AND versionMinor = $3 AND versionRevision = $4 AND versionBuild = $5"
        }
    );

    // PSGetPipelineCachePathByHash = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCachePathByHash",
    //         text: "SELECT path FROM pipelinecaches WHERE normalhash = $1"
    //     }
    // );

    // PSGetPipelineCacheTagsByHash = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheTagsByHash",
    //         text: "SELECT tags FROM pipelinecaches WHERE normalhash = $1"
    //     }
    // );

    // PSGetPipelineCacheByTag = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheByTag",
    //         text: "SELECT * FROM pipelinecaches WHERE live = true AND tags @@ $1::tsquery"
    //     }
    // );

    // PSGetPipelineCacheByTagShort = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheByTagShort",
    //         text: "SELECT height, width, normalhash FROM pipelinecaches WHERE live = true AND tags @@ $1::tsquery"
    //     }
    // );

    // PSUpdatePipelineCacheLocationByID = new PreparedStatement(
    //     {
    //         name: "PSUpdatePipelineCacheLocationByID",
    //         text: "UPDATE pipelinecaches SET path = $2::text, live = true::boolean WHERE pipelinecacheid = $1"
    //     }
    // );

    // // PSDeleteTag = new PreparedStatement(
    // //     {
    // //         name: "PSDeleteTag",
    // //         text: "UPDATE pipelinecaches SET tags = ts_delete(tags::tsvector, $2::text) WHERE tags @@ $1::tsquery"
    // //     }
    // // );

    // PSDeleteTag = new PreparedStatement(
    //     {
    //         name: "PSDeleteTag",
    //         text: "UPDATE pipelinecaches SET tags = array_to_tsvector(array_remove(tsvector_to_array(tags), $2::text)) WHERE tags @@ $1::tsquery"
    //     }
    // );
    
    // // PSRenameTag = new PreparedStatement(
    // //     {
    // //         name: "PSRenameTag",
    // //         text: "UPDATE pipelinecaches SET tags = tsvector_concat(ts_delete(tags, $3::text), $2) WHERE tags @@ $1::tsquery"
    // //     }
    // // );
    // PSRenameTag = new PreparedStatement(
    //     {
    //         name: "PSRenameTag",
    //         text: "UPDATE pipelinecaches SET tags = array_to_tsvector(array_append(array_remove(tsvector_to_array(tags), $3::text), $2::text)) WHERE tags @@ $1::tsquery"
    //     }
    // );
    // // PSRenameTag = new PreparedStatement(
    // //     {
    // //         name: "PSRenameTag",
    // //         text: "UPDATE pipelinecaches SET tags = tsvector_concat(array_to_tsvector(array_remove(tsvector_to_array(tags), $3::text)), $2::tsvector) WHERE tags @@ $1::tsquery"
    // //     }
    // // );    

    // PSAppendTag = new PreparedStatement(
    //     {
    //         name: "PSAppendTag",
    //         text: "UPDATE pipelinecaches SET tags = array_to_tsvector(array_append(tsvector_to_array(tags), $2::text)) WHERE tags @@ $1::tsquery"
    //     }
    // );   
    // // PSAppendTag = new PreparedStatement(
    // //     {
    // //         name: "PSAppendTag",
    // //         text: "UPDATE pipelinecaches SET tags = tsvector_concat(tags, $2::tsvector) WHERE tags @@ $1::tsquery"
    // //     }
    // // );   
    
    PSAddPipelineCacheToBoard = new PreparedStatement(
        {
            name: "PSAddPipelineCacheToBoard",
            text: "UPDATE machines \
                SET pipelinecacheids = array_append(machines.pipelinecacheids, pipelinecaches.pipelinecacheid) \
                FROM pipelinecaches \
                    WHERE pipelinecaches.pipelinecacheid = $2 \
                    AND NOT pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) \
                    AND machines.fingerprint = $1"
        }
    );  

    // PSRemovePipelineCacheFromBoard = new PreparedStatement(
    //     {
    //         name: "PSRemovePipelineCacheFromBoard",
    //         text: "UPDATE machines \
    //             SET pipelinecacheids = array_remove(machines.pipelinecacheids, pipelinecaches.pipelinecacheid) \
    //             FROM pipelinecaches \
    //                 WHERE pipelinecaches.normalhash = $2 \
    //                 AND pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) \
    //                 AND machines.machineid = $1"
    //     }
    // );  


    // PSUpdatePipelineCacheTagsByID = new PreparedStatement(
    //     {
    //         name: "PSUpdatePipelineCacheTagsByID",
    //         text: "UPDATE pipelinecaches SET tags = $2::tsvector WHERE pipelinecacheid = $1"
    //     }
    // );

    // PSUpdatePipelineCacheTagsByHash = new PreparedStatement(
    //     {
    //         name: "PSUpdatePipelineCacheTagsByHash",
    //         text: "UPDATE pipelinecaches SET tags = $2::tsvector WHERE normalhash = $1"
    //     }
    // );

    // PSGetAllPipelineCaches = new PreparedStatement(
    //     {
    //         name: "PSGetAllPipelineCaches",
    //         text: "SELECT * FROM pipelinecaches"
    //     }
    // );

    // PSGetAllPipelineCachesShort = new PreparedStatement(
    //     {
    //         name: "PSGetAllPipelineCachesShort",
    //         text: "SELECT hash FROM pipelinecaches"
    //     }
    // );

    // PSGetAllPipelineCachesMark = new PreparedStatement(
    //     {
    //         name: "PSGetAllPipelineCachesMark",
    //         text: "SELECT pipelinecacheid, path FROM pipelinecaches WHERE live = true"
    //     }
    // );

    // PSMarkPipelineCacheDeletedByID = new PreparedStatement(
    //     {
    //         name: "PSMarkPipelineCacheDeletedByID",
    //         text: "UPDATE pipelinecaches SET live = false::boolean WHERE pipelinecacheid = $1"
    //     }
    // );

    // PSMarkPipelineCacheDeletedByHash = new PreparedStatement(
    //     {
    //         name: "PSMarkPipelineCacheDeletedByHash",
    //         text: "UPDATE pipelinecaches SET live = false::boolean WHERE normalhash = $1"
    //     }
    // );

    // PSMarkPipelineCacheLiveByID = new PreparedStatement(
    //     {
    //         name: "PSMarkPipelineCacheLiveByID",
    //         text: "UPDATE pipelinecaches SET live = true::boolean WHERE pipelinecacheid = $1"
    //     }
    // );

    // PSMarkPipelineCacheLiveByHash = new PreparedStatement(
    //     {
    //         name: "PSMarkPipelineCacheLiveByHash",
    //         text: "UPDATE pipelinecaches SET live = true::boolean WHERE normalhash = $1"
    //     }
    // );

    // //select * from pipelinecaches where cast(normalhash as text) LIKE '_x{}%';
    // // TODO: This needs to handle getting pipelinecaches and returning many from this
    // PSGetPipelineCachesByBoard = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCachesByBoard",
    //         text: "SELECT pipelinecaches.* FROM pipelinecaches, machines WHERE pipelinecaches.live = true AND pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) AND machines.machineid = $1"
    //     }
    // );

    // PSGetPipelineCachesByBoardShort = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCachesByBoardShort",
    //         text: "SELECT pipelinecaches.width, pipelinecaches.height, pipelinecaches.normalhash FROM pipelinecaches, machines WHERE pipelinecaches.live = true AND pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) AND machines.machineid = $1"
    //     }
    // );

    // PSGetPipelineCachesByBoardSearchShort = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCachesByBoardSearchShort",
    //         text: "SELECT pipelinecaches.width, pipelinecaches.height, pipelinecaches.normalhash FROM pipelinecaches, machines WHERE pipelinecaches.live = true AND pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) AND pipelinecaches.tags @@ $1::tsquery AND machines.machineid = $2"
    //     }
    // );

    // PSGetPipelineCacheCount = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheCount",
    //         text: "SELECT COUNT(pipelinecacheid) FROM pipelinecaches WHERE live = true"
    //     }
    // );

    // PSGetPipelineCacheCountByTag = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheCountByTag",
    //         text: "SELECT COUNT(pipelinecacheid) FROM pipelinecaches WHERE live = true AND tags @@ $1::tsquery"
    //     }
    // );

    // PSGetUntaggedPipelineCaches = new PreparedStatement(
    //     {
    //         name: "PSGetUntaggedPipelineCaches",
    //         text: "SELECT height, width, normalhash FROM pipelinecaches WHERE live = true AND tags = ''"
    //     }
    // );

    // PSGetTagList = new PreparedStatement(
    //     {
    //         name: "PSGetTagList",
    //         text: "SELECT array_agg(distinct(n)) FROM pipelinecaches, unnest(tsvector_to_array(tags)) as n WHERE live = true"
    //     }
    // );


    constructor()
    {
        try
        {
            this.pgdb = pgPromise()(config);
        }
        catch (Err)
        {
            console.log("DEAD");
            throw Err;
        }
    }

    async ClearDB()
    {
        try
        {
            console.log("[WARN] Clearing Database");
            await this.pgdb.query("DROP TABLE IF EXISTS users;");
            console.log("[WARN] Dropped Table 'users'");
            await this.pgdb.query("DROP TABLE IF EXISTS user_machine;");
            console.log("[WARN] Dropped Table 'user_machine'");
            await this.pgdb.query("DROP TABLE IF EXISTS machines");
            console.log("[WARN] Dropped Table 'machines'");
            await this.pgdb.query("DROP TABLE IF EXISTS auth;");
            console.log("[WARN] Dropped Table 'auth'");
            await this.pgdb.query("DROP TABLE IF EXISTS pipelinecache;");
            console.log("[WARN] Dropped Table 'pipelinecache'");
            await this.pgdb.query("DROP TABLE IF EXISTS pipelinecachedata;");
            console.log("[WARN] Dropped Table 'pipelinecachedata'");

        }
        catch (Err)
        {
            console.log("Failed to Clear Database");
            console.log(Err);
        }
        
    }

    async CheckDB()
    {        
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS auth \
        //     ( \
        //         userid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
        //         username TEXT UNIQUE, \
        //         password BYTEA, \
        //         salt BYTEA \
        //     ); \
        // ");
    }

    async InitialiseAuth()
    {        
        let res = await this.pgdb.query("CREATE TABLE IF NOT EXISTS auth \
            ( \
                userid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                username TEXT UNIQUE, \
                password BYTEA, \
                salt BYTEA, \
                tokens BYTEA ARRAY DEFAULT '{}' NOT NULL \
            ); \
        ");

        console.log(res);
    }

    async InitialiseUsers()
    {
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS users \
            ( \
                userid INT REFERENCES auth (userid) ON UPDATE CASCADE ON DELETE CASCADE, \
                displayname VARCHAR, \
                permissionLevelRead BOOLEAN, \
                permissionLevelWrite BOOLEAN, \
                CONSTRAINT auth_user_key PRIMARY KEY (userid) \
            ); \
        ");
    }

    async InitialisePSOs()
    {
        await this.pgdb.query("\
        CREATE TABLE IF NOT EXISTS pipelinecaches \
        ( \
            pipelinecacheid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
            datetime TIMESTAMP, \
            versionMajor INT, \
            versionMinor INT, \
            versionRevision INT, \
            versionBuild INT, \
            hash BYTEA \
        ); \
        ");

        await this.pgdb.query("\
        CREATE TABLE IF NOT EXISTS pipelinecachedata \
        ( \
            pipelinecachedataid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
            hash BYTEA, \
            pipelinecachedata BYTEA \
        ); \
        ");
    }

    async InitialiseMachines()
    {        
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS machines \
            ( \
                machineid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                fingerprint BYTEA UNIQUE, \
                machinename VARCHAR, \
                pipelinecacheids INT ARRAY DEFAULT '{}' NOT NULL \
            ); \
        ");

        await this.pgdb.query("CREATE TABLE IF NOT EXISTS user_machine \
            ( \
                machineid INT REFERENCES machines (machineid) ON UPDATE CASCADE ON DELETE CASCADE, \
                ownerid INT REFERENCES auth (userid) ON UPDATE CASCADE, \
                CONSTRAINT user_machine_key PRIMARY KEY (machineid, ownerid)\
            ); \
        ");
    }

    async GetAuthByUsername(username: string)
    {
        return this.pgdb.oneOrNone(this.PSGetAuthByUsername, [username]);
    }

    async GetAuthByToken(token: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetAuthByToken, [token]);
    }

    async GetPipelineDataByToken(token: Buffer)
    {
        return this.pgdb.manyOrNone(this.PSGetPipelineDataByToken, [token]);
    }

    

    // async GetAuthByUID(uid: number)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetAuthByUID, [uid]);
    // }

    // async GetUserByUsername(username: string)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetUserByUsername, [username]);
    // }

    // async GetUserByUID(uid: number)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetUserByUID, [uid]);
    // }

    // async GetMachinesByUID(uid: number)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetMachinesByUID, [uid]);
    // }

    async GetMachinesByFingerprint(print: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetMachinesByPrint, [print]);
    }

    async GetPipelineCacheByHash(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetPipelineCacheByHash, [hash]);
    }

    // async GetPipelineCacheByHashShort(hash: Buffer)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetPipelineCacheByHashShort, [hash]);
    // }

    // async GetPipelineCachePathByHash(hash: Buffer)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetPipelineCachePathByHash, [hash]);
    // }

    // async GetPipelineCacheTagsByHash(hash: Buffer)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetPipelineCacheTagsByHash, [hash]);
    // }

    // async GetPipelineCacheByTag(tags: string)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetPipelineCacheByTag, [tags.toLowerCase()]);
    // }

    // async GetPipelineCacheByTagShort(tags: string)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetPipelineCacheByTagShort, [tags.toLowerCase()]);
    // }

    // async GetAllPipelineCaches()
    // {
    //     return this.pgdb.manyOrNone(this.PSGetAllPipelineCaches, []);
    // }

    // async GetAllPipelineCachesShort()
    // {
    //     return this.pgdb.manyOrNone(this.PSGetAllPipelineCachesShort, []);
    // }

    async GetPipelineCacheDataByHash(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetPipelineCacheDataByHash, [hash]);
    }

    async GetPipelineCacheDataByHashShort(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetPipelineCacheDataByHashShort, [hash]);
    }

    // async GetAllPipelineCachesMark()
    // {
    //     return this.pgdb.manyOrNone(this.PSGetAllPipelineCachesMark, []);
    // }

    // async UpdatePipelineCacheLocationByID(identifier: number, relPath: string)
    // {
    //     return this.pgdb.none(this.PSUpdatePipelineCacheLocationByID, [identifier, relPath]);
    // }

    // async UpdatePipelineCacheTagsByID(identifier: number, tags: string)
    // {
    //     return this.pgdb.none(this.PSUpdatePipelineCacheTagsByID, [identifier, tags]);
    // }

    // async UpdatePipelineCacheTagsByHash(hash: Buffer, tags: string)
    // {
    //     return this.pgdb.none(this.PSUpdatePipelineCacheTagsByHash, [hash, tags]);
    // }

    // async DeleteTag(tags: string)
    // {
    //     return this.pgdb.oneOrNone(this.PSDeleteTag, [`'${tags}'`, tags]);
    // }

    async GetPipelineCacheByHashVersionShort(hash: Buffer, vMaj: number, vMin: number, vRev:number, vBuild:number)
    {
        return this.pgdb.manyOrNone(this.PSGetPipelineCacheByHashVersionShort, [hash, vMaj, vMin, vRev, vBuild]);
    }

    // async RenameTag(oldTag: string, newTag: string)
    // {
    //     return this.pgdb.none(this.PSRenameTag, [`'${oldTag}'`, newTag, oldTag]);
    // }   

    // async AppendTag(query: string, newTag: string)
    // {
    //     return this.pgdb.oneOrNone(this.PSAppendTag, [query, newTag]);
    // }   

    // async GetPipelineCachesByBoard(boarduid: number)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetPipelineCachesByBoard, [boarduid]);
    // }

    // async GetPipelineCachesByUID(uid: number)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetAllPipelinesForUID, [uid]);
    // }

    // async GetPipelineCachesByBoardShort(boarduid: number)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetPipelineCachesByBoardShort, [boarduid]);
    // }

    // async GetPipelineCachesByBoardSearchShort(boarduid: number, search: string)
    // {
    //     return this.pgdb.manyOrNone(this.PSGetPipelineCachesByBoardSearchShort, [boarduid, search]);
    // }

    async AddPipelineCacheToBoard(macid: Buffer, pipeid: number)
    {
        return this.pgdb.none(this.PSAddPipelineCacheToBoard, [macid, pipeid]);
    }

    // async RemovePipelineCacheToBoard(boarduid: number, hash: Buffer)
    // {
    //     return this.pgdb.none(this.PSRemovePipelineCacheFromBoard, [boarduid, hash]);
    // }
    
    // async MarkPipelineCacheDeleted(pipelinecacheid:number)
    // {
    //     return this.pgdb.none(this.PSMarkPipelineCacheDeletedByID, [pipelinecacheid]);
    // }

    // async MarkPipelineCacheDeletedHash(hash: Buffer)
    // {
    //     return this.pgdb.none(this.PSMarkPipelineCacheDeletedByHash, [hash]);
    // }

    // async MarkPipelineCacheLive(pipelinecacheid:number)
    // {
    //     return this.pgdb.none(this.PSMarkPipelineCacheLiveByID, [pipelinecacheid]);
    // }

    // async MarkPipelineCacheLiveHash(hash: Buffer)
    // {
    //     return this.pgdb.none(this.PSMarkPipelineCacheLiveByHash, [hash]);
    // }

    // async GetPipelineCacheCount()
    // {
    //     return this.pgdb.one(this.PSGetPipelineCacheCount, []);
    // }

    // async GetPipelineCacheCountByTag(tag: string)
    // {
    //     return this.pgdb.one(this.PSGetPipelineCacheCountByTag, [tag]);
    // }
    
    
    // async GetUntaggedPipelineCaches()
    // {
    //     return this.pgdb.manyOrNone(this.PSGetUntaggedPipelineCaches, []);
    // }

    // async GetTagList()
    // {
    //     return this.pgdb.manyOrNone(this.PSGetTagList, []);
    // }

    async AddPSO(hash: Buffer, pso: Buffer, date: Date, machine: Buffer, version: string)
    {
        console.log(hash);
        console.log(version);

        try
        {
            let vInt = StringToVersion(version);

            let res = await this.pgdb.one("INSERT INTO pipelinecaches (datetime, versionMajor, versionMinor, versionRevision, versionBuild, hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING pipelinecacheid;", [
                date,
                vInt[0],
                vInt[1],
                vInt[2],
                vInt[3],
                hash
            ]
            );

            // Check if data exists
            let DoesDataForHashExist = await this.GetPipelineCacheDataByHashShort(hash);
            if(!DoesDataForHashExist)
            {
                // Make it, it's a new hash
                let res2 = await this.pgdb.one("INSERT INTO pipelinecachedata (hash, pipelinecachedata) VALUES ($1, $2) RETURNING pipelinecachedataid;", [
                    hash,
                    pso
                ]
                );

                console.log(`Added Data ${res2["pipelinecachedataid"]}`)
            }            

            console.log(`Added ${res["pipelinecacheid"]}`)

            // Pump
            this.AddPipelineCacheToBoard(machine, res["pipelinecacheid"]);

          

            return true;
        }
        catch (Exception)
        {
            console.log(Exception);
            return false;
        }
    }

    async AddPipelineCache(hash: Buffer, perceptualHash: Buffer, width: number, height: number, loadPath: string, tags: string)
    {
        console.log(hash);
        try
        {
            let res = await this.pgdb.one("INSERT INTO pipelinecaches (normalHash, perceptualHash, width, height, path, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING pipelinecacheid;", [
                hash, 
                perceptualHash,
                width,
                height,
                loadPath,
                tags
            ]
            );
          

            return true;
        }
        catch (Exception)
        {
            console.log(Exception);
            return false;
        }
    }

    async AddMachine(userid:number, machinename: string, fingerprint: Buffer)
    {
        try
        {
            let res = await this.pgdb.one("INSERT INTO machines (fingerprint, machinename) VALUES ($1, $2) RETURNING machineid;", [
                fingerprint,
                machinename
            ]
            );

            let res2 = await this.pgdb.one("INSERT INTO user_machine (machineid, ownerid) VALUES ($1, $2) RETURNING machineid;", [
                res.machineid, 
                userid
            ]
            );         

            return true;
        }
        catch (Exception)
        {
            console.log(Exception);
            return false;
        }
    }


    async AddUser(username: string, salt, key, displayname: string = "", permRead: boolean = false, permWrite: boolean = true)
    {
        try
        {
            let res = await this.pgdb.one("INSERT INTO auth (username, password, salt, tokens) VALUES ($1, $2, $3, $4) RETURNING userid;", [
                username, 
                key,
                salt,
                crypto.randomBytes(32) 
            ]
            );

            // await this.pgdb.none("UPDATE auth SET tokens = ARRAY_APPEND(tokens, $2) WHERE auth.userid = $1", [
            //     res["userid"],
            //     token
            // ]
            // );

            let res2 = await this.pgdb.one("INSERT INTO users (userid, displayname, permissionLevelRead, permissionLevelWrite) VALUES ($1, $2, $3, $4) RETURNING displayname;", [
                res.userid, 
                displayname,
                permRead,
                permWrite
            ]
            );

            return true;
        }
        catch (Exception)
        {
            console.log(Exception);
            return false;
        }
    }


};

export {PipelineShaderObjectDB};