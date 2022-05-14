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

    PSGetProjectIDByUUID = new PreparedStatement(
        {
            name: "PSGetProjectIDByUUID",
            text: "SELECT projects.projectid FROM projects WHERE projects.uuid = $1"
        }
    );

    PSGetOrgIDByUUID = new PreparedStatement(
        {
            name: "PSGetOrgIDByUUID",
            text: "SELECT organisations.orgid FROM organisations WHERE organisations.uuid = $1"
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
    
    PSGetPermissionsByOrgAndUserIDs = new PreparedStatement(
        {
            name: "PSGetPermissionsByOrgAndUserIDs",
            text: "SELECT *\
            FROM organisation_user_perms \
            WHERE \
                organisation_user_perms.orgid = $1 AND \
                organisation_user_perms.userid = $2 \
            "
        }
    );

    PSGetPermissionsByOrgUUIDAndUserID = new PreparedStatement(
        {
            name: "PSGetPermissionsByOrgUUIDAndUserID",
            text: "SELECT organisation_user_perms.* \
            FROM organisations, organisation_user_perms \
            WHERE \
                organisations.uuid = $1 AND \
                organisation_user_perms.orgid = organisations.orgid AND \
                organisation_user_perms.userid = $2 \
            "
        }
    );

    PSGetPermissionsByProjectUUIDAndUserID = new PreparedStatement(
        {
            name: "PSGetPermissionsByProjectUUIDAndUserID",
            text: "SELECT project_user_perms.* \
            FROM projects, project_user_perms \
            WHERE \
                projects.uuid = $1 AND \
                projects.projectid = project_user_perms.projectid AND \
                project_user_perms.userid = $2 AND \
                project_user_perms.validfrom < $3 AND \
                project_user_perms.validuntil > $3 \
            "
        }
    );

    PSGetMachinesByProjectUUID_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSGetMachinesByProjectUUID_ValidatedByUserID",
            text: "SELECT \
                machines.machineid, machines.machinename, machines.fingerprint \
            FROM \
                machines, projects, project_user_perms, project_machine_perms, organisation_user_perms \
            WHERE \
                machines.machineid = project_machine_perms.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                (\
                    (\
                        projects.projectid = project_user_perms.projectid AND \
                        project_user_perms.userid = $2 AND \
                        project_user_perms.validfrom < $3 AND \
                        project_user_perms.validuntil > $3 \
                    )\
                    OR \
                    (\
                        projects.orgid = organisation_user_perms.orgid AND \
                        organisation_user_perms.userid = $2 AND \
                        organisation_user_perms.permadminprojects = true\
                    )\
                )\
            "
        }
    );

    PSGetCacheDataAfterDate_ValidatedByMachine = new PreparedStatement(
        {
            name: "PSGetCacheDataAfterDate_ValidatedByMachine",
            text: "SELECT DISTINCT\
                pipelinecachedata.pipelinecachedata, \
                pipelinecaches.versionMajor, \
                pipelinecaches.versionMinor, \
                pipelinecaches.versionRevision, \
                pipelinecaches.versionBuild \
            FROM \
                pipelinecachedata, pipelinecaches, project_machine_perms, machines, projects \
            WHERE \
                pipelinecachedata.pipelinecachedataid = pipelinecaches.dataid AND \
                pipelinecaches.datetime > $2 AND \
                pipelinecaches.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $3 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $4 AND \
                project_machine_perms.validuntil > $4 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    PSGetMachinesByOrgID_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSGetMachinesByOrgID_ValidatedByUserID",
            text: "SELECT \
                machines.machineid, machines.machinename, machines.fingerprint \
            FROM \
                machines, organisations, organisation_user_perms \
            WHERE \
                machines.orgid = $1 AND \
                organisation_user_perms.orgid = $1 AND \
                organisation_user_perms.userid = $2 AND \
                organisation_user_perms.permadminmachines = true \
            "
        }
    );

    PSGetMachinesByOrgUUID_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSGetMachinesByOrgUUID_ValidatedByUserID",
            text: "SELECT \
                machines.machineid, machines.machinename, machines.fingerprint \
            FROM \
                machines, organisations, organisation_user_perms \
            WHERE \
                machines.orgid = organisation_user_perms.orgid AND \
                organisation_user_perms.orgid = organisations.orgid AND \
                organisations.uuid = $1 AND \
                organisation_user_perms.userid = $2 AND \
                organisation_user_perms.permadminmachines = true \
            "
        }
    );

    PSGetMachinesByPrint = new PreparedStatement(
        {
            name: "PSGetMachinesByPrint",
            text: "SELECT machines.machineid, machines.machinename FROM machines WHERE machines.fingerprint = $1"
        }
    );

    PSGetMachinePermissionsForProjectByUUIDs = new PreparedStatement(
        {
            name: "PSGetMachinePermissionsForProjectByUUIDs",
            text: "SELECT project_machine_perms.* \
            FROM \
                project_machine_perms, projects, machines \
            WHERE \
                project_machine_perms.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $2 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.validfrom < $3 AND \
                project_machine_perms.validuntil > $3 \
            "
        }
    );

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

    // PSGetPipelineCacheByHash = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheByHash",
    //         text: "SELECT * FROM pipelinecaches WHERE hash = $1"
    //     }
    // );

    PSGetPipelineCacheDataByHash = new PreparedStatement(
        {
            name: "PSGetPipelineCacheDataByHash",
            text: "SELECT * FROM pipelinecachedata WHERE hash = $1"
        }
    );

    PSGetPipelineCacheDataByHashShort = new PreparedStatement(
        {
            name: "PSGetPipelineCacheDataByHashShort",
            text: "SELECT pipelinecachedataid FROM pipelinecachedata WHERE hash = $1"
        }
    );

    // PSGetPipelineCacheByHashShort = new PreparedStatement(
    //     {
    //         name: "PSGetPipelineCacheByHashShort",
    //         text: "SELECT pipelinecacheid, datetime FROM pipelinecaches WHERE hash = $1"
    //     }
    // );

    PSGetPipelineCacheByHashVersionProjectShort = new PreparedStatement(
        {
            name: "PSGetPipelineCacheByHashVersionProjectShort",
            text: "SELECT pipelinecaches.pipelinecacheid, pipelinecaches.datetime \
            FROM \
                pipelinecaches, pipelinecachedata, projects \
            WHERE \
                pipelinecachedata.hash = $1 AND \
                pipelinecaches.dataid = pipelinecachedata.pipelinecachedataid AND \
                pipelinecaches.projectid = projects.projectid AND \
                projects.uuid = $2 AND \
                versionMajor = $3 AND \
                versionMinor = $4 AND \
                versionRevision = $5 AND \
                versionBuild = $6"
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

    // PSAddUserToOrganisation = new PreparedStatement(
    //     {
    //         name: "PSAddUserToOrganisation",
    //         text: "INSERT INTO org_user (orgid, userid) VALUES ($1, $2);"
    //     }
    // );  

    PSAddUserToOrganisationUserPerms = new PreparedStatement(
        {
            name: "PSAddUserToOrganisationUserPerms",
            text: "INSERT INTO organisation_user_perms (orgid, userid) VALUES ($1, $2);"
        }
    );  

    PSModifyOrgUserPermissions = new PreparedStatement(
        {
            name: "PSModifyOrgUserPermissions",
            text: "UPDATE organisation_user_perms \
            SET permAdminOrganisation = $3, \
                permAdminUsers = $4, \
                permCreateUser = $5, \
                permDeleteUser = $6, \
                permEditUser = $7, \
                permAdminMachines = $8, \
                permCreateMachines = $9, \
                permDeleteMachines = $10, \
                permEditMachines = $11, \
                permAdminProjects = $12, \
                permCreateProject = $13, \
                permDeleteProject = $14, \
                permEditProject = $15 \
            WHERE orgid = $1 AND userid = $2 \
            ;"
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
            console.log("[WARN] DBClear: Nuclear Option");
            await this.pgdb.query("drop table if exists projects_users cascade; \
                drop table if exists projects_machines cascade; \
                drop table if exists project_user_perms cascade; \
                drop table if exists project_machine_perms cascade; \
                drop table if exists pipelinecaches cascade; \
                drop table if exists pipelinecachedata cascade; \
                drop table if exists org_user cascade; \
                drop table if exists machines cascade; \
                drop table if exists machineprints cascade; \
                drop table if exists org_project cascade; \
                drop table if exists projects cascade; \
                drop table if exists organisation_user_perms cascade; \
                drop table if exists users cascade; \
                drop table if exists auth cascade; \
                drop table if exists organisations cascade; \
            ");
            // console.log("[WARN] Clearing Database");
            // await this.pgdb.query("DROP TABLE IF EXISTS organisations;");
            // console.log("[WARN] Dropped Table 'organisations'");
            // await this.pgdb.query("DROP TABLE IF EXISTS users;");
            // console.log("[WARN] Dropped Table 'users'");
            // await this.pgdb.query("DROP TABLE IF EXISTS user_machine;");
            // console.log("[WARN] Dropped Table 'user_machine'");
            // await this.pgdb.query("DROP TABLE IF EXISTS machines");
            // console.log("[WARN] Dropped Table 'machines'");
            // await this.pgdb.query("DROP TABLE IF EXISTS auth;");
            // console.log("[WARN] Dropped Table 'auth'");
            // await this.pgdb.query("DROP TABLE IF EXISTS pipelinecache;");
            // console.log("[WARN] Dropped Table 'pipelinecache'");
            // await this.pgdb.query("DROP TABLE IF EXISTS pipelinecachedata;");
            // console.log("[WARN] Dropped Table 'pipelinecachedata'");
            // await this.pgdb.query("DROP TABLE IF EXISTS projects;");
            // console.log("[WARN] Dropped Table 'projects'");
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
                CONSTRAINT auth_user_key PRIMARY KEY (userid) \
            ); \
        ");
    }

    async InitialiseOrganisations()
    {
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS organisations \
            ( \
                orgid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                uuid BYTEA UNIQUE, \
                displayname VARCHAR \
            ); \
        ");

        //machines INT ARRAY REFERENCES machines (machineid), \
        //projects INT ARRAY REFERENCES projects (projectid), \
    }

    async InitialiseOrganisationLinkTables()
    {
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS org_user \
        //     ( \
        //         orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
        //         userid INT REFERENCES users (userid) ON UPDATE CASCADE ON DELETE CASCADE, \
        //         CONSTRAINT org_user_key PRIMARY KEY (orgid, userid ) \
        //     ); \
        // ");

        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS org_machine \
        //     ( \
        //         orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
        //         machineid INT REFERENCES machines (machineid) ON UPDATE CASCADE ON DELETE CASCADE, \
        //         CONSTRAINT org_machine_key PRIMARY KEY (orgid, machineid)\
        //     ); \
        // ");

        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS org_project \
        //     ( \
        //         orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
        //         projectid INT REFERENCES projects (projectid) ON UPDATE CASCADE ON DELETE CASCADE, \
        //         CONSTRAINT org_project_key PRIMARY KEY (orgid, projectid)\
        //     ); \
        // ");

        await this.pgdb.query("CREATE TABLE IF NOT EXISTS organisation_user_perms \
            ( \
                orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
                userid INT REFERENCES users (userid) ON DELETE CASCADE, \
                permAdminOrganisation BOOLEAN DEFAULT false, \
                \
                permAdminUsers BOOLEAN DEFAULT false, \
                permCreateUser BOOLEAN DEFAULT false, \
                permDeleteUser BOOLEAN DEFAULT false, \
                permEditUser BOOLEAN DEFAULT false, \
                \
                permAdminMachines BOOLEAN DEFAULT false, \
                permCreateMachines BOOLEAN DEFAULT false, \
                permDeleteMachines BOOLEAN DEFAULT false, \
                permEditMachines BOOLEAN DEFAULT false, \
                \
                permAdminProjects BOOLEAN DEFAULT false, \
                permCreateProject BOOLEAN DEFAULT false, \
                permDeleteProject BOOLEAN DEFAULT false, \
                permEditProject BOOLEAN DEFAULT false, \
                \
                CONSTRAINT organisation_user_perms_key PRIMARY KEY (orgid, userid) \
            ); \
        ");
    }

    //permissionLevelRead BOOLEAN, \
    //permissionLevelWrite BOOLEAN, \

    async InitialiseProjects()
    {        
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS projects \
        //     ( \
        //         projectid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
        //         displayname VARCHAR, \
        //         uuid BYTEA \
        //     ); \
        // ");

        console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS projects")
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS projects \
            ( \
                projectid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE,\
                displayname VARCHAR, \
                uuid BYTEA UNIQUE \
            ); \
        ");

        // console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS projects_users")
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS projects_users \
        //     ( \
        //         projectid INT NOT NULL REFERENCES projects (projectid) ON DELETE CASCADE, \
        //         userid INT NOT NULL REFERENCES users (userid) ON DELETE CASCADE, \
        //         CONSTRAINT projects_users_key PRIMARY KEY (projectid, userid) \
        //     ); \
        // ");

        // console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS projects_machines")
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS projects_machines \
        //     ( \
        //         projectid INT NOT NULL REFERENCES projects (projectid) ON DELETE CASCADE, \
        //         machineid INT NOT NULL REFERENCES machines (machineid) ON DELETE CASCADE, \
        //         CONSTRAINT projects_machines_key PRIMARY KEY (projectid, machineid) \
        //     ); \
        // ");

        console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS project_user_perms")
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS project_user_perms \
            ( \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                userid INT REFERENCES users (userid) ON DELETE CASCADE, \
                validFrom TIMESTAMP, \
                validUntil TIMESTAMP, \
                CONSTRAINT project_user_perms_key PRIMARY KEY (projectid, userid) \
            );\
        ");

        console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS project_machine_perms")
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS project_machine_perms \
            ( \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                machineid INT REFERENCES machines (machineid) ON DELETE CASCADE, \
                validFrom TIMESTAMP, \
                validUntil TIMESTAMP, \
                permSubmitCaches BOOLEAN, \
                permPullCaches BOOLEAN, \
                CONSTRAINT project_machine_perms_key PRIMARY KEY (projectid, machineid) \
            );\
        ");
    }

    async InitialisePSOs()
    {
        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS pipelinecachedata \
            ( \
                pipelinecachedataid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                hash BYTEA, \
                pipelinecachedata BYTEA NOT NULL \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS pipelinecaches \
            ( \
                pipelinecacheid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                dataid INT REFERENCES pipelinecachedata (pipelinecachedataid) ON DELETE CASCADE, \
                datetime TIMESTAMP NOT NULL, \
                versionMajor INT NOT NULL, \
                versionMinor INT NOT NULL, \
                versionRevision INT NOT NULL, \
                versionBuild INT NOT NULL, \
                stable BOOLEAN DEFAULT false \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS stablekeyinfodata \
            ( \
                stablekeyinfodataid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                hash BYTEA, \
                stablekeyinfodata BYTEA NOT NULL \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS stablekeyinfo \
            ( \
                stablekeyinfoid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                dataid INT REFERENCES stablekeyinfodata (stablekeyinfodataid) ON DELETE CASCADE, \
                datetime TIMESTAMP NOT NULL, \
                versionMajor INT NOT NULL, \
                versionMinor INT NOT NULL, \
                versionRevision INT NOT NULL, \
                versionBuild INT NOT NULL, \
                globalkeys BOOLEAN DEFAULT false \
            );"
        );

    }

    async InitialiseMachines()
    {        
        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS machineprints \
        //     ( \
        //         machineprintid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
        //         fingerprint BYTEA UNIQUE \
        //     ); \
        // ");

        await this.pgdb.query("CREATE TABLE IF NOT EXISTS machines \
            ( \
                machineid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
                fingerprint BYTEA UNIQUE, \
                machinename VARCHAR, \
                pipelinecacheids INT ARRAY DEFAULT '{}' NOT NULL \
            ); \
        ");

        // await this.pgdb.query("CREATE TABLE IF NOT EXISTS user_machine \
        //     ( \
        //         machineid INT REFERENCES machines (machineid) ON UPDATE CASCADE ON DELETE CASCADE, \
        //         ownerid INT REFERENCES auth (userid) ON UPDATE CASCADE, \
        //         CONSTRAINT user_machine_key PRIMARY KEY (machineid, ownerid)\
        //     ); \
        // ");
    }

    async GetAuthByUsername(username: string)
    {
        return this.pgdb.oneOrNone(this.PSGetAuthByUsername, [username]);
    }

    async GetAuthByToken(token: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetAuthByToken, [token]);
    }

    async GetProjectIDByUUID(projectuuid: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetProjectIDByUUID, [projectuuid]);
    }

    async GetOrgIDByUUID(orguuid: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetOrgIDByUUID, [orguuid]);
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

    async GetPermissionsByOrgAndUserIDs(orgid: number, uid: number)
    {
        return this.pgdb.oneOrNone(this.PSGetPermissionsByOrgAndUserIDs, [orgid, uid]);
    }

    async GetPermissionsByOrgUUIDAndUserID(orgid: Buffer, uid: number)
    {
        return this.pgdb.oneOrNone(this.PSGetPermissionsByOrgUUIDAndUserID, [orgid, uid]);
    }

    async GetMachinesByOrgID_ValidatedByUserID(orgid: number, uid: number)
    {
        return this.pgdb.manyOrNone(this.PSGetMachinesByOrgID_ValidatedByUserID, [orgid, uid]);
    }

    async GetMachinesByOrgUUID_ValidatedByUserID(orguuid: Buffer, uid: number)
    {
        return this.pgdb.manyOrNone(this.PSGetMachinesByOrgUUID_ValidatedByUserID, [orguuid, uid]);
    }

    async GetMachinesByProjectUUID_ValidatedByUserID(projectuuid: Buffer, uid: number)
    {
        return this.pgdb.manyOrNone(this.PSGetMachinesByProjectUUID_ValidatedByUserID, [projectuuid, uid]);
    }

    async GetMachinesByFingerprint(print: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetMachinesByPrint, [print]);
    }

    // async GetPipelineCacheByHash(hash: Buffer)
    // {
    //     return this.pgdb.oneOrNone(this.PSGetPipelineCacheByHash, [hash]);
    // }

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

    async GetPipelineCacheByHashVersionProjectShort(hash: Buffer, projectuuid: Buffer, vMaj: number, vMin: number, vRev:number, vBuild:number)
    {
        return this.pgdb.manyOrNone(this.PSGetPipelineCacheByHashVersionProjectShort, [hash, projectuuid, vMaj, vMin, vRev, vBuild]);
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

    async GetMachinePermissionsForProjectByUUIDs(projectuuid: Buffer, machineuuid: Buffer, currentDate: Date)
    {
        return this.pgdb.oneOrNone(this.PSGetMachinePermissionsForProjectByUUIDs, [projectuuid, machineuuid, currentDate]);
    }

    async GetCacheDataAfterDate_ValidatedByMachine(projectuuid: Buffer, lookupAfterDate: Date, machineuuid: Buffer, currentDate: Date)
    {
        return this.pgdb.manyOrNone(this.PSGetCacheDataAfterDate_ValidatedByMachine, [projectuuid, lookupAfterDate, machineuuid, currentDate]);
    }
    
    async GetPermissionsByProjectUUIDAndUserID(projectid: Buffer, userid: number, currentDate: Date)
    {
        return this.pgdb.oneOrNone(this.PSGetPermissionsByProjectUUIDAndUserID, [projectid, userid, currentDate]);
    }

    async AddPipelineCacheToBoard(macid: Buffer, pipeid: number)
    {
        return this.pgdb.none(this.PSAddPipelineCacheToBoard, [macid, pipeid]);
    }

    async AddUserToOrganisation(orgid: number, userid: number)
    {
        //await this.pgdb.none(this.PSAddUserToOrganisation, [orgid, userid]);
        return this.pgdb.none(this.PSAddUserToOrganisationUserPerms, [orgid, userid]);
    }

    async ModifyOrgUserPermissions
    (
        orgid: number,
        userid: number,
        permAdminOrganisation: boolean,
        permAdminUsers: boolean,
        permCreateUser: boolean,
        permDeleteUser: boolean,
        permEditUser: boolean,
        permAdminMachines: boolean,
        permCreateMachines: boolean,
        permDeleteMachines: boolean,
        permEditMachines: boolean,
        permAdminProjects: boolean,
        permCreateProject: boolean,
        permDeleteProject: boolean,
        permEditProject: boolean
    )
    {
        return this.pgdb.none(this.PSModifyOrgUserPermissions, [
            orgid, 
            userid,
            permAdminOrganisation,
            permAdminUsers,
            permCreateUser,
            permDeleteUser,
            permEditUser,
            permAdminMachines,
            permCreateMachines,
            permDeleteMachines,
            permEditMachines,
            permAdminProjects,
            permCreateProject,
            permDeleteProject,
            permEditProject
        ]);
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

    async AddPSO(projectuuid: Buffer, hash: Buffer, pso: Buffer, date: Date, machine: Buffer, version: string, isStable: boolean = false)
    {
        try
        {
            // First, check that machine has permissions for the project
            let DoesMachineHaveSubmitForProject = await this.GetMachinePermissionsForProjectByUUIDs(projectuuid, machine, new Date());
            if(DoesMachineHaveSubmitForProject && DoesMachineHaveSubmitForProject.permsubmitcaches)
            {
                let PSODataIdentifier:number = -1;
                let vInt = StringToVersion(version);

                // Check if data exists
                let DoesDataForHashExist = await this.GetPipelineCacheDataByHashShort(hash);
                if(!DoesDataForHashExist)
                {
                    // Make it, it's a new hash
                    let AddData = await this.pgdb.one("INSERT INTO pipelinecachedata (hash, pipelinecachedata) VALUES ($1, $2) RETURNING pipelinecachedataid;", [
                        hash,
                        pso
                    ]
                    );

                    console.log(`Added Data ${AddData["pipelinecachedataid"]}`)

                    PSODataIdentifier = AddData.pipelinecachedataid;
                }
                else
                {
                    PSODataIdentifier = DoesDataForHashExist.pipelinecachedataid;
                }
                console.log(PSODataIdentifier);


                // Okay, Get projectID
                let ProjectIdentifier = await this.GetProjectIDByUUID(projectuuid);
                if(ProjectIdentifier)
                {
                    let res = await this.pgdb.one("INSERT INTO pipelinecaches (projectid, dataid, datetime, versionMajor, versionMinor, versionRevision, versionBuild, stable) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING pipelinecacheid;", [
                        ProjectIdentifier.projectid,
                        PSODataIdentifier,
                        date,
                        vInt[0],
                        vInt[1],
                        vInt[2],
                        vInt[3],
                        isStable
                    ]
                    );
    
            
    
                    console.log(`Added ${res["pipelinecacheid"]}`)
    
                    // Pump
                    this.AddPipelineCacheToBoard(machine, res["pipelinecacheid"]);
    
                
    
                    return 0;
                }
                else
                {
                    return -1;
                }
            }

            return -2;            
        }
        catch (Exception)
        {
            console.log(Exception);
            return -10;
        }
    }

    async AddMachine(userid:number, machinename: string, owningOrg: Buffer)
    {
        try
        {
            let CheckPerm = await this.GetPermissionsByOrgUUIDAndUserID(owningOrg, userid);
            if(CheckPerm && CheckPerm.permcreatemachines)
            {
                let uuid: Buffer = crypto.randomBytes(32);
                let uuidIndex = 0;
                for(uuidIndex = 0; uuidIndex < 10; ++uuidIndex)
                {
                    let uuidCheck = await this.pgdb.oneOrNone("SELECT fingerprint FROM machines WHERE fingerprint = $1", [uuid]);
                    if(uuidCheck)
                    {
                        // Okay. Might as well warn about this
                        console.log(`[INFO] UUID Collision. Generating a new UUID for machine ${machinename}`);
                        uuid = crypto.randomBytes(32);
                    }
                    else
                    {
                        break;
                    }
                }
                if(uuidIndex == 10)
                {
                    throw new Error("UUID Unique was not satisfied!");
                }

                //
                let OrgIdent = await this.GetOrgIDByUUID(owningOrg);

                // Add
                let res = await this.pgdb.one("INSERT INTO machines (orgid, fingerprint, machinename) VALUES ($1, $2, $3) RETURNING machineid;", [
                    OrgIdent.orgid,
                    uuid,
                    machinename
                ]
                );
                return 0;
            }     

            return -2;
        }
        catch (Exception)
        {
            console.log(Exception);
            return -10;
        }
    }

    async AddProject(userid:number, displayname: string, owningOrg: Buffer)
    {
        try
        {
            // Check userid has permcreateproject for org
            let CheckPerm = await this.GetPermissionsByOrgUUIDAndUserID(owningOrg, userid);
            if(CheckPerm && CheckPerm.permcreateproject)
            {
                // We can. so do an insert
                // Check our UUID is unique
                let uuid: Buffer = crypto.randomBytes(32);
                let uuidIndex = 0;
                for(uuidIndex = 0; uuidIndex < 10; ++uuidIndex)
                {
                    let uuidCheck = await this.pgdb.oneOrNone("SELECT projectid FROM projects WHERE uuid = $1", [uuid]);
                    if(uuidCheck)
                    {
                        // Okay. Might as well warn about this
                        console.log(`[INFO] UUID Collision. Generating a new UUID for project ${displayname}`);
                        uuid = crypto.randomBytes(32);
                    }
                    else
                    {
                        break;
                    }
                }
                if(uuidIndex == 10)
                {
                    throw new Error("UUID Unique was not satisfied!");
                }

                

                //
                let OrgIdent = await this.GetOrgIDByUUID(owningOrg);

                // Add
                let res = await this.pgdb.one("INSERT INTO projects (orgid, displayname, uuid) VALUES ($1, $2, $3) RETURNING projectid;", [
                    OrgIdent.orgid,
                    displayname,
                    uuid
                ]
                );

                return 0;
            }
            return -2;
        }
        catch (Exception)
        {
            console.log(Exception);
            return -10;
        }
    }


    async AddUser(username: string, salt, key, displayname: string = "")
    {
        try
        {
            if (displayname.length == 0)
            {
                displayname = username;
            }

            // First Check our UUID is unique
            let uuid: Buffer = crypto.randomBytes(32);
            let uuidIndex = 0;
            for(uuidIndex = 0; uuidIndex < 10; ++uuidIndex)
            {
                let uuidCheck = await this.pgdb.oneOrNone("SELECT orgid FROM organisations WHERE uuid = $1", [uuid]);
                if(uuidCheck)
                {
                    // Okay. Might as well warn about this
                    console.log(`[INFO] UUID Collision. Generating a new UUID for ${username}`);
                    uuid = crypto.randomBytes(32);
                }
                else
                {
                    break;
                }
            }

            if(uuidIndex == 10)
            {
                throw new Error("UUID Unique was not satisfied!");
            }

            let res = await this.pgdb.one("INSERT INTO auth (username, password, salt, tokens) VALUES ($1, $2, $3, ARRAY[$4::bytea]) RETURNING userid;", [
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

            let res2 = await this.pgdb.one("INSERT INTO users (userid, displayname) VALUES ($1, $2) RETURNING displayname;", [
                res.userid, 
                displayname
            ]
            );

            // Create User Organisation
            // Check UUID is unique

            let res3 = await this.pgdb.one("INSERT INTO organisations (displayname, uuid) VALUES ($1, $2) RETURNING orgid;",
            [
                displayname,
                uuid
            ]
            );

            if(res && res3)
            {
                // User
                await this.AddUserToOrganisation(res3.orgid, res.userid);
                
                // Grant full perms
                await this.ModifyOrgUserPermissions(
                    res3.orgid,
                    res.userid,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true
                    );

            }


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