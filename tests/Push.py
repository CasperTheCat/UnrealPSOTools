import requests
import os
import random
import secrets

uploadURL = "/api/pco/new/v/{}/m/{}"

machineID = secrets.token_hex(16)
version = "0.0.1.1"

machineID = "9a82bafe6e5f08e0844cdbdf0f9ac6ff"

uploadRun = uploadURL.format(version, machineID)

header = {"Content-type": "application/octet-stream"} 

with open("test.upipelinecache", "rb") as f:
    p = requests.post("http://127.0.0.1:3000" + uploadRun, data=f.read(), headers=header)

