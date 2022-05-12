import Strategy from "passport-local";
import crypto from "crypto";
import type { PipelineShaderObjectDB } from "./db.js";

let PBKDF2ROUNDS = 500000;
let PBKDF2ALGO = 'SHA512-256';
let PBKDF2SIZE = 32;



async function InsertNewUserToDB(db: PipelineShaderObjectDB, request, res)
{
    var salt = crypto.randomBytes(32);
    crypto.pbkdf2(request.body.password, salt, PBKDF2ROUNDS, PBKDF2SIZE, PBKDF2ALGO, (err, key) => 
    {
        if (err) { return err;}

        let success = db.AddUser(request.body.username, salt, key, request.body.displayname);    

        success.then(
            (val) => {   
                if (val)
                {
                    console.log(`Added User ${request.body.username} (${request.body.displayname})`);
                    res.redirect("/");   
                }
                else
                {
                    console.log("F");
                }
            }
        )
        .catch(
            (err) => {
                console.log("KILL");
                console.log(err)
            }
        )
    });
}

export {PBKDF2ALGO, PBKDF2ROUNDS, PBKDF2SIZE, InsertNewUserToDB};