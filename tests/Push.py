import requests
import os
import random
import secrets

uploadURL = "/api/pco/new/rec/p/{}/m/{}/v/{}"

machineID = secrets.token_hex(16)
version = "0.0.1.1"

machineID = "9A256B71184901D3E60361F4EC160303A09D1AF0BF3E3B4758D0CE5563AC0E22"
projid = "8ADEA8076EB5428A7CF34BFBCFFB656F53DC8C1872BF6D2558D57202D62B787E"

uploadRun = uploadURL.format(projid, machineID, version)

header = {"Content-type": "application/octet-stream"} 

with open("test.upipelinecache", "rb") as f:
    p = requests.post("http://127.0.0.1:3000" + uploadRun, data=f.read(), headers=header)

