import requests
import json

url = "https://api.rentcast.io/v1/listings/sale?city=Irvine&state=CA&status=Active&limit=500"

headers = {
    "accept": "application/json",
    "X-Api-Key": "01f6bbb68949447991019be6b9436ae7"
}

response = requests.get(url, headers=headers)
print(response.text)
print(type(response))
data = json.loads(response.text)
with open('listings.json', 'w') as file:
    json.dump(data, file)

