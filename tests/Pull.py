import requests
import os
import random
import secrets
import base64
import json

uploadURL = "/api/pco/date/after/"
uploadURL = "/api/pco/version/after"

machineID = secrets.token_hex(16)
version = "0.0.1.1"

machineID = "9A256B71184901D3E60361F4EC160303A09D1AF0BF3E3B4758D0CE5563AC0E22"
projid = "8ADEA8076EB5428A7CF34BFBCFFB656F53DC8C1872BF6D2558D57202D62B787E"

uploadRun = uploadURL.format(projid, machineID)

header = {"Content-type": "application/json"} 

requestData = {
    "date": "2000-01-01",
    "machine": machineID,
    "project": projid,
    "version": version,
    "platform": "DirectX",
    "shadermodel": "SM5"
}

p = requests.post("http://127.0.0.1:3000" + uploadURL, data=json.dumps(requestData), headers=header)

print(p.status_code)

if p.status_code == 200:
    jsonblob = p.json()
    print(len(jsonblob))
    index = 0
    for shader in jsonblob:
        print("{} -> V{}.{}.{}.{}".format(index, shader["versionmajor"], shader["versionminor"], shader["versionrevision"], shader["versionbuild"]))
        name = "V{}.{}.{}.{}_{}.upipelinecache".format(shader["versionmajor"], shader["versionminor"], shader["versionrevision"], shader["versionbuild"], index)
        index += 1
        data = base64.b64decode(shader["pipelinecachedata"])

        with open(name, "wb") as f:
            f.write(data)

