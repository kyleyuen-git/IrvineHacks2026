import requests
import json

url = "https://api.rentcast.io/v1/listings/sale?city=Irvine&state=CA&status=Active&limit=5&includeTotalCount=true"

headers = {
    "accept": "application/json",
    "X-Api-Key": api-key
}

response = requests.get(url, headers=headers)
print(response.text)
#data = json.loads(response.text)
#with open('listings.json', 'w') as file:
#    json.dump(data, file)

