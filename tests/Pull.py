import requests
import os
import random
import secrets
import base64

uploadURL = "/api/pco/all/token/{}"

machineID = secrets.token_hex(16)
version = "0.0.1.1"

machineID = "9a82bafe6e5f08e0844cdbdf0f9ac6ff"

uploadRun = uploadURL.format(machineID)

header = {"Content-type": "application/octet-stream"} 

p = requests.get("http://127.0.0.1:3000" + uploadRun)#, headers=header)

if p.status_code == 200:
    jsonblob = p.json()
    for shader in jsonblob:
        name = "{}_V{}.{}.{}.{}.upipelinecache".format(shader["datetime"], shader["versionmajor"], shader["versionminor"], shader["versionrevision"], shader["versionbuild"])
        data = base64.b64decode(shader["pipelinecachedata"])

        with open(name, "wb") as f:
            f.write(data)

