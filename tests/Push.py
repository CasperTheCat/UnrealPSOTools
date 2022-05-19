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

machineID = "9A256B71184901D3E60361F4EC160303A09D1AF0BF3E3B4758D0CE5563AC0E22"
projid = "8ADEA8076EB5428A7CF34BFBCFFB656F53DC8C1872BF6D2558D57202D62B787E"

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
    "platform": "Direct",
    "shadermodel": "SM5",
    "data": base64.b64encode(data).decode('utf-8')
}

#print(base64.b64encode(data).decode('utf-8'))

p = requests.post("http://127.0.0.1:3000" + uploadURL, data=json.dumps(jsonBody), headers=header)

print(p.status_code)
print(p.json())
