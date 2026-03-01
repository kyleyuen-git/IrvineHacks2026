import requests
import json
import secret_key
import urllib
import time


def fetch_sale_data():
    base_url = "https://api.rentcast.io/v1/listings/sale"
    query_params = {
        "city" : "Irvine",
        "state": "CA",
        "status": "Inactive",
        "limit": 500,
        "offset" : 0,
    }
    headers = {
        "accept": "application/json",
        "X-Api-Key": secret_key.api_key
    }   
    count = 0
    while(count==0 or len(data) > 0) and count < 5:
        count += 1
        query_string = urllib.parse.urlencode(query_params)
        url = base_url + "?" + query_string
        response = requests.get(url, headers=headers)
        data = json.loads(response.text)
        print(len(data), count)
        query_params["offset"] += 500
        file_path = 'listings/part' + str(count) + '.json'
        with open(file_path, 'w') as file:
            json.dump(data, file)

def fetch_rent_data():
    base_url = "https://api.rentcast.io/v1/listings/rental/long-term"
    query_params = {
        "city" : "Irvine",
        "state": "CA",
        "status": "Active",
        "limit": 500,
        "offset" : 0,
        "includeTotalCount":True
    }
    headers = {
        "accept": "application/json",
        "X-Api-Key": secret_key.api_key
    }   
    count = 0
    while(count==0 or len(data) == 500):
        count += 1
        query_string = urllib.parse.urlencode(query_params)
        url = base_url + "?" + query_string
        response = requests.get(url, headers=headers)
        data = json.loads(response.text)
        print(len(data), count)
        query_params["offset"] += 500
        file_path = 'rent_listings/part' + str(count) + '.json'
        with open(file_path, 'w') as file:
            json.dump(data, file)
        if count >= 10:
            break
    print(response.headers)

fetch_sale_data()
