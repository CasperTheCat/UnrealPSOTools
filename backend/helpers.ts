
import crypto from "crypto";
import type { PipelineShaderObjectDB } from "./db";

function HashOfBuffer(data: Buffer): Promise<Buffer>
{
    return new Promise<Buffer>(function (resolve, reject)
    {
    
        let hash = crypto.createHash("SHA512-256");

        hash.update(data);

        resolve(hash.digest());
    });
}

function StringToVersion(version: string)
{
    let vString = version.split(".");
    let vInt: number[] = [];

    for (let i = 0; i < 4; ++i)
    {
        if (i < vString.length)
        {
            try
            {
                vInt.push(parseInt(vString[i]));
            }
            catch (Exception)
            {
                vInt.push(0);
            }
        }
        else
        {
            vInt.push(0);
        }
    }

    return vInt;
}

let ShaderKeyTypes = [
    "recorded",
    "stable",
    "projectshaderinfo",
    "globalshaderinfo"
];

// async function GetUserIDMW(req, res, next, psoDB) {
//     // This enables us to set a variable on req
//     let userid: number = 0;
//     if ("passport" in req.session && "user" in req.session["passport"])
//     {
//         userid = req.session["passport"]["user"];
//     }
//     else if ("authorization" in req.headers)
//     {
//         let token: Buffer = Buffer.from(req.headers["authorization"], "base64");
//         userid = await psoDB.GetAuthByToken(token);
//     }
// }

async function GetUserID(req, jsonbody: JSON, psoDB: PipelineShaderObjectDB)
{
    let userid: number = 0;
    //console.log(jsonbody);
    if ("passport" in req.session && "user" in req.session["passport"])
    {
        userid = req.session["passport"]["user"];
    }
    else if ("authorization" in req.headers)
    {
        console.log(req.headers["authorization"]);
        let token: Buffer = Buffer.from(req.headers["authorization"], "base64");
        userid = await psoDB.GetAuthByToken(token);
    }
    else if ("auth" in jsonbody)
    {
        let token: Buffer = Buffer.from(req.body.auth, "base64");
        userid = await psoDB.GetAuthByToken(token);
    }

    return userid;
}

async function HandleReturn(result, res)
{
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

export {HandleReturn, ShaderKeyTypes, HashOfBuffer, StringToVersion, GetUserID}

