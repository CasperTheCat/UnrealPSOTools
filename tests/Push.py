import requests
import os
import random
import secrets
import base64
import json

# uploadURL = "/api/pco/new/rec/p/{}/m/{}/v/{}"
uploadURL = "/api/pco/new/"

machineID = secrets.token_hex(16)
version = "0.0.1.1"

with open("keystore", "r") as f:
    machineID = f.readline()
    projid = f.readline()

uploadRun = uploadURL.format(projid, machineID, version)

header = {"Content-type": "application/json"} 

data = []
with open("test.upipelinecache", "rb") as f:
    data = f.read()

jsonBody = {
    "machine": machineID,
    "project": projid,
    "version": version,
    "shadertype": "recorded",
    "platform": "DirectX 12",
    "shadermodel": "SF_VULKAN_SM5",
    "data": base64.b64encode(data).decode('utf-8')
}

#print(base64.b64encode(data).decode('utf-8'))
ps = []

for i in range(0, 100):
    p = requests.post("https://<testappurl>.com" + uploadURL, data=json.dumps(jsonBody), headers=header)
    ps.append(p)

for i, p in enumerate(ps):
    print("Request {} returned {}".format(i, p.status_code))
    #print(p.json())
