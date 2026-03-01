import requests
import json
import secret_key
import urllib
import time

base_url = "https://api.rentcast.io/v1/listings/sale"
query_params = {
    "city" : "Irvine",
    "state": "CA",
    "status": "Active",
    "limit": 500,
    "offset" : 0,
}

headers = {
    "accept": "application/json",
    "X-Api-Key": secret_key.api_key
}
count = 0
while(count==0 or len(data) > 0):
    count += 1
    query_string = urllib.parse.urlencode(query_params)
    url = base_url + "?" + query_string
    response = requests.get(url, headers=headers)
    data = json.loads(response.text)
    print(len(data), count)
    query_params["offset"] += 500
    time.sleep(3)
    file_path = 'listings/part' + str(count) + '.json'
    with open(file_path, 'w') as file:
        json.dump(data, file)
print(count)

