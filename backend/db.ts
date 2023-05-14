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
// const config = {
//     user: process.env.PGUSER || "psoowner",
//     password: process.env.PGPASS || "postgres",
//     host: process.env.PGHOST || "localhost",
//     port: parseInt( process.env.PGPORT || "5432", 10 ),
//     database: process.env.PGDATABASE || "pipelinecache"
// };

const config = {
    connectionString: process.env.DATABASE_URL,
    max: 30,
    ssl: {rejectUnauthorized: false}
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
            text: "SELECT auth_tokens.userid FROM auth_tokens WHERE $1 = auth_tokens.token"
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

    PSGetUserByUID = new PreparedStatement(
        {
            name: "PSGetUserByUID",
            text: "SELECT * FROM users WHERE userid = $1"
        }
    );

    PSGetOrgsByUser = new PreparedStatement(
        {
            name: "PSGetOrgsByUser",
            text: "SELECT organisations.uuid, organisations.displayname \
            FROM \
                organisations, organisation_user_perms \
            WHERE \
                organisations.orgid = organisation_user_perms.orgid AND \
                organisation_user_perms.userid = $1"
        }
    );

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
            text: "SELECT \
                organisation_user_perms.permAdminUsers, \
                organisation_user_perms.permCreateUser, \
                organisation_user_perms.permDeleteUser, \
                organisation_user_perms.permEditUser, \
                organisation_user_perms.permAdminMachines, \
                organisation_user_perms.permCreateMachines, \
                organisation_user_perms.permDeleteMachines, \
                organisation_user_perms.permEditMachines, \
                organisation_user_perms.permAdminProjects, \
                organisation_user_perms.permCreateProject, \
                organisation_user_perms.permDeleteProject, \
                organisation_user_perms.permEditProject \
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
            FROM machines \
                LEFT OUTER JOIN project_machine_perms pmp on machines.machineid = pmp.machineid \
                LEFT OUTER JOIN projects p on pmp.projectid = p.projectid \
                LEFT OUTER JOIN organisation_user_perms oup on p.orgid = oup.orgid \
                LEFT OUTER JOIN project_user_perms pup on p.projectid = pup.projectid \
            WHERE \
                p.uuid = $1 AND \
                (\
                    (\
                        oup.userid = $2 AND \
                        oup.permadminprojects = true \
                    ) \
                    OR \
                    ( \
                        pup.userid = $2 AND \
                        pup.validfrom < $3 AND \
                        pup.validuntil > $3 \
                    ) \
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
                pipelinecaches.versionBuild, \
                pipelinecaches.datetime, \
                pipelinecaches.platform, \
                pipelinecaches.shaderModel, \
                pipelinecaches.extratag, \
                pipelinecaches.stable \
            FROM \
                pipelinecachedata, pipelinecaches, project_machine_perms, machines, projects \
            WHERE \
                pipelinecachedata.pipelinecachedataid = pipelinecaches.dataid AND \
                pipelinecaches.datetime > $2 AND \
                pipelinecaches.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $3 AND \
                pipelinecaches.extratag = $5 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $4 AND \
                project_machine_perms.validuntil > $4 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    PSGetCacheDataAfterDate_ValidatedByMachinePlatformModel = new PreparedStatement(
        {
            name: "PSGetCacheDataAfterDate_ValidatedByMachinePlatformModel",
            text: "SELECT DISTINCT\
                pipelinecachedata.pipelinecachedata, \
                pipelinecaches.versionMajor, \
                pipelinecaches.versionMinor, \
                pipelinecaches.versionRevision, \
                pipelinecaches.versionBuild, \
                pipelinecaches.datetime, \
                pipelinecaches.platform, \
                pipelinecaches.shaderModel, \
                pipelinecaches.extratag, \
                pipelinecaches.stable \
            FROM \
                pipelinecachedata, pipelinecaches, project_machine_perms, machines, projects \
            WHERE \
                pipelinecachedata.pipelinecachedataid = pipelinecaches.dataid AND \
                pipelinecaches.datetime > $2 AND \
                pipelinecaches.platform = $5 AND \
                pipelinecaches.shaderModel = $6 AND \
                pipelinecaches.projectid = projects.projectid AND \
                pipelinecaches.extratag = $7 AND \
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

    PSGetInfoDataAfterDate_ValidatedByMachine = new PreparedStatement(
        {
            name: "PSGetInfoDataAfterDate_ValidatedByMachine",
            text: "SELECT DISTINCT\
                stablekeyinfodata.stablekeyinfodata, \
                stablekeyinfos.versionMajor, \
                stablekeyinfos.versionMinor, \
                stablekeyinfos.versionRevision, \
                stablekeyinfos.versionBuild, \
                stablekeyinfos.datetime, \
                stablekeyinfos.platform, \
                stablekeyinfos.shaderModel, \
                stablekeyinfos.extratag, \
                stablekeyinfos.global \
            FROM \
                stablekeyinfodata, stablekeyinfos, project_machine_perms, machines, projects \
            WHERE \
                stablekeyinfodata.stablekeyinfodataid = stablekeyinfos.dataid AND \
                stablekeyinfos.datetime > $2 AND \
                stablekeyinfos.projectid = projects.projectid AND \
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

    PSGetInfoDataAfterVersion_ValidatedByMachine = new PreparedStatement(
        {
            name: "PSGetInfoDataAfterVersion_ValidatedByMachine",
            text: "SELECT DISTINCT\
                stablekeyinfodata.stablekeyinfodata, \
                stablekeyinfos.versionMajor, \
                stablekeyinfos.versionMinor, \
                stablekeyinfos.versionRevision, \
                stablekeyinfos.versionBuild, \
                stablekeyinfos.datetime, \
                stablekeyinfos.platform, \
                stablekeyinfos.shaderModel, \
                stablekeyinfos.extratag, \
                stablekeyinfos.global \
            FROM \
                stablekeyinfodata, stablekeyinfos, project_machine_perms, machines, projects \
            WHERE \
                stablekeyinfodata.stablekeyinfodataid = stablekeyinfos.dataid AND \
                stablekeyinfos.versionMajor >= $3 AND \
                stablekeyinfos.versionMinor >= $4 AND \
                stablekeyinfos.versionRevision >= $5 AND \
                stablekeyinfos.versionBuild >= $6 AND \
                stablekeyinfos.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $2 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $7 AND \
                project_machine_perms.validuntil > $7 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    PSGetCacheDataAfterVersion_ValidatedByMachine = new PreparedStatement(
        {
            name: "PSGetCacheDataAfterVersion_ValidatedByMachine",
            text: "SELECT DISTINCT\
                pipelinecachedata.pipelinecachedata, \
                pipelinecaches.versionMajor, \
                pipelinecaches.versionMinor, \
                pipelinecaches.versionRevision, \
                pipelinecaches.versionBuild, \
                pipelinecaches.datetime, \
                pipelinecaches.platform, \
                pipelinecaches.shaderModel, \
                pipelinecaches.extratag, \
                pipelinecaches.stable \
            FROM \
                pipelinecachedata, pipelinecaches, project_machine_perms, machines, projects \
            WHERE \
                pipelinecachedata.pipelinecachedataid = pipelinecaches.dataid AND \
                pipelinecaches.versionMajor >= $3 AND \
                pipelinecaches.versionMinor >= $4 AND \
                pipelinecaches.versionRevision >= $5 AND \
                pipelinecaches.versionBuild >= $6 AND \
                pipelinecaches.extratag = $8 AND \
                pipelinecaches.projectid = projects.projectid AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $2 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $7 AND \
                project_machine_perms.validuntil > $7 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    PSGetCacheDataAfterVersion_ValidatedByMachinePlatformModel = new PreparedStatement(
        {
            name: "PSGetCacheDataAfterVersion_ValidatedByMachinePlatformModel",
            text: "SELECT DISTINCT\
                pipelinecachedata.pipelinecachedata, \
                pipelinecaches.versionMajor, \
                pipelinecaches.versionMinor, \
                pipelinecaches.versionRevision, \
                pipelinecaches.versionBuild, \
                pipelinecaches.datetime, \
                pipelinecaches.platform, \
                pipelinecaches.shaderModel, \
                pipelinecaches.extratag, \
                pipelinecaches.stable \
            FROM \
                pipelinecachedata, pipelinecaches, project_machine_perms, machines, projects \
            WHERE \
                pipelinecachedata.pipelinecachedataid = pipelinecaches.dataid AND \
                pipelinecaches.versionMajor >= $3 AND \
                pipelinecaches.versionMinor >= $4 AND \
                pipelinecaches.versionRevision >= $5 AND \
                pipelinecaches.versionBuild >= $6 AND \
                pipelinecaches.projectid = projects.projectid AND \
                pipelinecaches.platform = $8 AND \
                pipelinecaches.shaderModel = $9 AND \
                pipelinecaches.extratag = $10 AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $2 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $7 AND \
                project_machine_perms.validuntil > $7 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    PSGetInfoDataAfterVersion_ValidatedByMachinePlatformModel = new PreparedStatement(
        {
            name: "PSGetInfoDataAfterVersion_ValidatedByMachinePlatformModel",
            text: "SELECT DISTINCT\
                stablekeyinfodata.stablekeyinfodata, \
                stablekeyinfos.versionMajor, \
                stablekeyinfos.versionMinor, \
                stablekeyinfos.versionRevision, \
                stablekeyinfos.versionBuild, \
                stablekeyinfos.datetime, \
                stablekeyinfos.platform, \
                stablekeyinfos.shaderModel, \
                stablekeyinfos.extratag, \
                stablekeyinfos.global \
            FROM \
                stablekeyinfodata, stablekeyinfos, project_machine_perms, machines, projects \
            WHERE \
                stablekeyinfodata.stablekeyinfodataid = stablekeyinfos.dataid AND \
                stablekeyinfos.versionMajor >= $3 AND \
                stablekeyinfos.versionMinor >= $4 AND \
                stablekeyinfos.versionRevision >= $5 AND \
                stablekeyinfos.versionBuild >= $6 AND \
                stablekeyinfos.projectid = projects.projectid AND \
                stablekeyinfos.platform = $8 AND \
                stablekeyinfos.shaderModel = $9 AND \
                projects.uuid = $1 AND \
                machines.fingerprint = $2 AND \
                project_machine_perms.machineid = machines.machineid AND \
                project_machine_perms.projectid = projects.projectid AND \
                project_machine_perms.validfrom < $7 AND \
                project_machine_perms.validuntil > $7 AND \
                project_machine_perms.permpullcaches = true \
            "
        }
    );

    

    PSGetInfoDataAfterDate_ValidatedByMachinePlatformModel = new PreparedStatement(
        {
            name: "PSGetInfoDataAfterDate_ValidatedByMachinePlatformModel",
            text: "SELECT DISTINCT\
                stablekeyinfodata.stablekeyinfodata, \
                stablekeyinfos.versionMajor, \
                stablekeyinfos.versionMinor, \
                stablekeyinfos.versionRevision, \
                stablekeyinfos.versionBuild, \
                stablekeyinfos.datetime, \
                stablekeyinfos.platform, \
                stablekeyinfos.shaderModel, \
                stablekeyinfos.extratag, \
                stablekeyinfos.global \
            FROM \
                stablekeyinfodata, stablekeyinfos, project_machine_perms, machines, projects \
            WHERE \
                stablekeyinfodata.stablekeyinfodataid = stablekeyinfos.dataid AND \
                stablekeyinfos.datetime > $2 AND \
                stablekeyinfos.platform = $5 AND \
                stablekeyinfos.shaderModel = $6 AND \
                stablekeyinfos.projectid = projects.projectid AND \
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

    PSGetMachineFromOrgByUUIDs = new PreparedStatement(
        {
            name: "PSGetMachineFromOrgByUUIDs",
            text: "SELECT \
                machines.machineid \
            FROM \
                machines, organisations \
            WHERE \
                machines.fingerprint = $1 AND \
                organisations.uuid = $2 AND \
                organisations.orgid = machines.orgid \
            "
        }
    );

    PSDeleteMachineFromOrgByUUIDs_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSDeleteMachineFromOrgByUUIDs_ValidatedByUserID",
            text: "DELETE FROM machines \
            USING organisations, organisation_user_perms \
            WHERE \
                machines.fingerprint = $1 AND \
                organisations.uuid = $2 AND \
                organisations.orgid = machines.orgid AND \
                organisation_user_perms.userid = $3 AND \
                organisation_user_perms.orgid = machines.orgid AND \
                organisation_user_perms.permdeletemachines = true \
            "
        }
    );

    PSDeleteProjectFromOrgByUUIDs_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSDeleteProjectFromOrgByUUIDs_ValidatedByUserID",
            text: "DELETE FROM projects \
            USING organisations, organisation_user_perms \
            WHERE \
                projects.uuid = $1 AND \
                organisations.uuid = $2 AND \
                organisations.orgid = projects.orgid AND \
                organisation_user_perms.userid = $3 AND \
                organisation_user_perms.orgid = projects.orgid AND \
                organisation_user_perms.permdeleteproject = true \
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

    PSGetProjectsByOrgUUID_ValidatedByUserID = new PreparedStatement(
        {
            name: "PSGetProjectsByOrgUUID_ValidatedByUserID",
            text: "SELECT \
                projects.projectid, projects.displayname, projects.uuid \
            FROM \
                projects, organisations, organisation_user_perms \
            WHERE \
                projects.orgid = organisation_user_perms.orgid AND \
                organisation_user_perms.orgid = organisations.orgid AND \
                organisations.uuid = $1 AND \
                organisation_user_perms.userid = $2 AND \
                organisation_user_perms.permadminprojects = true \
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
            text: "SELECT pipelinecachedata.pipelinecachedata, pipelinecaches.* FROM pipelinecachedata, pipelinecaches, auth_tokens, machines, user_machine, auth, users \
            WHERE \
              pipelinecachedata.hash = pipelinecaches.hash AND \
              pipelinecaches.pipelinecacheid = ANY(machines.pipelinecacheids) AND \
              user_machine.machineid = machines.machineid AND \
              auth.userid = user_machine.ownerid AND \
              users.permissionlevelread = true AND \
              auth.userid = users.userid AND \
              auth_tokens.userid = auth.userid AND \
              auth_tokens.token = $1"
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

    PSGetShaderInfoDataByHashShort = new PreparedStatement(
        {
            name: "PSGetShaderInfoDataByHashShort",
            text: "SELECT stablekeyinfodataid FROM stablekeyinfodata WHERE hash = $1"
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

    PSGetStableKeyInfoByHashVersionProjectShort = new PreparedStatement(
        {
            name: "PSGetStableKeyInfoByHashVersionProjectShort",
            text: "SELECT stablekeyinfos.stablekeyinfoid, stablekeyinfos.datetime \
            FROM \
                stablekeyinfos, stablekeyinfodata, projects \
            WHERE \
                stablekeyinfodata.hash = $1 AND \
                stablekeyinfos.dataid = stablekeyinfodata.stablekeyinfodataid AND \
                stablekeyinfos.projectid = projects.projectid AND \
                projects.uuid = $2 AND \
                versionMajor = $3 AND \
                versionMinor = $4 AND \
                versionRevision = $5 AND \
                versionBuild = $6"
        }
    ); 
    
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
                drop table if exists stablekeyinfos cascade; \
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
                salt BYTEA \
            ); \
        ");

        await this.pgdb.query("CREATE TABLE IF NOT EXISTS auth_tokens \
            ( \
                userid INT REFERENCES auth (userid) ON DELETE CASCADE, \
                token BYTEA UNIQUE \
            ); \
        ");

        console.log(res);
    }

    async InitialiseSession()
    {        
        let res = await this.pgdb.query("CREATE TABLE IF NOT EXISTS session \
            ( \
                sid varchar NOT NULL COLLATE \"default\",\
                sess json NOT NULL,\
                expire timestamp(6) NOT NULL,\
                CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE\
            )\
            WITH (OIDS=FALSE);\
        ");

        let res2 = await this.pgdb.query("CREATE INDEX IF NOT EXISTS \"IDX_session_expire\" ON session (expire);");

        console.log(res);
        console.log(res2);
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
    }

    async InitialiseOrganisationLinkTables()
    {
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

    async InitialiseProjects()
    {        
        console.log("[DBUG][INFO] CREATE TABLE IF NOT EXISTS projects")
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS projects \
            ( \
                projectid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE,\
                displayname VARCHAR, \
                uuid BYTEA UNIQUE \
            ); \
        ");

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
                hash BYTEA UNIQUE, \
                pipelinecachedata BYTEA NOT NULL \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS pipelinecaches \
            ( \
                pipelinecacheid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                dataid INT REFERENCES pipelinecachedata (pipelinecachedataid) ON DELETE CASCADE, \
                platform VARCHAR(24),\
                shaderModel VARCHAR(24),\
                datetime TIMESTAMP NOT NULL, \
                versionMajor INT NOT NULL, \
                versionMinor INT NOT NULL, \
                versionRevision INT NOT NULL, \
                versionBuild INT NOT NULL, \
                stable BOOLEAN DEFAULT false, \
                saveMode INT DEFAULT 100, \
                ordering INT DEFAULT 100, \
                extratag VARCHAR(24) \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS stablekeyinfodata \
            ( \
                stablekeyinfodataid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                hash BYTEA UNIQUE, \
                stablekeyinfodata BYTEA NOT NULL \
            );"
        );

        await this.pgdb.query("\
            CREATE TABLE IF NOT EXISTS stablekeyinfos \
            ( \
                stablekeyinfoid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                projectid INT REFERENCES projects (projectid) ON DELETE CASCADE, \
                dataid INT REFERENCES stablekeyinfodata (stablekeyinfodataid) ON DELETE CASCADE, \
                platform VARCHAR(24),\
                shaderModel VARCHAR(24),\
                datetime TIMESTAMP NOT NULL, \
                versionMajor INT NOT NULL, \
                versionMinor INT NOT NULL, \
                versionRevision INT NOT NULL, \
                versionBuild INT NOT NULL, \
                global BOOLEAN DEFAULT false, \
                saveMode INT DEFAULT 100, \
                ordering INT DEFAULT 100, \
                extratag VARCHAR(24) \
            );"
        );

    }

    async InitialiseMachines()
    {        
        await this.pgdb.query("CREATE TABLE IF NOT EXISTS machines \
            ( \
                machineid INT NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY, \
                orgid INT REFERENCES organisations (orgid) ON DELETE CASCADE, \
                fingerprint BYTEA UNIQUE, \
                machinename VARCHAR, \
                pipelinecacheids INT ARRAY DEFAULT '{}' NOT NULL \
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

    async GetUserByUID(uid: number)
    {
        return this.pgdb.oneOrNone(this.PSGetUserByUID, [uid]);
    }

    async GetOrgsByUser(uid: number)
    {
        return this.pgdb.manyOrNone(this.PSGetOrgsByUser, [uid]);
    }

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

    async GetProjectsByOrgUUID_ValidatedByUserID(orguuid: Buffer, uid: number)
    {
        return this.pgdb.manyOrNone(this.PSGetProjectsByOrgUUID_ValidatedByUserID, [orguuid, uid]);
    }

    async GetMachinesByProjectUUID_ValidatedByUserID(projectuuid: Buffer, uid: number, cdata: Date)
    {
        return this.pgdb.manyOrNone(this.PSGetMachinesByProjectUUID_ValidatedByUserID, [projectuuid, uid, cdata]);
    }

    async GetMachinesByFingerprint(print: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetMachinesByPrint, [print]);
    }

    async GetMachineFromOrgByUUIDs(print: Buffer, org: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetMachineFromOrgByUUIDs, [print, org]);
    }

    async DeleteMachineFromOrgByUUIDs_ValidatedByUserID(print: Buffer, org: Buffer, userid: number)
    {
        return this.pgdb.oneOrNone(this.PSDeleteMachineFromOrgByUUIDs_ValidatedByUserID, [print, org, userid]);
    }

    async DeleteProjectFromOrgByUUIDs_ValidatedByUserID(print: Buffer, org: Buffer, userid: number)
    {
        return this.pgdb.oneOrNone(this.PSDeleteProjectFromOrgByUUIDs_ValidatedByUserID, [print, org, userid]);
    }

    async GetPipelineCacheDataByHash(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetPipelineCacheDataByHash, [hash]);
    }

    async GetPipelineCacheDataByHashShort(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetPipelineCacheDataByHashShort, [hash]);
    }

    async GetShaderInfoDataByHashShort(hash: Buffer)
    {
        return this.pgdb.oneOrNone(this.PSGetShaderInfoDataByHashShort, [hash]);
    }

    async GetPipelineCacheByHashVersionProjectShort(hash: Buffer, projectuuid: Buffer, vMaj: number, vMin: number, vRev:number, vBuild:number)
    {
        return this.pgdb.manyOrNone(this.PSGetPipelineCacheByHashVersionProjectShort, [hash, projectuuid, vMaj, vMin, vRev, vBuild]);
    }

    async GetStableKeyInfoByHashVersionProjectShort(hash: Buffer, projectuuid: Buffer, vMaj: number, vMin: number, vRev:number, vBuild:number)
    {
        return this.pgdb.manyOrNone(this.PSGetStableKeyInfoByHashVersionProjectShort, [hash, projectuuid, vMaj, vMin, vRev, vBuild]);
    }

    async GetMachinePermissionsForProjectByUUIDs(projectuuid: Buffer, machineuuid: Buffer, currentDate: Date)
    {
        return this.pgdb.oneOrNone(this.PSGetMachinePermissionsForProjectByUUIDs, [projectuuid, machineuuid, currentDate]);
    }

    async GetCacheDataAfterDate_ValidatedByMachine(projectuuid: Buffer, lookupAfterDate: Date, machineuuid: Buffer, currentDate: Date, extratag: string)
    {
        return this.pgdb.manyOrNone(this.PSGetCacheDataAfterDate_ValidatedByMachine, [projectuuid, lookupAfterDate, machineuuid, currentDate, extratag]);
    }

    async GetInfoDataAfterDate_ValidatedByMachine(projectuuid: Buffer, lookupAfterDate: Date, machineuuid: Buffer, currentDate: Date)
    {
        return this.pgdb.manyOrNone(this.PSGetInfoDataAfterDate_ValidatedByMachine, [projectuuid, lookupAfterDate, machineuuid, currentDate]);
    }

    async GetCacheDataAfterDate_ValidatedByMachinePlatformModel(projectuuid: Buffer, lookupAfterDate: Date, machineuuid: Buffer, currentDate: Date, platform: string, shaderModel: string, extratag: string)
    {
        return this.pgdb.manyOrNone(this.PSGetCacheDataAfterDate_ValidatedByMachinePlatformModel, [projectuuid, lookupAfterDate, machineuuid, currentDate, platform, shaderModel, extratag]);
    }

    async GetInfoDataAfterDate_ValidatedByMachinePlatformModel(projectuuid: Buffer, lookupAfterDate: Date, machineuuid: Buffer, currentDate: Date, platform: string, shaderModel: string)
    {
        return this.pgdb.manyOrNone(this.PSGetInfoDataAfterDate_ValidatedByMachinePlatformModel, [projectuuid, lookupAfterDate, machineuuid, currentDate, platform, shaderModel]);
    }

    async GetInfoDataAfterVersion_ValidatedByMachine(projectuuid: Buffer, machineuuid: Buffer, versionMajor: number, versionMinor: number, versionRevision: number, versionBuild: number, currentDate: Date)
    {
        return this.pgdb.manyOrNone(this.PSGetInfoDataAfterVersion_ValidatedByMachine, [projectuuid, machineuuid, versionMajor, versionMinor, versionRevision, versionBuild, currentDate]);
    }

    async GetCacheDataAfterVersion_ValidatedByMachine(projectuuid: Buffer, machineuuid: Buffer, versionMajor: number, versionMinor: number, versionRevision: number, versionBuild: number, currentDate: Date, extratag: string)
    {
        return this.pgdb.manyOrNone(this.PSGetCacheDataAfterVersion_ValidatedByMachine, [projectuuid, machineuuid, versionMajor, versionMinor, versionRevision, versionBuild, currentDate, extratag]);
    }

    async GetCacheDataAfterVersion_ValidatedByMachinePlatformModel(projectuuid: Buffer, machineuuid: Buffer, versionMajor: number, versionMinor: number, versionRevision: number, versionBuild: number, currentDate: Date, platform: string, shaderModel: string, extratag: string)
    {
        return this.pgdb.manyOrNone(this.PSGetCacheDataAfterVersion_ValidatedByMachinePlatformModel, [projectuuid, machineuuid, versionMajor, versionMinor, versionRevision, versionBuild, currentDate, platform, shaderModel, extratag]);
    }

    async GetInfoDataAfterVersion_ValidatedByMachinePlatformModel(projectuuid: Buffer, machineuuid: Buffer, versionMajor: number, versionMinor: number, versionRevision: number, versionBuild: number, currentDate: Date, platform: string, shaderModel: string)
    {
        return this.pgdb.manyOrNone(this.PSGetInfoDataAfterVersion_ValidatedByMachinePlatformModel, [projectuuid, machineuuid, versionMajor, versionMinor, versionRevision, versionBuild, currentDate, platform, shaderModel]);
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

    PSSyncUpdatePSO = new PreparedStatement(
        {
            name: "PSSyncUpdatePSO",
            text: "WITH input_data(hash, pipelinecachedata) as (VALUES($1::bytea, $2::bytea)), \
            insertrow as (\
                INSERT INTO pipelinecachedata (hash, pipelinecachedata) \
                SELECT * FROM input_data \
                ON CONFLICT (hash) DO NOTHING \
                RETURNING pipelinecachedataid, hash \
            ), \
            selectrow as (\
                SELECT 'i'::\"char\" as source, pipelinecachedataid, hash \
                FROM insertrow \
                UNION ALL \
                SELECT 's'::\"char\" as source, ski.pipelinecachedataid, hash \
                FROM input_data \
                JOIN pipelinecachedata ski USING (hash) \
            ), \
            upsertrow as ( \
                INSERT INTO pipelinecachedata AS skid (hash, pipelinecachedata) \
                SELECT i.* \
                FROM input_data i \
                LEFT JOIN selectrow sr USING (hash) \
                WHERE sr.hash IS NULL \
                ON CONFLICT (hash) DO UPDATE \
                SET hash = skid.hash \
                RETURNING 'u'::\"char\" as source, pipelinecachedataid \
            )\
            SELECT source, pipelinecachedataid FROM selectrow \
            UNION ALL TABLE upsertrow;\
            "
        }
    );

    PSSyncUpdateStableKey = new PreparedStatement(
        {
            name: "PSSyncUpdateStableKey",
            text: "WITH input_data(hash, stablekeyinfodata) as (VALUES($1::bytea, $2::bytea)), \
            insertrow as (\
                INSERT INTO stablekeyinfodata (hash, stablekeyinfodata) \
                SELECT * FROM input_data \
                ON CONFLICT (hash) DO NOTHING \
                RETURNING stablekeyinfodataid, hash \
            ), \
            selectrow as (\
                SELECT 'i'::\"char\" as source, stablekeyinfodataid, hash \
                FROM insertrow \
                UNION ALL \
                SELECT 's'::\"char\" as source, ski.stablekeyinfodataid, hash \
                FROM input_data \
                JOIN stablekeyinfodata ski USING (hash) \
            ), \
            upsertrow as ( \
                INSERT INTO stablekeyinfodata AS skid (hash, stablekeyinfodata) \
                SELECT i.* \
                FROM input_data i \
                LEFT JOIN selectrow sr USING (hash) \
                WHERE sr.hash IS NULL \
                ON CONFLICT (hash) DO UPDATE \
                SET hash = skid.hash \
                RETURNING 'u'::\"char\" as source, stablekeyinfodataid \
            )\
            SELECT source, stablekeyinfodataid FROM selectrow \
            UNION ALL TABLE upsertrow;\
            "
        }
    );

    async GetShaderDataIdentifier(hash: Buffer, pso: Buffer)
    {
        // Check if data exists
        let PSODataIdentifier:number = -1;
        let AddData = await this.pgdb.one(this.PSSyncUpdateStableKey, [
            hash,
            pso
        ]
        );

        if(AddData)
        {
            PSODataIdentifier = AddData.stablekeyinfodataid;
        }

        return PSODataIdentifier;
    }

    async AddKeyInfo(projectuuid: Buffer, hash: Buffer, pso: Buffer, date: Date, machine: Buffer, version: string, isGlobalKey: boolean = false, optionalPlatform: string = "", optionalSM: string = "", optionalTag: string = "")
    {
        try
        {
            // First, check that machine has permissions for the project
            let DoesMachineHaveSubmitForProject = await this.GetMachinePermissionsForProjectByUUIDs(projectuuid, machine, new Date());
            if(DoesMachineHaveSubmitForProject && DoesMachineHaveSubmitForProject.permsubmitcaches)
            {
                let PSODataIdentifier:number = await this.GetShaderDataIdentifier(hash, pso);
                let vInt = StringToVersion(version);

                // Okay, Get projectID
                let ProjectIdentifier = await this.GetProjectIDByUUID(projectuuid);
                if(ProjectIdentifier)
                {
                    let res = await this.pgdb.one("INSERT INTO stablekeyinfos (projectid, dataid, datetime, versionMajor, versionMinor, versionRevision, versionBuild, global, platform, shaderModel, extratag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING stablekeyinfoid;", [
                        ProjectIdentifier.projectid,
                        PSODataIdentifier,
                        date,
                        vInt[0],
                        vInt[1],
                        vInt[2],
                        vInt[3],
                        isGlobalKey,
                        optionalPlatform,
                        optionalSM,
                        optionalTag
                    ]
                    );
    
                    //console.log(`Added ${res["pipelinecacheid"]}`)
                    //this.AddPipelineCacheToBoard(machine, res["pipelinecacheid"]);
    
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

    async GetPSODataIdentifier(hash: Buffer, pso: Buffer)
    {
        let PSODataIdentifier:number = -1;
        let AddData = await this.pgdb.one(this.PSSyncUpdatePSO, [
            hash,
            pso
        ]
        );

        if(AddData)
        {
            PSODataIdentifier = AddData.pipelinecachedataid;
        }

        return PSODataIdentifier;
    }

    async AddPSO(projectuuid: Buffer, hash: Buffer, pso: Buffer, date: Date, machine: Buffer, version: string, isStable: boolean = false, optionalPlatform: string = "", optionalSM: string = "", optionalTag: string = "")
    {
        try
        {
            // First, check that machine has permissions for the project
            let DoesMachineHaveSubmitForProject = await this.GetMachinePermissionsForProjectByUUIDs(projectuuid, machine, new Date());
            if(DoesMachineHaveSubmitForProject && DoesMachineHaveSubmitForProject.permsubmitcaches)
            {
                let PSODataIdentifier:number = await this.GetPSODataIdentifier(hash, pso);
                let vInt = StringToVersion(version);

                // Okay, Get projectID
                let ProjectIdentifier = await this.GetProjectIDByUUID(projectuuid);
                if(ProjectIdentifier)
                {
                    let res = await this.pgdb.one("INSERT INTO pipelinecaches (projectid, dataid, datetime, versionMajor, versionMinor, versionRevision, versionBuild, stable, platform, shaderModel, extratag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING pipelinecacheid;", [
                        ProjectIdentifier.projectid,
                        PSODataIdentifier,
                        date,
                        vInt[0],
                        vInt[1],
                        vInt[2],
                        vInt[3],
                        isStable,
                        optionalPlatform,
                        optionalSM,
                        optionalTag
                    ]
                    );
    
                    //console.log(`Added ${res["pipelinecacheid"]}`)
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

    async AddMachineToProject(userid:number, machineprint: Buffer, owningOrg: Buffer, projectuuid: Buffer, validFrom: Date, validTill: Date, canSubmit: boolean, canPull: boolean)
    {
        try
        {
            let CheckPerm = await this.GetPermissionsByOrgUUIDAndUserID(owningOrg, userid);
            let ProjectPerm = await this.GetPermissionsByProjectUUIDAndUserID(projectuuid, userid, new Date());

            if((CheckPerm && CheckPerm.permeditproject) || (ProjectPerm))
            {
                // Project
                let projectIdent = await this.GetProjectIDByUUID(projectuuid);
                let machineIdent = await this.GetMachineFromOrgByUUIDs(machineprint, owningOrg);

                if(machineIdent && projectIdent)
                {
                    // We have the permission to do 
                    let res = await this.pgdb.one("INSERT INTO project_machine_perms (projectid, machineid, validfrom, validuntil, permsubmitcaches, permpullcaches) VALUES ($1, $2, $3, $4, $5, $6) RETURNING machineid;", [
                        projectIdent.projectid,
                        machineIdent.machineid,
                        validFrom,
                        validTill,
                        canSubmit,
                        canPull
                    ]
                    );
                    if(res)
                    {
                        return 0;
                    }
                }
                return -1;
            }
            else
            {
                return -2;
            }
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

    async RenewUserToken (userid: number): Promise<[number, Buffer]>
    {
        let result: [number, Buffer] = [-1, null];
        try
        {
            let newToken: Buffer;
            let uuidIndex = 0;
            for(uuidIndex = 0; uuidIndex < 10; ++uuidIndex)
            {
                newToken = crypto.randomBytes(32);
                let uuidCheck = await this.pgdb.oneOrNone("SELECT auth_tokens.userid FROM auth_tokens WHERE auth_tokens.token = $1", [newToken]);
                if(uuidCheck)
                {
                    // Okay. Might as well warn about this
                    console.log(`[INFO] UUID Collision. Generating a new UUID for ${userid}`);
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

            // Check Token Exists
            let initCheck = await this.pgdb.oneOrNone("SELECT auth_tokens.userid FROM auth_tokens WHERE auth_tokens.userid = $1", [userid]);
            if (initCheck)
            {
                let res = await this.pgdb.oneOrNone("UPDATE auth_tokens SET token = $1 WHERE userid = $2 RETURNING token", [
                    newToken,
                    userid
                ]
                );
    
                if(res && res["token"])
                {
                    result = [0, newToken];
                }
            }
            else
            {
                let res = await this.pgdb.oneOrNone("INSERT INTO auth_tokens (userid, token) VALUES ($1, $2) RETURNING token", [
                    userid, 
                    newToken
                ]
                );
    
                if(res && res["token"])
                {
                    result = [0, newToken];
                }
            }



            return result;
        }
        catch (Exception)
        {
            console.log(Exception);
            return [-10, null];
        }

        return result;
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

            let res = await this.pgdb.one("INSERT INTO auth (username, password, salt) VALUES ($1, $2, $3) RETURNING userid;", [
                username, 
                key,
                salt,
            ]
            );


            


            if(res)
            {
                for(uuidIndex = 0; uuidIndex < 10; ++uuidIndex)
                {
                    uuid = crypto.randomBytes(32);
                    let uuidCheck = await this.pgdb.oneOrNone("SELECT auth_tokens.userid FROM auth_tokens WHERE auth_tokens.token = $1", [uuid]);
                    if(uuidCheck)
                    {
                        // Okay. Might as well warn about this
                        console.log(`[INFO] UUID Collision. Generating a new UUID for ${username}`);
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

                let res2 = await this.pgdb.one("INSERT INTO auth_tokens (userid, token) VALUES ($1, $2) RETURNING userid;", [
                    res.userid, 
                    uuid
                ]
                );
            }



            let res2 = await this.pgdb.one("INSERT INTO users (userid, displayname) VALUES ($1, $2) RETURNING displayname;", [
                res.userid, 
                displayname
            ]
            );

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
                // TODO: Make perms do something and be setable
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