
import crypto from "crypto";

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
            vInt.push(parseInt(vString[i]));
        }
        else
        {
            vInt.push(0);
        }
    }

    return vInt;
}

export {HashOfBuffer, StringToVersion}

