import requests
import os
import random
import secrets
import base64
import json

uploadURL = "/api/pco/date/after/"
#uploadURL = "/api/pco/version/after"

version = "0.0.1.1"

with open("keystore", "r") as f:
    machineID = f.readline()
    projid = f.readline()

uploadRun = uploadURL.format(projid, machineID)

header = {"Content-type": "application/json"} 

requestData = {
    "date": "2000-01-01",
    "machine": machineID,
    "project": projid,
    "version": version,
    "platform": "DirectX 12",
    "shadermodel": "PCD3D_SM5"
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

