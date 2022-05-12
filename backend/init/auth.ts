import passport from "passport";
import Strategy from "passport-local";
import crypto from "crypto";
import type {PipelineShaderObjectDB} from "../db.js";
import  {PBKDF2ALGO, PBKDF2ROUNDS, PBKDF2SIZE} from "../auth.js";

async function InitAuthStrat(dbinst: PipelineShaderObjectDB)
{
    passport.use(new Strategy(async function(username, password, cb)
    {
        try
        {
            let user = await dbinst.GetAuthByUsername(username);

            if(user)
            {
                let saltbuffer = user.salt;

                let pwinput = crypto.pbkdf2Sync(password, saltbuffer, PBKDF2ROUNDS, PBKDF2SIZE, PBKDF2ALGO);
                let pwreference = user.password;

                if(crypto.timingSafeEqual(pwinput, pwreference))
                {
                    let resUser = {
                        userid: user.userid
                    };

                    console.log(`[INFO] Login succeeded for ${username}`);

                    return cb(null, resUser);
                }
                else
                {
                    // Default fail
                    console.log(`[INFO] Login failed for ${username}`);
                    return cb(null, false, {messages: "Invalid Credentials"});
                }
            }
        }
        catch (Except)
        {
            console.log(Except);
            return cb(Except);
        }
        

        // let userpromise = dbinst.GetUserByUsername(username);
        // userpromise.then(
        //     (user) =>
        //     {
        //         if(user)
        //         {
        //             console.log(user);
        //             let buffer1 = Buffer.from(user.salt.slice(2), 'hex');

        //             // Check PW
        //             crypto.pbkdf2(password, buffer1, PBKDF2ROUNDS, PBKDF2SIZE, PBKDF2ALGO, (err, key) =>
        //                 {
        //                     if(err) 
        //                     {
        //                         // Refactor this please
        //                         return cb(err);
        //                     }
        //                     let buffer2 = Buffer.from(user.password.slice(2), 'hex');

        //                     console.log(buffer2.length);
        //                     console.log(key.length);
                            
        //                     if(crypto.timingSafeEqual(buffer2, key))
        //                     {
        //                         let resUser = {
        //                             userid: user.userid.toString(),
        //                             username: user.username
        //                         };

        //                         console.log("Logged");
        
        //                         return cb(null, resUser);
        //                     }
        //                 }
        //             );
        
        //         }
        //     }
        // ).catch(
        //     (err) => 
        //     {
        //         console.log(`[INFO] Login failed for ${username}`);
        //         return cb(err);
        //     }
        // )
        




        // promise.then
        // (() => 
        // {
            
        // }
        // ).catch
        // (() =>
        // {
        //     console.log(`[INFO] Login failed for ${username}`);
        // }
        // );
        
    }));


    // Directly from https://github.com/passport/express-4.x-local-example/blob/master/boot/auth.js
    passport.serializeUser(function(user: any, cb)
        {
            return cb(null, user.userid);
        // process.nextTick(function() {
        //   cb(null, { userid: user.userid, username: user.username });
        // });
        }
    );
    
      passport.deserializeUser(function(user, cb) 
        {
            // User.findById(user.userid, function(err, ru)
            // {
            //     cb(err, ru);
            // });
        
            process.nextTick(function() {
                return cb(null, user);
            });
        }
      );
};

export {InitAuthStrat};